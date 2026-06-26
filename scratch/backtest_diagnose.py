"""
Diagnose: Warum sind die Stakes so minimal (~0.01u)?
Schaut sich die rohe Datenqualität an.
"""
import os, sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../scraper")))
from env_loader import load_env
load_env()
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Hole ein Sample der Matches
res = (
    supabase.table("market_odds")
    .select("player1_name,player2_name,odds1,odds2,ai_fair_odds1,ai_fair_odds2,actual_winner_name,created_at")
    .not_.is_("actual_winner_name", "null")
    .not_.is_("ai_fair_odds1", "null")
    .order("created_at", desc=True)
    .limit(20)
    .execute()
)

rows = res.data or []
print(f"Sample: {len(rows)} Matches\n")
print(f"{'Spieler1':<22} {'Spieler2':<22} {'Odds1':>6} {'Odds2':>6} {'Fair1':>6} {'Fair2':>6} {'RawEdge1':>9} {'RawEdge2':>9}")
print("-" * 100)

edges = []
for r in rows:
    o1 = r.get("odds1") or 0
    o2 = r.get("odds2") or 0
    f1 = r.get("ai_fair_odds1") or 0
    f2 = r.get("ai_fair_odds2") or 0
    p1 = (r.get("player1_name") or "")[:20]
    p2 = (r.get("player2_name") or "")[:20]
    if o1 > 1.01 and f1 > 1.01:
        fp1 = 1.0 / f1
        raw1 = round((fp1 * o1 - 1.0) * 100, 1)
    else:
        raw1 = 0
    if o2 > 1.01 and f2 > 1.01:
        fp2 = 1.0 / f2
        raw2 = round((fp2 * o2 - 1.0) * 100, 1)
    else:
        raw2 = 0
    edges.append(raw1)
    edges.append(raw2)
    print(f"{p1:<22} {p2:<22} {o1:>6.2f} {o2:>6.2f} {f1:>6.2f} {f2:>6.2f} {raw1:>8.1f}% {raw2:>8.1f}%")

pos = [e for e in edges if e > 0]
neg = [e for e in edges if e <= 0]
print(f"\nSample Stats:")
print(f"  Positive Edges: {len(pos)}/{len(edges)}")
if pos:
    print(f"  Avg pos edge: {sum(pos)/len(pos):.1f}%")
    print(f"  Max pos edge: {max(pos):.1f}%")

# Jetzt: wie viele haben fair_odds überhaupt gesetzt?
res2 = supabase.table("market_odds").select("id", count="exact").not_.is_("actual_winner_name","null").execute()
res3 = supabase.table("market_odds").select("id", count="exact").not_.is_("actual_winner_name","null").not_.is_("ai_fair_odds1","null").execute()
res4 = supabase.table("market_odds").select("id", count="exact").not_.is_("actual_winner_name","null").is_("ai_fair_odds1","null").execute()

total_settled = res2.count or 0
with_fair     = res3.count or 0
without_fair  = res4.count or 0

print(f"\nDaten-Abdeckung in market_odds:")
print(f"  Matches mit Ergebnis:            {total_settled}")
print(f"  Davon MIT fair odds:             {with_fair} ({100*with_fair/total_settled:.0f}% wenn >0)")
print(f"  Davon OHNE fair odds:            {without_fair}")
