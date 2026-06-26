"""
Deep Profitability Analysis - Was funktioniert wirklich?
Alle agent_analysis Picks aus market_odds, aufgeteilt nach Markt, Edge, Odds, Surface.
"""
import os, sys, re, ast, collections
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../scraper")))
from env_loader import load_env
load_env()
from supabase import create_client

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

# ── Alle abgeschlossenen Picks aus market_odds
print("Lade alle Matches mit Ergebnis...")
all_rows = []
offset = 0
while True:
    res = (
        supabase.table("market_odds")
        .select("player1_name,player2_name,odds1,odds2,ai_fair_odds1,ai_fair_odds2,actual_winner_name,ai_analysis_text,created_at,tournament")
        .not_.is_("actual_winner_name", "null")
        .not_.is_("ai_analysis_text", "null")
        .not_.is_("ai_fair_odds1", "null")
        .order("created_at", desc=False)
        .range(offset, offset+999)
        .execute()
    )
    batch = res.data or []
    all_rows.extend(batch)
    if len(batch) < 1000: break
    offset += 1000

print(f"Geladen: {len(all_rows)} Matches\n")

# ── Extrahiere alle Picks mit Edge-Tags
picks = []
for r in all_rows:
    atext = r.get("ai_analysis_text") or ""
    winner = (r.get("actual_winner_name") or "").lower().strip()
    # Derive surface from tournament name and AI text
    tourn = (r.get("tournament") or "").lower()
    atext_lower = atext.lower()
    if any(k in tourn for k in ["wimbledon","eastbourne","halle","queens","mallorca","grass","hertogenbosch","birmingham","nottingham"]):
        surf = "grass"
    elif any(k in tourn for k in ["roland","french","clay","madrid","barcelona","rome","monte carlo","hamburg","geneva","lyon"]):
        surf = "clay"
    elif "grass" in atext_lower[:300]:
        surf = "grass"
    elif "clay" in atext_lower[:300]:
        surf = "clay"
    else:
        surf = "hard"

    for tag in re.finditer(r'\[([^\]]+Edge:[^\]]+)\]', atext):
        t = tag.group(1)
        stake_m = re.search(r'Stake:\s*([\d.]+)u', t)
        edge_m  = re.search(r'Edge:\s*([\d.]+)%', t)
        type_m  = re.search(r'^(.*?):', t)
        pick_m  = re.search(r':\s*(.*?)\s*@', t)
        odds_m  = re.search(r'@\s*([\d.]+)', t)

        if not (stake_m and edge_m and odds_m): continue

        pick_name = pick_m.group(1).strip() if pick_m else ""
        pick_odds = float(odds_m.group(1))
        edge_pct  = float(edge_m.group(1))
        stake     = float(stake_m.group(1))
        pick_type_raw = type_m.group(1).strip() if type_m else ""

        # Markt-Typ ermitteln
        pn_lower = pick_name.lower()
        if "over" in pn_lower or "under" in pn_lower:
            mkt = "TOTAL_OVER" if "over" in pn_lower else "TOTAL_UNDER"
        elif "+1.5" in pn_lower or "+2.5" in pn_lower or "+3.5" in pn_lower:
            mkt = "HANDICAP_DOG"
        elif "-1.5" in pn_lower or "-2.5" in pn_lower or "-3.5" in pn_lower:
            mkt = "HANDICAP_FAVE"
        else:
            mkt = "MONEYLINE"

        # Gewinn-Check
        won = pick_name.split()[0].lower() in winner or \
              (len(pick_name.split()) > 1 and pick_name.split()[-1].lower() in winner)
        # Für Totals: kein direkter Winner-Check möglich, überspringen
        if mkt in ("TOTAL_OVER", "TOTAL_UNDER"):
            continue  # Totals brauchen score-daten die wir nicht haben

        pnl = (pick_odds - 1.0) if won else -1.0
        date = (r.get("created_at") or "")[:10]
        month = date[:7]

        # Odds-Bracket
        if pick_odds < 1.60:    odds_bracket = "1.0-1.6 (Kl. Fav)"
        elif pick_odds < 2.00:  odds_bracket = "1.6-2.0 (Fav)"
        elif pick_odds < 2.50:  odds_bracket = "2.0-2.5 (Leicht Dog)"
        elif pick_odds < 3.50:  odds_bracket = "2.5-3.5 (Dog)"
        else:                   odds_bracket = "3.5+    (Big Dog)"

        # Edge-Bracket
        if edge_pct < 5:        edge_bracket = "<5%"
        elif edge_pct < 8:      edge_bracket = "5-8%"
        elif edge_pct < 12:     edge_bracket = "8-12%"
        else:                   edge_bracket = "12%+"

        picks.append({
            "date": date, "month": month,
            "pick_name": pick_name, "pick_type": pick_type_raw,
            "surf": surf, "mkt": mkt,
            "odds": pick_odds, "edge": edge_pct, "stake": stake,
            "won": won, "pnl": round(pnl, 2),
            "odds_bracket": odds_bracket, "edge_bracket": edge_bracket,
        })

print(f"Extrahierte Picks (Moneyline + Handicap): {len(picks)}\n")

def stats(lst):
    if not lst: return None
    n = len(lst)
    wins = sum(1 for p in lst if p["won"])
    staked = n * 1.0  # flat 1u
    pnl = sum(p["pnl"] for p in lst)
    roi = pnl / staked * 100
    wr  = wins / n * 100
    return {"n": n, "wins": wins, "wr": round(wr,1), "pnl": round(pnl,2), "roi": round(roi,1)}

# ═══════════════════════════════════════════════════════════════════════
# 1. NACH MARKT + SURFACE
# ═══════════════════════════════════════════════════════════════════════
print("=" * 75)
print("  1. NACH MARKT-TYP + SURFACE  (Flat 1u)")
print("=" * 75)
print(f"  {'Kategorie':<30} {'Picks':>6} {'WR%':>6} {'P&L':>9} {'ROI%':>8}")
print("-" * 75)
cats = collections.defaultdict(list)
for p in picks:
    cats[f"{p['surf']}|{p['mkt']}"].append(p)
for cat in sorted(cats, key=lambda x: -(stats(cats[x]) or {}).get("roi",0)):
    s = stats(cats[cat])
    if not s or s["n"] < 5: continue
    icon = "✅" if s["roi"] > 0 else "❌"
    print(f"  {icon} {cat:<30} {s['n']:>6} {s['wr']:>5.1f}% {s['pnl']:>+8.2f}u {s['roi']:>+7.1f}%")

# ═══════════════════════════════════════════════════════════════════════
# 2. NACH ODDS-BRACKET
# ═══════════════════════════════════════════════════════════════════════
print("\n" + "=" * 75)
print("  2. NACH ODDS-BEREICH  (Flat 1u)")
print("=" * 75)
print(f"  {'Odds-Bereich':<25} {'Picks':>6} {'WR%':>6} {'P&L':>9} {'ROI%':>8} {'Break-Even WR':>15}")
print("-" * 75)
ob = collections.defaultdict(list)
for p in picks: ob[p["odds_bracket"]].append(p)
for bracket in ["1.0-1.6 (Kl. Fav)","1.6-2.0 (Fav)","2.0-2.5 (Leicht Dog)","2.5-3.5 (Dog)","3.5+    (Big Dog)"]:
    lst = ob.get(bracket, [])
    s = stats(lst)
    if not s or s["n"] < 3: continue
    avg_odds = sum(p["odds"] for p in lst)/len(lst)
    be_wr = 1/avg_odds*100
    icon = "✅" if s["roi"] > 0 else "❌"
    print(f"  {icon} {bracket:<25} {s['n']:>6} {s['wr']:>5.1f}% {s['pnl']:>+8.2f}u {s['roi']:>+7.1f}% {be_wr:>14.1f}%")

# ═══════════════════════════════════════════════════════════════════════
# 3. NACH EDGE-BRACKET
# ═══════════════════════════════════════════════════════════════════════
print("\n" + "=" * 75)
print("  3. NACH EDGE-STÄRKE  (Flat 1u)")
print("=" * 75)
print(f"  {'Edge-Bereich':<20} {'Picks':>6} {'WR%':>6} {'P&L':>9} {'ROI%':>8}")
print("-" * 75)
eb = collections.defaultdict(list)
for p in picks: eb[p["edge_bracket"]].append(p)
for bracket in ["<5%","5-8%","8-12%","12%+"]:
    lst = eb.get(bracket, [])
    s = stats(lst)
    if not s or s["n"] < 3: continue
    icon = "✅" if s["roi"] > 0 else "❌"
    print(f"  {icon} {bracket:<20} {s['n']:>6} {s['wr']:>5.1f}% {s['pnl']:>+8.2f}u {s['roi']:>+7.1f}%")

# ═══════════════════════════════════════════════════════════════════════
# 4. PICK-TYP (MICRO EDGE / CORE VALUE / HIGH CONVICTION / MAX BOMB)
# ═══════════════════════════════════════════════════════════════════════
print("\n" + "=" * 75)
print("  4. NACH PICK-TYP  (Flat 1u)")
print("=" * 75)
print(f"  {'Pick-Typ':<35} {'Picks':>6} {'WR%':>6} {'P&L':>9} {'ROI%':>8}")
print("-" * 75)
tb = collections.defaultdict(list)
for p in picks:
    # Vereinfache Typ-Namen
    t = p["pick_type"]
    if "MICRO" in t: t2 = "MICRO EDGE"
    elif "CORE" in t or "VALUE" in t: t2 = "CORE VALUE"
    elif "HIGH" in t or "CONVICTION" in t: t2 = "HIGH CONVICTION"
    elif "MAX" in t or "BOMB" in t: t2 = "MAX BOMB"
    else: t2 = "OTHER"
    tb[t2].append(p)
for typ in ["MICRO EDGE","CORE VALUE","HIGH CONVICTION","MAX BOMB","OTHER"]:
    lst = tb.get(typ, [])
    s = stats(lst)
    if not s or s["n"] < 3: continue
    icon = "✅" if s["roi"] > 0 else "❌"
    print(f"  {icon} {typ:<35} {s['n']:>6} {s['wr']:>5.1f}% {s['pnl']:>+8.2f}u {s['roi']:>+7.1f}%")

# ═══════════════════════════════════════════════════════════════════════
# 5. BESTE KOMBINATION: Markt + Edge
# ═══════════════════════════════════════════════════════════════════════
print("\n" + "=" * 75)
print("  5. BESTE KOMBINATIONEN (Markt × Edge)")
print("=" * 75)
print(f"  {'Kombination':<40} {'Picks':>6} {'WR%':>6} {'P&L':>9} {'ROI%':>8}")
print("-" * 75)
combo = collections.defaultdict(list)
for p in picks:
    key = f"{p['surf']}|{p['mkt']} × Edge {p['edge_bracket']}"
    combo[key].append(p)
sorted_combos = sorted(combo.items(), key=lambda x: -(stats(x[1]) or {}).get("roi",0))
for cat, lst in sorted_combos[:15]:
    s = stats(lst)
    if not s or s["n"] < 4: continue
    icon = "✅" if s["roi"] > 0 else "❌"
    print(f"  {icon} {cat:<40} {s['n']:>6} {s['wr']:>5.1f}% {s['pnl']:>+8.2f}u {s['roi']:>+7.1f}%")
