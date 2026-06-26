"""
Analyse der AI-Picks die im Frontend erscheinen (mit 1.0u Stakes).
Sucht nach den konkreten Picks vom 23. Juni.
"""
import os, sys, re
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../scraper")))
from env_loader import load_env
load_env()
from supabase import create_client

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

TARGET_PLAYERS = [
    "Benjamin Hassan", "Roman Andres Burruchaga", "Giles Hussey",
    "Xinyu Wang", "Panna Udvardy", "Jan-Lennard Struff", "Kimberly Birrell"
]

# 1. Suche in scout_reports
print("=" * 70)
print("SCOUT REPORTS (vollständig):")
print("=" * 70)
sr = supabase.table("scout_reports").select("*").gte("report_date", "2026-06-23").execute()
for row in sr.data or []:
    print(f"\nDatum: {row.get('report_date')}  |  ID: {row.get('id')}")
    metrics = row.get("metrics", "")
    summary = row.get("summary", "")
    print(f"Summary (erste 500 Zeichen):\n{str(summary)[:500]}")
    print(f"\nMetrics (erste 1000 Zeichen):\n{str(metrics)[:1000]}")

# 2. Direkt in market_odds nach den konkreten Matches suchen
print("\n\n" + "=" * 70)
print("MARKET_ODDS: Konkrete Matches vom 23. Juni")
print("=" * 70)
res = (
    supabase.table("market_odds")
    .select("player1_name,player2_name,odds1,odds2,ai_fair_odds1,ai_fair_odds2,actual_winner_name,ai_analysis_text,created_at")
    .gte("created_at", "2026-06-23T00:00:00")
    .lte("created_at", "2026-06-24T00:00:00")
    .execute()
)
rows = res.data or []

known_matches = [
    ("Miguel Damas", "Benjamin Hassan", 2.28, "Benjamin Hassan"),
    ("Roman Andres Burruchaga", "Arthur Fery", 4.20, "Roman Andres Burruchaga"),
    ("Matteo Arnaldi", "Giles Hussey", 3.65, "Giles Hussey"),
    ("Xinyu Wang", "Leylah Fernandez", 2.08, "Xinyu Wang"),
    ("Panna Udvardy", "Anna Bondar", 2.34, "Panna Udvardy"),
    ("Jan-Lennard Struff", "Nuno Borges", 2.38, "Jan-Lennard Struff"),
    ("Kimberly Birrell", "Barbora Krejcikova", 2.96, "Kimberly Birrell"),
]

results_summary = []
for (p1_target, p2_target, pick_odds, pick_player) in known_matches:
    found = None
    for r in rows:
        n1 = (r.get("player1_name") or "").lower()
        n2 = (r.get("player2_name") or "").lower()
        if (p1_target.split()[-1].lower() in n1 or p1_target.split()[-1].lower() in n2) and \
           (p2_target.split()[-1].lower() in n1 or p2_target.split()[-1].lower() in n2):
            found = r
            break
    if found:
        atext = found.get("ai_analysis_text") or ""
        edge_tags = re.findall(r'\[([^\]]+Edge:[^\]]+)\]', atext)
        winner = found.get("actual_winner_name") or "(offen)"
        o1 = found.get("odds1"); o2 = found.get("odds2")
        f1 = found.get("ai_fair_odds1"); f2 = found.get("ai_fair_odds2")

        # Berechne raw edge für Pick-Spieler
        is_p1 = pick_player.split()[-1].lower() in (found.get("player1_name") or "").lower()
        pick_fair = f1 if is_p1 else f2
        raw_edge = None
        if pick_fair and pick_odds:
            fp = 1.0 / pick_fair
            raw_edge = round((fp * pick_odds - 1.0) * 100, 1)
            act_edge = round(raw_edge * 0.40, 1)

        won = pick_player.split()[-1].lower() in winner.lower()
        result = f"+{pick_odds - 1:.2f}u" if won else "-1.00u"
        won_icon = "✅" if won else "❌"

        print(f"\n  {won_icon} {p1_target} vs {p2_target}")
        print(f"     Pick:      {pick_player} @ {pick_odds}")
        print(f"     Gewinner:  {winner}")
        print(f"     Ergebnis:  {result}")
        print(f"     DB-Odds:   P1={o1}  P2={o2}")
        print(f"     Fair:      F1={f1}  F2={f2}")
        if raw_edge is not None:
            print(f"     Raw Edge:  {raw_edge}%  → nach Haircut (×0.40): {act_edge}%")
        if edge_tags:
            for tag in edge_tags:
                print(f"     Pick-Tag:  [{tag[:80]}]")
        else:
            print(f"     Pick-Tag:  (kein Edge-Tag in ai_analysis_text)")

        results_summary.append({
            "match": f"{p1_target} vs {p2_target}",
            "pick": pick_player,
            "odds": pick_odds,
            "won": won,
            "result": result,
            "raw_edge": raw_edge,
        })
    else:
        print(f"\n  ⚠️  NICHT GEFUNDEN: {p1_target} vs {p2_target}")

# 3. Performance Summary
print("\n\n" + "=" * 70)
print("PERFORMANCE SUMMARY — 23. Juni Picks")
print("=" * 70)
wins   = [r for r in results_summary if r["won"]]
losses = [r for r in results_summary if not r["won"]]
total_pnl = sum((r["odds"] - 1) if r["won"] else -1.0 for r in results_summary)
roi = total_pnl / len(results_summary) * 100 if results_summary else 0

print(f"\n  Picks gesamt:  {len(results_summary)}")
print(f"  Siege:         {len(wins)}")
print(f"  Niederlagen:   {len(losses)}")
print(f"  Win Rate:      {100*len(wins)/len(results_summary):.0f}%")
print(f"  Einsatz:       {len(results_summary)}.0u (je 1.0u)")
print(f"  P&L:           {total_pnl:+.2f}u")
print(f"  ROI:           {roi:+.1f}%")
print()
print("  WARUM ALLES 1.0u?")
print("  → Diese Picks kommen NICHT aus dem Kelly-Scraper.")
print("  → Sie kommen aus agent_analysis.py / dem Score-basierten System,")
print("    das einen Flat-Stake von 1.0u verwendet.")
print("  → Das ist eine bewusste Entscheidung für Einfachheit & Vergleichbarkeit.")
print()
print("  EDGE-VERTEILUNG dieser Picks:")
for r in results_summary:
    icon = "✅" if r["won"] else "❌"
    raw  = f"{r['raw_edge']}% raw" if r["raw_edge"] else "?"
    print(f"  {icon}  {r['pick']:<30} @ {r['odds']}  Edge: {raw}")
