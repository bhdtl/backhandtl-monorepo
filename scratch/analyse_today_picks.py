"""
Vollanalyse der heutigen Picks + Scout Report + Stake-Erklärung
"""
import os, sys, re, json
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../scraper")))
from env_loader import load_env
load_env()
from supabase import create_client

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

# ── Alle heutigen Picks aus market_odds
res = (
    supabase.table("market_odds")
    .select("*")
    .gte("created_at", "2026-06-23T00:00:00")
    .execute()
)
rows = res.data or []

# Extrahiere alle Picks mit Edge-Tag
picks = []
for r in rows:
    atext = r.get("ai_analysis_text") or ""
    for match in re.finditer(r'\[([^\]]+Edge:[^\]]+)\]', atext):
        tag = match.group(1)
        stake_m = re.search(r'Stake:\s*([\d.]+)u', tag)
        edge_m  = re.search(r'Edge:\s*([\d.]+)%', tag)
        type_m  = re.search(r'^(.*?):', tag)
        pick_m  = re.search(r':\s*(.*?)\s*@', tag)
        odds_m  = re.search(r'@\s*([\d.]+)', tag)
        fair_m  = re.search(r'Fair:\s*([\d.]+)', tag)

        if stake_m and edge_m:
            picks.append({
                "time":    (r.get("created_at") or "")[:16],
                "match":   f"{r.get('player1_name','')} vs {r.get('player2_name','')}",
                "tourn":   r.get("tournament",""),
                "pick":    pick_m.group(1).strip() if pick_m else "?",
                "type":    type_m.group(1).strip() if type_m else "?",
                "odds":    float(odds_m.group(1)) if odds_m else 0,
                "fair":    float(fair_m.group(1)) if fair_m else 0,
                "edge":    float(edge_m.group(1)),
                "stake":   float(stake_m.group(1)),
                "winner":  r.get("actual_winner_name") or "(offen)",
                "o1":      r.get("odds1"), "o2": r.get("odds2"),
                "f1":      r.get("ai_fair_odds1"), "f2": r.get("ai_fair_odds2"),
            })

# ── Scout Report
sr = supabase.table("scout_reports").select("*").eq("report_date","2026-06-23").execute()
scout = sr.data[0] if sr.data else None

print("=" * 80)
print("  ALLE HEUTIGEN PICKS (23. Juni 2026)")
print("=" * 80)
print(f"  Spiele heute in DB:   {len(rows)}")
print(f"  Picks gefunden:       {len(picks)}")
if scout:
    try:
        metrics = scout.get("metrics","")
        if isinstance(metrics, str):
            import ast
            m = ast.literal_eval(metrics)
        else:
            m = metrics
        print(f"  Scout ROI:            {m.get('roi','?')}%")
    except:
        print(f"  Scout Metrics: {str(scout.get('metrics',''))[:100]}")
print()

# Sortiere nach Zeit
picks.sort(key=lambda x: x["time"])

# Stake-Verteilung
stake_dist = {}
for p in picks:
    s = p["stake"]
    if   s < 0.5:  bucket = "<0.5u"
    elif s < 1.0:  bucket = "0.5-1u"
    elif s < 1.5:  bucket = "1.0-1.5u"
    elif s < 2.0:  bucket = "1.5-2u"
    elif s < 2.5:  bucket = "2.0-2.5u"
    else:          bucket = ">=2.5u"
    stake_dist[bucket] = stake_dist.get(bucket, 0) + 1

type_dist = {}
for p in picks:
    t = p["type"]
    type_dist[t] = type_dist.get(t, 0) + 1

print("-" * 80)
print(f"  {'Zeit':<17} {'Typ':<22} {'Pick':<28} {'@Odds':>6} {'Edge%':>6} {'Stake':>7}")
print("-" * 80)
total_staked = 0
for p in picks:
    typ = p["type"][:20]
    pick = p["pick"][:26]
    total_staked += p["stake"]
    won_icon = "✅" if p["winner"] != "(offen)" and p["pick"].lower() in p["winner"].lower() else \
               "❌" if p["winner"] != "(offen)" else "⏳"
    print(f"  {p['time']:<17} {typ:<22} {pick:<28} {p['odds']:>6.2f} {p['edge']:>5.1f}% {p['stake']:>6.1f}u {won_icon}")

print("-" * 80)
print(f"  {'GESAMT':>70} {total_staked:>6.1f}u")
print()

print("=" * 80)
print("  STAKE-VERTEILUNG")
print("=" * 80)
for bucket in ["<0.5u","0.5-1u","1.0-1.5u","1.5-2u","2.0-2.5u",">=2.5u"]:
    cnt = stake_dist.get(bucket, 0)
    bar = "█" * cnt
    print(f"  {bucket:<12} {cnt:>3}x  {bar}")
print()

print("=" * 80)
print("  PICK-TYP VERTEILUNG")
print("=" * 80)
for t, cnt in sorted(type_dist.items(), key=lambda x: -x[1]):
    print(f"  {t:<30} {cnt:>3}x")
print()

print("=" * 80)
print("  STAKE-LOGIK ERKLÄRUNG — Warum diese Stakes?")
print("=" * 80)
print("""
  Die Stakes werden berechnet via:
  
    full_kelly = edge_decimal / (odds - 1)
    
    Bei odds < 2.00:  stake = full_kelly × 0.15 × bankroll,  max 3u
    Bei odds < 3.00:  stake = full_kelly × 0.10 × bankroll,  max 2u
    Bei odds < 5.00:  stake = full_kelly × 0.05 × bankroll,  max 1u
    Bei odds >= 5.00: stake = full_kelly × 0.02 × bankroll,  max 0.5u

  BANKROLL im System = 1.0 (nicht 100!)
  Das heisst: max stake = 3u × (1/100) = 0.03u → viel zu klein!

  ECHTE Bankroll sollte z.B. 1000 Euro sein,
  dann wäre 1u = 10 Euro → max stake = 30 Euro (3u bei Favoriten)
""")

# Zeige konkrete Rechnung für jeden Pick
print("=" * 80)
print("  KONKRETE STAKE-BERECHNUNG PRO PICK")
print("=" * 80)
for p in picks:
    edge_dec = p["edge"] / 100
    o = p["odds"]
    b = o - 1
    full_kelly = edge_dec / b if b > 0 else 0
    if   o < 2.00: frac, cap = 0.15, 3.0
    elif o < 3.00: frac, cap = 0.10, 2.0
    elif o < 5.00: frac, cap = 0.05, 1.0
    else:          frac, cap = 0.02, 0.5
    raw = full_kelly * frac * 1.0  # bankroll=1
    capped = min(raw, cap * (1/100))
    raw100 = full_kelly * frac * 100  # bankroll=100
    capped100 = min(raw100, cap)
    print(f"  {p['pick'][:30]:<30} @{o} | Edge:{p['edge']}% | Kelly:{full_kelly*100:.1f}% | "
          f"Stake(BK=1):{capped:.3f}u | Stake(BK=100):{capped100:.2f}u")
