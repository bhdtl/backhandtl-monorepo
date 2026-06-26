"""
Backfill: Setzt has_used_trial = true für alle User die bereits einen
bezahlten Tier hatten (ELITE, PREMIUM, WEEKEND).
Verhindert dass Bestandskunden erneut einen Trial starten können.
"""
import os, sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../scraper")))
from env_loader import load_env
load_env()
from supabase import create_client

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

print("Starte Backfill: has_used_trial für bezahlte User...")

# Alle User mit bezahltem Tier die noch kein Trial-Flag haben
res = supabase.table("profiles").select("id,tier,has_used_trial,ls_subscription_id").execute()
profiles = res.data or []

to_update = [p for p in profiles if p.get("tier") in ("ELITE","PREMIUM","WEEKEND") and not p.get("has_used_trial")]
already_set = [p for p in profiles if p.get("has_used_trial")]
free_users = [p for p in profiles if p.get("tier") == "FREE"]

print(f"  Total Profile:          {len(profiles)}")
print(f"  Bereits has_used_trial: {len(already_set)}")
print(f"  Brauchen Backfill:      {len(to_update)}")
print(f"  FREE User (kein Flag):  {len(free_users)}")

if to_update:
    ids = [p["id"] for p in to_update]
    for uid in ids:
        r = supabase.table("profiles").update({"has_used_trial": True}).eq("id", uid).execute()
        print(f"  ✅ Backfilled: {uid[:8]}...")
    print(f"\n  {len(ids)} User aktualisiert.")
else:
    print("\n  Kein Backfill nötig.")

# Finale Zahlen
res2 = supabase.table("profiles").select("tier,has_used_trial").execute()
from collections import Counter
tier_dist = Counter(p.get("tier","?") for p in (res2.data or []))
trial_dist = Counter(p.get("has_used_trial",False) for p in (res2.data or []))
print(f"\nAktueller Status:")
for tier, cnt in tier_dist.most_common():
    print(f"  {tier:<15} {cnt} User")
print(f"\n  has_used_trial=True:  {trial_dist[True]}")
print(f"  has_used_trial=False: {trial_dist[False]}")
