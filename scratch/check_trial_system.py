"""
Prüft die Supabase-Datenbank auf:
1. Existiert die Spalte 'has_used_trial' in der profiles-Tabelle?
2. Wie viele User haben has_used_trial = true?
3. Welche User haben mehrfach eine Subscription (Duplikate)?
4. Gibt es eine Tabelle für Subscriptions/Orders von Lemon Squeezy?
"""
import os, sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../scraper")))
from env_loader import load_env
load_env()
from supabase import create_client

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

# 1. Profile-Tabelle: hat sie has_used_trial?
print("=" * 60)
print("1. PROFILES TABELLE — Struktur prüfen")
print("=" * 60)
try:
    sample = supabase.table("profiles").select("*").limit(1).execute()
    if sample.data:
        cols = list(sample.data[0].keys())
        print(f"Spalten: {cols}")
        has_col = "has_used_trial" in cols
        print(f"\n  has_used_trial Spalte existiert: {has_col}")
        if not has_col:
            print("  !! PROBLEM: Die Spalte fehlt in der DB!!")
    else:
        print("  (keine Profile gefunden)")
except Exception as e:
    print(f"  Fehler: {e}")

# 2. User mit has_used_trial = true
print("\n" + "=" * 60)
print("2. USER MIT has_used_trial = true")
print("=" * 60)
try:
    res = supabase.table("profiles").select("id,tier,has_used_trial").eq("has_used_trial", True).execute()
    print(f"  Anzahl: {len(res.data or [])}")
    for r in (res.data or [])[:10]:
        print(f"  ID: {r.get('id','?')[:8]}...  Tier: {r.get('tier','?')}")
except Exception as e:
    print(f"  Fehler: {e}")

# 3. Alle Profile - Tier-Verteilung
print("\n" + "=" * 60)
print("3. TIER VERTEILUNG")
print("=" * 60)
try:
    all_p = supabase.table("profiles").select("tier").execute()
    from collections import Counter
    dist = Counter(r.get("tier","unknown") for r in (all_p.data or []))
    for tier, cnt in dist.most_common():
        print(f"  {tier:<20} {cnt}")
except Exception as e:
    print(f"  Fehler: {e}")

# 4. Suche nach Subscriptions/Orders Tabellen
print("\n" + "=" * 60)
print("4. SUBSCRIPTION / ORDERS TABELLEN")
print("=" * 60)
for table in ["subscriptions", "orders", "lemon_orders", "payments", "user_subscriptions", "webhook_events"]:
    try:
        r = supabase.table(table).select("*").limit(3).execute()
        print(f"  {table}: EXISTIERT — {len(r.data or [])} Einträge (Sample)")
        if r.data:
            print(f"    Spalten: {list(r.data[0].keys())}")
    except Exception as e:
        msg = str(e)
        if "does not exist" in msg or "PGRST205" in msg:
            print(f"  {table}: nicht gefunden")
        else:
            print(f"  {table}: Fehler — {msg[:80]}")
