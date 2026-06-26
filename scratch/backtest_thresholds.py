"""
BACKTEST SCRIPT: Option A, B, C Threshold Comparison
======================================================
Simuliert 3 Schwellenwert-Szenarien gegen alle historischen Matches
in der market_odds-Tabelle (wo actual_winner_name bekannt ist).

Aktuell (Baseline):
  - Haircut: 60% (actual = raw * 0.40)
  - Underdog min_edge: 4.0% (odds >= 1.80)
  - Favorite min_edge:  1.5% (odds < 1.80)

Option A: Haircut 50% (actual = raw * 0.50)
Option B: Niedrigere Cutoffs (Underdog 2.5%, Favorite 1.0%)
Option C: Kombination beider Änderungen
"""

import os, sys, json, math
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
# Szenarien Konfiguration
# ─────────────────────────────────────────────────────────────────────────────
SCENARIOS = {
    "BASELINE (Aktuell)": {
        "haircut":          0.40,   # Raw Edge × 0.40
        "min_edge_fav":     0.015,  # Favorit  (odds < 1.80)
        "min_edge_under":   0.040,  # Underdog (odds >= 1.80)
        "fake_edge_cap":    0.120,  # Fake Edge Veto
    },
    "Option A: Haircut 50%": {
        "haircut":          0.50,
        "min_edge_fav":     0.015,
        "min_edge_under":   0.040,
        "fake_edge_cap":    0.120,
    },
    "Option B: Niedrigere Cutoffs": {
        "haircut":          0.40,
        "min_edge_fav":     0.010,  # 1.0% statt 1.5%
        "min_edge_under":   0.025,  # 2.5% statt 4.0%
        "fake_edge_cap":    0.120,
    },
    "Option C: Hybrid (A+B)": {
        "haircut":          0.50,
        "min_edge_fav":     0.010,
        "min_edge_under":   0.025,
        "fake_edge_cap":    0.120,
    },
}

# Kelly stake sizing (identisch mit scraper.py)
def calc_kelly_stake(edge_decimal, market_odds):
    b = market_odds - 1.0
    full_kelly = edge_decimal / b if b > 0 else 0
    if market_odds < 2.00:
        fraction, cap = 0.15, 3.0
    elif market_odds < 3.00:
        fraction, cap = 0.10, 2.0
    elif market_odds < 5.00:
        fraction, cap = 0.05, 1.0
    else:
        fraction, cap = 0.02, 0.5
    return min(round(full_kelly * fraction, 2), cap)

def simulate_scenario(rows, cfg):
    haircut        = cfg["haircut"]
    min_edge_fav   = cfg["min_edge_fav"]
    min_edge_under = cfg["min_edge_under"]
    cap            = cfg["fake_edge_cap"]

    picks = []
    total_staked  = 0.0
    total_pnl     = 0.0
    wins = losses = 0

    for row in rows:
        # Wir brauchen: market_odds (odds1 oder odds2), fair_odds, actual_winner, pick_name
        # Wir simulieren beide Seiten des Matches als potenzielle Picks
        for side in [1, 2]:
            odds_key   = f"odds{side}"
            fair_key   = f"ai_fair_odds{side}"
            player_key = f"player{side}_name"

            odds     = row.get(odds_key)
            fair     = row.get(fair_key)
            player   = row.get(player_key, "")
            winner   = (row.get("actual_winner_name") or "").lower().strip()

            if not odds or not fair or odds <= 1.01 or fair <= 1.01:
                continue

            fair_prob = 1.0 / fair
            if fair_prob <= 0 or fair_prob >= 1:
                continue

            raw_edge    = (fair_prob * odds) - 1.0
            actual_edge = raw_edge * haircut
            edge_pct    = round(actual_edge * 100, 1)

            # Fake Edge Veto
            if edge_pct > cap * 100:
                continue

            # Edge-Minimum
            min_edge = min_edge_fav if odds < 1.80 else min_edge_under
            if actual_edge < min_edge:
                continue

            # Pick ist valid — berechne Stake
            stake = calc_kelly_stake(actual_edge, odds)
            if stake <= 0:
                continue

            # War der Pick ein Gewinn?
            won = player.lower().strip() in winner or (winner and winner in player.lower().strip())
            pnl = stake * (odds - 1.0) if won else -stake

            total_staked += stake
            total_pnl    += pnl
            if won:  wins += 1
            else:    losses += 1

            picks.append({
                "player": player,
                "odds": odds,
                "edge_pct": edge_pct,
                "stake": stake,
                "won": won,
                "pnl": round(pnl, 2),
                "date": row.get("created_at", "")[:10],
            })

    n = wins + losses
    roi = (total_pnl / total_staked * 100) if total_staked > 0 else 0
    win_rate = (wins / n * 100) if n > 0 else 0

    return {
        "total_picks": n,
        "wins": wins,
        "losses": losses,
        "win_rate_pct": round(win_rate, 1),
        "total_staked": round(total_staked, 2),
        "total_pnl": round(total_pnl, 2),
        "roi_pct": round(roi, 2),
        "picks": picks,
    }

# ─────────────────────────────────────────────────────────────────────────────
# Daten laden: Matches mit bekanntem Gewinner + fair odds
# ─────────────────────────────────────────────────────────────────────────────
print("📡 Lade historische Matches aus Supabase...")

all_rows = []
page_size = 1000
offset = 0
while True:
    res = (
        supabase.table("market_odds")
        .select("player1_name,player2_name,odds1,odds2,ai_fair_odds1,ai_fair_odds2,actual_winner_name,created_at")
        .not_.is_("actual_winner_name", "null")
        .not_.is_("ai_fair_odds1", "null")
        .not_.is_("ai_fair_odds2", "null")
        .order("created_at", desc=False)
        .range(offset, offset + page_size - 1)
        .execute()
    )
    batch = res.data or []
    all_rows.extend(batch)
    if len(batch) < page_size:
        break
    offset += page_size

print(f"✅ {len(all_rows)} Matches mit Ergebnis + Fair-Odds gefunden.\n")

if not all_rows:
    print("❌ Keine historischen Daten gefunden. Abbruch.")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# Simulation für jedes Szenario
# ─────────────────────────────────────────────────────────────────────────────
results = {}
for name, cfg in SCENARIOS.items():
    results[name] = simulate_scenario(all_rows, cfg)

# ─────────────────────────────────────────────────────────────────────────────
# Report ausgeben
# ─────────────────────────────────────────────────────────────────────────────
sep = "═" * 65
print(sep)
print("  BACKTEST ERGEBNIS — THRESHOLD SZENARIEN")
print(sep)
print(f"{'Szenario':<35} {'Picks':>6} {'Win%':>6} {'Gesetzt':>9} {'P&L':>9} {'ROI%':>7}")
print("─" * 65)

for name, r in results.items():
    pnl_str = f"+{r['total_pnl']:.1f}u" if r['total_pnl'] >= 0 else f"{r['total_pnl']:.1f}u"
    print(f"{name:<35} {r['total_picks']:>6} {r['win_rate_pct']:>5.1f}% {r['total_staked']:>8.1f}u {pnl_str:>9} {r['roi_pct']:>6.1f}%")

print(sep)

# Detail-Breakdown pro Szenario
for name, r in results.items():
    print(f"\n{'─'*45}")
    print(f"  {name}")
    print(f"{'─'*45}")
    print(f"  Picks:         {r['total_picks']}")
    print(f"  Siege:         {r['wins']}  |  Niederlagen: {r['losses']}")
    print(f"  Win Rate:      {r['win_rate_pct']}%")
    print(f"  Total gesetzt: {r['total_staked']}u")
    print(f"  Gesamt P&L:    {r['total_pnl']:+.2f}u")
    print(f"  ROI:           {r['roi_pct']:+.2f}%")
    # Zeige die 5 besten Picks
    if r['picks']:
        by_pnl = sorted(r['picks'], key=lambda x: x['pnl'], reverse=True)
        print(f"\n  Top 5 Picks:")
        for p in by_pnl[:5]:
            icon = "✅" if p['won'] else "❌"
            print(f"    {icon} {p['player'][:25]:<25} @{p['odds']} | {p['edge_pct']}% edge | {p['stake']}u | {p['pnl']:+.2f}u")

# JSON speichern
out_path = os.path.join(os.path.dirname(__file__), "backtest_results.json")
with open(out_path, "w", encoding="utf-8") as f:
    # Schreibe ohne picks-detail (zu groß)
    summary = {k: {kk: vv for kk, vv in v.items() if kk != "picks"} for k, v in results.items()}
    json.dump(summary, f, ensure_ascii=False, indent=2)
print(f"\n💾 Ergebnisse gespeichert: {out_path}")
