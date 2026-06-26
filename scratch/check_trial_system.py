"""
Prüft alle Aspekte des Trial-Systems:
1. Gibt es die used_trials Tabelle?
2. Welche Variant-IDs sind in der DB gespeichert?
3. Was sind die aktuellen Checkout-Variant-IDs im Frontend?
4. Welche Edge Functions sind deployed?
"""
import os, sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../scraper")))
from env_loader import load_env
load_env()
from supabase import create_client

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

# 1. used_trials Tabelle
print("=" * 65)
print("1. USED_TRIALS TABELLE")
print("=" * 65)
for table in ["used_trials", "partners", "referrals"]:
    try:
        r = supabase.table(table).select("*").limit(5).execute()
        print(f"  {table}: EXISTIERT — {len(r.data or [])} Einträge")
        if r.data:
            print(f"    Spalten: {list(r.data[0].keys())}")
            for row in r.data[:3]:
                print(f"    {row}")
    except Exception as e:
        msg = str(e)
        if "does not exist" in msg or "PGRST205" in msg:
            print(f"  {table}: ❌ NICHT GEFUNDEN")
        else:
            print(f"  {table}: Fehler — {msg[:100]}")

# 2. Variant IDs die bisher in profiles gespeichert wurden
print("\n" + "=" * 65)
print("2. VARIANTEN-IDs IN PROFILES")
print("=" * 65)
res = supabase.table("profiles").select("ls_variant_id,tier,ls_subscription_status,has_used_trial").execute()
from collections import Counter
variant_counts = Counter()
for p in (res.data or []):
    vid = p.get("ls_variant_id") or "NULL"
    variant_counts[vid] += 1

print(f"  {'Variant ID':<15} {'Anzahl':>8}  Bedeutung")
print("  " + "-"*50)

# Bekannte IDs aus BEIDEN Webhook-Versionen
known = {
    "632313":  "MIT TRIAL → WEEKEND (neu)",
    "632314":  "MIT TRIAL → ELITE (neu)",
    "632315":  "MIT TRIAL → PREMIUM (neu)",
    "1341574": "MIT TRIAL → WEEKEND (alt)",
    "1341599": "MIT TRIAL → ELITE (alt)",
    "1341601": "MIT TRIAL → PREMIUM (alt)",
    "1485891": "OHNE TRIAL → WEEKEND",
    "1485892": "OHNE TRIAL → ELITE",
    "1485893": "OHNE TRIAL → PREMIUM",
}
for vid, cnt in variant_counts.most_common():
    bedeutung = known.get(str(vid), "❓ UNBEKANNTE ID")
    mapped = "✅" if str(vid) in known else "❌"
    print(f"  {mapped} {str(vid):<15} {cnt:>8}  {bedeutung}")

# 3. User mit trial-Varianten die NICHT in used_trials stehen (wenn Tabelle existiert)
print("\n" + "=" * 65)
print("3. TRIAL-ABGLEICH: profiles vs used_trials")
print("=" * 65)
trial_variants = {"632313", "632314", "632315", "1341574", "1341599", "1341601"}
trial_users = [p for p in (res.data or []) if str(p.get("ls_variant_id","")) in trial_variants]
print(f"  User die Trial-Variante gekauft haben: {len(trial_users)}")
print(f"  Davon has_used_trial=True: {sum(1 for p in trial_users if p.get('has_used_trial'))}")
print(f"  Davon has_used_trial=False (LÜCKE!): {sum(1 for p in trial_users if not p.get('has_used_trial'))}")

# 4. Alle ELITE/PREMIUM User ohne has_used_trial
print("\n" + "=" * 65)
print("4. USER MIT PAID TIER ABER OHNE TRIAL-FLAG (können Trial wiederholen)")
print("=" * 65)
at_risk = [p for p in (res.data or []) 
           if p.get("tier") in ("ELITE","PREMIUM","WEEKEND") 
           and not p.get("has_used_trial")]
print(f"  Gefährdet: {len(at_risk)} User")
for p in at_risk[:10]:
    print(f"  Tier:{p.get('tier'):<10} Variant:{str(p.get('ls_variant_id','?')):<12} Status:{p.get('ls_subscription_status','?')}")
