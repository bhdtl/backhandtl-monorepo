"""
DEEP BACKTEST: Bereinigt mit korrekten Daten
==============================================
Kernprobleme aus Diagnose:
1. Nur 20% (4674/23147) der Matches haben fair_odds gesetzt -> sehr kleiner Datensatz
2. Die Stakes sind winzig (0.01u) weil die raw edges extrem hoch sind (>12%)
   und dann den Fake-Edge-Cap triggern -> Kelly wird auf Reste reduziert
3. Manche "edges" sind Modell-Artefakte (38% edge für Kimberly Birrell ist unrealistisch)

Diese Version:
- Analysiert die Odds-Verteilung detaillierter
- Berechnet Stakes korrekt auf Basis einer 100u-Bankroll (nicht fractional)
- Zeigt was passiert wenn wir den Fake-Edge-Cap adjustieren
- Vergleicht Szenarien auf normierter Basis (Picks/Monat, P&L/100u Bankroll)
"""
import os, sys, json, math, collections
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../scraper")))
from env_loader import load_env
load_env()
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ─────────────────────────────────────────────────────────────────────────────
# Szenarien — jetzt auch mit adjustiertem Fake-Edge-Cap (D)
# ─────────────────────────────────────────────────────────────────────────────
SCENARIOS = {
    "BASELINE (Aktuell)":           {"haircut": 0.40, "min_fav": 0.015, "min_under": 0.040, "cap": 12.0},
    "Option A: Haircut 50%":        {"haircut": 0.50, "min_fav": 0.015, "min_under": 0.040, "cap": 12.0},
    "Option B: Cutoffs niedriger":  {"haircut": 0.40, "min_fav": 0.010, "min_under": 0.025, "cap": 12.0},
    "Option C: Hybrid (A+B)":       {"haircut": 0.50, "min_fav": 0.010, "min_under": 0.025, "cap": 12.0},
    "Option D: Cap auf 20%":        {"haircut": 0.40, "min_fav": 0.015, "min_under": 0.040, "cap": 20.0},
    "Option E: Alles relaxed":      {"haircut": 0.50, "min_fav": 0.010, "min_under": 0.020, "cap": 20.0},
}

# Kelly mit 100u Bankroll-Basis (reale Units)
BANKROLL = 100.0

def calc_stake(edge_decimal, market_odds, bankroll=BANKROLL):
    b = market_odds - 1.0
    if b <= 0: return 0
    full_kelly = edge_decimal / b
    if market_odds < 2.00:
        fraction, cap_u = 0.15, 3.0
    elif market_odds < 3.00:
        fraction, cap_u = 0.10, 2.0
    elif market_odds < 5.00:
        fraction, cap_u = 0.05, 1.0
    else:
        fraction, cap_u = 0.02, 0.5
    raw_stake = full_kelly * fraction * bankroll
    return min(round(raw_stake, 2), cap_u * (bankroll / 100))

def simulate(rows, cfg):
    haircut    = cfg["haircut"]
    min_fav    = cfg["min_fav"]
    min_under  = cfg["min_under"]
    cap        = cfg["cap"]

    picks, monthly = [], collections.defaultdict(lambda: {"n":0,"pnl":0.0})
    staked = pnl = wins = losses = 0

    for row in rows:
        for side in [1, 2]:
            odds   = row.get(f"odds{side}") or 0
            fair   = row.get(f"ai_fair_odds{side}") or 0
            player = row.get(f"player{side}_name", "")
            winner = (row.get("actual_winner_name") or "").lower().strip()
            date   = (row.get("created_at") or "")[:7]  # YYYY-MM

            if odds <= 1.01 or fair <= 1.01: continue
            fp = 1.0 / fair
            if fp <= 0 or fp >= 1: continue

            raw_edge    = (fp * odds) - 1.0
            actual_edge = raw_edge * haircut
            edge_pct    = actual_edge * 100

            if edge_pct > cap: continue
            min_e = min_fav if odds < 1.80 else min_under
            if actual_edge < min_e: continue

            stake = calc_stake(actual_edge, odds)
            if stake <= 0: continue

            p_lower = player.lower().strip()
            won = (p_lower in winner) or (winner and winner in p_lower)
            p = stake * (odds - 1.0) if won else -stake

            staked += stake; pnl += p
            if won: wins += 1
            else:   losses += 1
            monthly[date]["n"]   += 1
            monthly[date]["pnl"] += p
            picks.append({"player": player, "odds": odds,
                           "edge_pct": round(edge_pct,1), "stake": stake,
                           "won": won, "pnl": round(p,2), "date": date})

    n   = wins + losses
    roi = (pnl / staked * 100) if staked > 0 else 0
    wr  = (wins / n * 100) if n > 0 else 0
    avg_picks_pm = n / max(len(monthly), 1)

    return {
        "total_picks": n, "wins": wins, "losses": losses,
        "win_rate": round(wr, 1), "staked": round(staked, 1),
        "pnl": round(pnl, 2), "roi": round(roi, 2),
        "avg_picks_per_month": round(avg_picks_pm, 1),
        "monthly": dict(monthly), "picks": picks,
    }

# ─────────────────────────────────────────────────────────────────────────────
print("Lade historische Matches...")
all_rows = []
offset = 0
while True:
    res = (
        supabase.table("market_odds")
        .select("player1_name,player2_name,odds1,odds2,ai_fair_odds1,ai_fair_odds2,actual_winner_name,created_at")
        .not_.is_("actual_winner_name", "null")
        .not_.is_("ai_fair_odds1", "null")
        .not_.is_("ai_fair_odds2", "null")
        .order("created_at", desc=False)
        .range(offset, offset + 999)
        .execute()
    )
    batch = res.data or []
    all_rows.extend(batch)
    if len(batch) < 1000: break
    offset += 1000

print(f"  {len(all_rows)} Matches geladen.\n")

results = {name: simulate(all_rows, cfg) for name, cfg in SCENARIOS.items()}

# ─────────────────────────────────────────────────────────────────────────────
# HAUPT-TABELLE
# ─────────────────────────────────────────────────────────────────────────────
sep = "=" * 80
print(sep)
print("  BACKTEST VERGLEICH — alle Szenarien (Bankroll: 100u)")
print(sep)
print(f"{'Szenario':<38} {'Picks':>6} {'Win%':>6} {'Picks/Mo':>9} {'Staked':>8} {'P&L':>9} {'ROI%':>7}")
print("-" * 80)
for name, r in results.items():
    pnl_str = f"{r['pnl']:+.1f}u"
    print(f"{name:<38} {r['total_picks']:>6} {r['win_rate']:>5.1f}% {r['avg_picks_per_month']:>9.1f} {r['staked']:>7.1f}u {pnl_str:>9} {r['roi']:>6.1f}%")
print(sep)

# ─────────────────────────────────────────────────────────────────────────────
# MONATLICHE P&L — nur für Baseline und bestes Szenario
# ─────────────────────────────────────────────────────────────────────────────
def best_scenario(results):
    return max(results.items(), key=lambda x: x[1]["roi"])[0]

best_name = best_scenario(results)
print(f"\n  Bestes Szenario: {best_name}")

for name in ["BASELINE (Aktuell)", best_name]:
    if name not in results: continue
    r = results[name]
    print(f"\n{'─'*55}")
    print(f"  MONATLICHE PERFORMANCE: {name}")
    print(f"{'─'*55}")
    print(f"  {'Monat':<10} {'Picks':>6} {'P&L':>10} {'Kumulativ':>12}")
    kum = 0
    for month in sorted(r["monthly"].keys()):
        md = r["monthly"][month]
        kum += md["pnl"]
        bar_len = int(md["pnl"] / max(abs(md["pnl"]), 0.01) * min(abs(md["pnl"]) * 2, 15))
        bar = ('+' * max(bar_len, 0)) if md["pnl"] >= 0 else ('-' * max(-bar_len, 0))
        print(f"  {month:<10} {md['n']:>6} {md['pnl']:>+9.2f}u {kum:>+11.2f}u  {bar}")

# ─────────────────────────────────────────────────────────────────────────────
# EDGE-VERTEILUNG — Was sind typische edge-Werte in den Daten?
# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{'─'*55}")
print("  EDGE-VERTEILUNG (Baseline, alle positiven Edges)")
print(f"{'─'*55}")
baseline_picks = results["BASELINE (Aktuell)"]["picks"]
if baseline_picks:
    buckets = collections.Counter()
    for p in baseline_picks:
        e = p["edge_pct"]
        if   e < 2:   buckets["<2%"] += 1
        elif e < 4:   buckets["2-4%"] += 1
        elif e < 6:   buckets["4-6%"] += 1
        elif e < 8:   buckets["6-8%"] += 1
        elif e < 10:  buckets["8-10%"] += 1
        elif e < 12:  buckets["10-12%"] += 1
        else:         buckets[">=12%"] += 1
    for bucket, cnt in sorted(buckets.items()):
        bar = "#" * (cnt // 2)
        print(f"  {bucket:<10} {cnt:>4} picks  {bar}")

# ─────────────────────────────────────────────────────────────────────────────
# SCHLUSSFOLGERUNG
# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{'=' * 55}")
print("  FAZIT")
print(f"{'=' * 55}")
base = results["BASELINE (Aktuell)"]
print(f"  Datenbasis: {len(all_rows)} Matches mit Fair Odds")
print(f"  Davon picks generiert (Baseline): {base['total_picks']} ({100*base['total_picks']/len(all_rows)/2:.1f}% aller Seiten)")
print(f"")
for name, r in results.items():
    flag = " <-- BEST ROI" if name == best_name else ""
    flag2 = " <-- AKTUELL" if name == "BASELINE (Aktuell)" else ""
    print(f"  {name:<38}: ROI {r['roi']:>+6.1f}% | {r['avg_picks_per_month']:.1f} Picks/Mo{flag}{flag2}")
