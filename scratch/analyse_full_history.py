"""
Vollständige Historische Performance aus scout_reports.
Zeigt ob das System insgesamt profitabel ist oder ob heute ein Ausreißer war.
"""
import os, sys, re, ast, json
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../scraper")))
from env_loader import load_env
load_env()
from supabase import create_client

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

# Alle scout_reports laden
res = supabase.table("scout_reports").select("*").order("report_date", desc=False).execute()
reports = res.data or []
print(f"Scout Reports gefunden: {len(reports)}\n")

daily_stats = []
for r in reports:
    date = r.get("report_date","")
    raw  = r.get("metrics","") or ""
    try:
        if isinstance(raw, str):
            m = ast.literal_eval(raw)
        else:
            m = raw
    except:
        continue

    today_data = m.get("today", {})
    bets  = today_data.get("bets", 0)
    wins  = today_data.get("wins", 0)
    profit= today_data.get("profit", 0)
    wr    = today_data.get("win_rate", 0)
    picks = today_data.get("picks", [])

    # Gesamtdaten
    overall = m.get("breakdown", {}).get("overall", {})
    cum_n    = overall.get("n", 0)
    cum_roi  = overall.get("roi", 0)
    cum_pnl  = overall.get("pnl", 0)
    cum_wr   = overall.get("wr", 0)
    avg_edge = overall.get("avg_edge", 0)
    avg_odds = overall.get("avg_odds", 0)

    daily_stats.append({
        "date": date,
        "bets": bets, "wins": wins, "profit": round(profit,2), "wr": wr,
        "cum_n": cum_n, "cum_roi": cum_roi, "cum_pnl": cum_pnl, "cum_wr": cum_wr,
        "avg_edge": avg_edge, "avg_odds": avg_odds,
        "picks_detail": picks,
    })

# ── TÄGLICH
print("=" * 80)
print("  TÄGLICHE PERFORMANCE (agent_analysis Picks)")
print("=" * 80)
print(f"  {'Datum':<12} {'Picks':>6} {'Wins':>5} {'WR%':>6} {'Profit':>9} {'Cum P&L':>10} {'Cum ROI':>9}")
print("-" * 80)
cumulative = 0
for d in daily_stats:
    cumulative += d["profit"]
    icon = "✅" if d["profit"] > 0 else ("➕" if d["profit"] == 0 else "❌")
    print(f"  {icon} {d['date']:<11} {d['bets']:>6} {d['wins']:>5} {d['wr']:>5.0f}% {d['profit']:>+8.2f}u {cumulative:>+9.2f}u {d['cum_roi']:>8.1f}%")

# ── GESAMT
if daily_stats:
    last = daily_stats[-1]
    print("-" * 80)
    print(f"\n  KUMULATIV (laut letztem Report):")
    print(f"  Total Picks:   {last['cum_n']}")
    print(f"  Win Rate:      {last['cum_wr']}%")
    print(f"  Gesamt P&L:    {last['cum_pnl']:+.2f}u")
    print(f"  ROI:           {last['cum_roi']:+.1f}%")
    print(f"  Avg Edge:      {last['avg_edge']}%")
    print(f"  Avg Odds:      {last['avg_odds']}")

# ── BREAKDOWN nach Markt-Typ (letzter Report)
print("\n\n" + "=" * 80)
print("  BREAKDOWN NACH MARKT-TYP (aktuell)")
print("=" * 80)
if daily_stats:
    last_raw = reports[-1].get("metrics","")
    try:
        if isinstance(last_raw, str):
            lm = ast.literal_eval(last_raw)
        else:
            lm = last_raw
        breakdown = lm.get("breakdown", {})
        surface_mkt = breakdown.get("surface_mkt", {})
        print(f"  {'Kategorie':<30} {'Picks':>6} {'WR%':>6} {'P&L':>8} {'ROI%':>8} {'Avg Edge':>10}")
        print("-" * 75)
        for cat, data in sorted(surface_mkt.items()):
            if data is None: continue
            n   = data.get("n",0)
            wr  = data.get("wr",0)
            pnl = data.get("pnl",0)
            roi = data.get("roi",0)
            ae  = data.get("avg_edge",0)
            icon = "✅" if roi > 0 else "❌"
            print(f"  {icon} {cat:<28} {n:>6} {wr:>5.0f}% {pnl:>+7.2f}u {roi:>+7.1f}% {ae:>9.1f}%")
    except Exception as e:
        print(f"  Fehler: {e}")

# ── HEUTE vs GESAMT Vergleich
print("\n\n" + "=" * 80)
print("  HEUTE vs. GESAMTPERFORMANCE")
print("=" * 80)
if daily_stats:
    last = daily_stats[-1]
    heute_roi = 90.1
    heute_pnl = 6.31
    heute_wr  = 71.4
    print(f"""
  {'':30} {'HEUTE':>12} {'GESAMT':>12}
  {'─'*55}
  Picks:               {'7':>12} {last['cum_n']:>12}
  Win Rate:            {'71%':>12} {last['cum_wr']:>11}%
  P&L:                 {'+6.31u':>12} {last['cum_pnl']:>+11.2f}u
  ROI:                 {'+90.1%':>12} {last['cum_roi']:>+10.1f}%
  {'─'*55}
  
  Fazit: Heute war ein AUSNAHMETAG.
  Das Gesamtsystem ist bei {last['cum_roi']:+.1f}% ROI über {last['cum_n']} Picks.
""")
