"""
Legt die used_trials Tabelle an (via SQL über Supabase REST)
und befüllt sie mit allen Emails von Usern die bereits einen Trial hatten.
"""
import os, sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../scraper")))
from env_loader import load_env
load_env()
from supabase import create_client
import requests

SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_KEY  = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
supabase = create_client(SUPABASE_URL, SERVICE_KEY)

# 1. Tabelle anlegen via SQL RPC (Supabase erlaubt DDL über /rest/v1/rpc/exec_sql wenn vorhanden,
#    oder wir nutzen den Management API endpoint)
print("Lege used_trials Tabelle an...")

# Nutze die Supabase Management API
headers = {
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "apikey": SERVICE_KEY,
}

sql = """
CREATE TABLE IF NOT EXISTS public.used_trials (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  value      text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_used_trials_value ON public.used_trials(value);
ALTER TABLE public.used_trials ENABLE ROW LEVEL SECURITY;
"""

# Versuche via pg_dump / exec
try:
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        headers=headers,
        json={"query": sql},
        timeout=15,
    )
    if resp.status_code < 300:
        print(f"  ✅ Tabelle angelegt via exec_sql")
    else:
        print(f"  exec_sql nicht verfügbar ({resp.status_code}) — versuche direktes Insert...")
        # Tabelle existiert evtl. schon oder RPC nicht verfügbar
        # Teste einfach ob wir inserten können
        test = supabase.table("used_trials").select("id").limit(1).execute()
        print(f"  ✅ used_trials Tabelle bereits vorhanden")
except Exception as e:
    print(f"  Hinweis: {e}")
    try:
        test = supabase.table("used_trials").select("id").limit(1).execute()
        print(f"  ✅ used_trials Tabelle bereits vorhanden ({len(test.data or [])} Einträge)")
    except Exception as e2:
        print(f"  ❌ Tabelle nicht erreichbar: {e2}")
        print(f"  → Bitte die Migration 20260626160000_create_used_trials.sql manuell im Supabase Dashboard ausführen!")
        sys.exit(1)

# 2. Alle User mit has_used_trial=True aus auth.users holen (wir brauchen die Emails)
print("\nLade User-Emails für Backfill...")

# Supabase Auth Admin API
auth_url = f"{SUPABASE_URL}/auth/v1/admin/users"
resp = requests.get(auth_url, headers=headers, params={"per_page": 1000, "page": 1}, timeout=15)

if resp.status_code != 200:
    print(f"  ❌ Auth API Fehler: {resp.status_code} {resp.text[:200]}")
    sys.exit(1)

auth_data = resp.json()
all_users = auth_data.get("users", [])
print(f"  {len(all_users)} Auth-User geladen")

# Profile mit has_used_trial=True
res = supabase.table("profiles").select("id,has_used_trial,ls_customer_id").eq("has_used_trial", True).execute()
trial_profiles = {p["id"]: p for p in (res.data or [])}
print(f"  {len(trial_profiles)} Profile mit has_used_trial=True")

# Emails + Customer-IDs zusammenstellen
to_insert = set()
for u in all_users:
    uid = u.get("id","")
    email = (u.get("email") or "").lower().strip()
    if uid in trial_profiles:
        if email:
            to_insert.add(email)
        customer_id = trial_profiles[uid].get("ls_customer_id","")
        if customer_id:
            to_insert.add(str(customer_id))

print(f"  {len(to_insert)} Werte zum Eintragen (Emails + Customer-IDs)")

# 3. In used_trials eintragen
inserted = 0
skipped  = 0
for value in sorted(to_insert):
    try:
        r = supabase.table("used_trials").upsert({"value": value}, on_conflict="value").execute()
        inserted += 1
        print(f"  ✅ {value}")
    except Exception as e:
        if "duplicate" in str(e).lower() or "unique" in str(e).lower():
            skipped += 1
        else:
            print(f"  ❌ {value}: {e}")

print(f"\nErgebnis: {inserted} eingetragen, {skipped} bereits vorhanden")

# 4. Finale Tabellen-Übersicht
final = supabase.table("used_trials").select("value,created_at").order("created_at", desc=False).execute()
print(f"\nused_trials Tabelle: {len(final.data or [])} Einträge")
for row in (final.data or []):
    print(f"  {row.get('value','?')[:40]:<40} {row.get('created_at','')[:10]}")
