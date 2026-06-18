"""
Neural Scout — Historical Pattern Engine FINAL v3
Confirmed columns in historical_matches (Sackmann format):
  tourney_name, surface, tourney_level, match_date, winner_name, loser_name,
  winner_rank, loser_rank, score, best_of, round, tour
  (NO tourney_category, NO winner_odds/loser_odds)

Grand Slam detection: via tourney_level='G' or tourney_name contains known slam names
"""
import sys, json, re, datetime, os
sys.stdout.reconfigure(encoding='utf-8')
from supabase import create_client
from collections import defaultdict

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("FATAL: SUPABASE_URL or SUPABASE_KEY environment variables are not set.")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

SLAM_NAMES  = {"australian open","roland garros","french open","wimbledon","us open"}
CLAY_KW     = {"roland garros","french open","clay","barcelona","hamburg","madrid","rome",
               "monte carlo","monte-carlo","estoril","gstaad","bucharest","istanbul",
               "marrakech","geneva","munich","lyon"}
GRASS_KW    = {"wimbledon","halle","queen","hertogenbosch","eastbourne","nottingham","birmingham"}
EARLY_RNDS  = {"r128","r64","r32","r16","r1","r2","1r","2r","rr"}

def tg(score):
    return sum(int(a)+int(b) for a,b in re.findall(r'(\d+)-(\d+)', score))

def norm_surf(s):
    s = (s or '').lower()
    if 'clay' in s: return 'clay'
    if 'grass' in s: return 'grass'
    return 'hard'

def surf_from_name(name):
    n = name.lower()
    if any(k in n for k in CLAY_KW):  return 'clay'
    if any(k in n for k in GRASS_KW): return 'grass'
    return 'hard'

def is_slam(tourney_name, tourney_level):
    if (tourney_level or '').upper() == 'G': return True
    return any(s in (tourney_name or '').lower() for s in SLAM_NAMES)

def is_early(rnd):
    r = (rnd or '').strip().lower()
    return r in EARLY_RNDS

def odds_bracket(o):
    if o < 1.30: return "sub130"
    if o < 1.50: return "130_150"
    if o < 1.70: return "150_170"
    if o < 2.00: return "170_200"
    if o < 2.50: return "200_250"
    if o < 3.00: return "250_300"
    if o < 5.00: return "300_500"
    return "500plus"

def roi_v(p, n): return round(p/n, 4) if n > 0 else 0.0
def pct(p, n):   return f"{roi_v(p,n):+.1%}" if n > 0 else "N/A"

def fetch_all(table, cols, extra_filters=None):
    """Keyset pagination with retry on connection drop (WinError 10054)."""
    import time, httpx
    rows = []
    PAGE = 1000       # Optimized page size to respect Supabase ceiling and ensure pagination
    last_id = None
    fetch_cols = cols if "id" in cols else "id," + cols
    consecutive_errors = 0

    while True:
        for attempt in range(5):   # up to 5 retries per page
            try:
                q = supabase.table(table).select(fetch_cols).order("id").limit(PAGE)
                if extra_filters:
                    for k, v in extra_filters.items():
                        if v == "not_null": q = q.not_.is_(k, "null")
                        else: q = q.eq(k, v)
                if last_id is not None:
                    q = q.gt("id", last_id)
                batch = q.execute()
                consecutive_errors = 0
                break   # success
            except Exception as e:
                wait = 2 ** attempt
                print(f"\n  [{table}] Retry {attempt+1}/5 after error: {str(e)[:80]}. Waiting {wait}s...")
                time.sleep(wait)
                if attempt == 4:
                    print(f"  [{table}] FATAL: could not fetch after 5 retries. Stopping here.")
                    return rows
        else:
            return rows

        if not batch.data:
            break
        rows.extend(batch.data)
        last_id = batch.data[-1]["id"]
        print(f"  [{table}] {len(rows):,} rows...", end='\r')
        if len(batch.data) < PAGE:
            break
        time.sleep(0.02)   # 20ms gentle spacing between pages

    print(f"  [{table}] Fetched {len(rows):,} total.          ")
    return rows


# ═══════════════════════════════════════════════════════════════════════════
# STEP 1: historical_matches — O/U rates, player profiles, format distribution
# ═══════════════════════════════════════════════════════════════════════════
print("\n=== STEP 1: historical_matches (O/U + Player Profiles) ===")
HIST_COLS = "winner_name,loser_name,tourney_name,surface,tourney_level,score,round,winner_rank,loser_rank,best_of,tour"
hist = fetch_all("historical_matches", HIST_COLS)
print(f"Total: {len(hist):,}")

ou_stats     = defaultdict(lambda: defaultdict(lambda: [0, 0]))  # key -> line -> [over, total]
fmt_games    = defaultdict(list)
player_games = defaultdict(list)
player_surf  = defaultdict(lambda: defaultdict(lambda: [0, 0]))   # [wins, losses]

for m in hist:
    surf    = norm_surf(m.get('surface'))
    score   = m.get('score') or ''
    w_name  = (m.get('winner_name') or '').strip().lower()
    l_name  = (m.get('loser_name')  or '').strip().lower()
    rnd     = m.get('round') or ''
    level   = m.get('tourney_level') or ''
    tname   = m.get('tourney_name') or ''
    best_of = int(m.get('best_of') or 3)

    slam  = is_slam(tname, level)
    fmt   = 'bo5' if (best_of == 5 or slam) else 'bo3'
    early = is_early(rnd)

    if w_name: player_surf[w_name][surf][0] += 1
    if l_name: player_surf[l_name][surf][1] += 1

    if score and len(score) > 3:
        g = tg(score)
        threshold = 20 if fmt == 'bo5' else 10
        if g > threshold:
            fmt_games[fmt].append(g)
            entry = {"tg": g, "is_slam": slam, "surf": surf}
            if w_name: player_games[w_name].append(entry)
            if l_name: player_games[l_name].append(entry)
            key = f"{surf}_{fmt}"
            lines = [33.5, 35.5, 37.5, 39.5] if fmt == 'bo5' else [20.5, 21.5, 22.5, 23.5]
            for line in lines:
                ou_stats[key][line][0] += (1 if g > line else 0)
                ou_stats[key][line][1] += 1

print(f"  O/U keys: {sorted(ou_stats.keys())}")
print(f"  Player game profiles: {len(player_games):,}")

# ═══════════════════════════════════════════════════════════════════════════
# STEP 2: market_odds — ROI analysis (settled matches with real odds)
# ═══════════════════════════════════════════════════════════════════════════
print("\n=== STEP 2: market_odds (ROI Analysis — settled bets) ===")
MO_COLS = "player1_name,player2_name,odds1,odds2,actual_winner_name,tournament"
mo_all  = fetch_all("market_odds", MO_COLS, {"actual_winner_name": "not_null"})
print(f"Settled bets: {len(mo_all):,}")

surf_roi     = defaultdict(lambda: {"fp":0.0,"fn":0,"dp":0.0,"dn":0})
surf_cat_roi = defaultdict(lambda: {"fp":0.0,"fn":0,"dp":0.0,"dn":0})
bracket_roi  = defaultdict(lambda: {"p":0.0,"n":0})
skipped_mo   = 0

for m in mo_all:
    t    = (m.get('tournament') or '').lower()
    surf = surf_from_name(t)
    slam = any(s in t for s in SLAM_NAMES)
    try:
        o1 = float(m['odds1']); o2 = float(m['odds2'])
    except (TypeError, ValueError, KeyError):
        skipped_mo += 1; continue
    if o1 <= 1.01 or o2 <= 1.01: skipped_mo += 1; continue

    winner = (m.get('actual_winner_name') or '').lower().strip()
    p1     = (m.get('player1_name') or '').lower().strip()
    p1_won = winner in p1 or p1 in winner
    fav_won = (o1 <= o2 and p1_won) or (o2 < o1 and not p1_won)
    fav_odds = min(o1, o2); dog_odds = max(o1, o2)
    fp = (fav_odds - 1.0) if fav_won else -1.0
    dp = (dog_odds - 1.0) if not fav_won else -1.0

    surf_roi[surf]["fp"] += fp; surf_roi[surf]["fn"] += 1
    surf_roi[surf]["dp"] += dp; surf_roi[surf]["dn"] += 1
    sk = f"{surf}_{'slam' if slam else 'regular'}"
    surf_cat_roi[sk]["fp"] += fp; surf_cat_roi[sk]["fn"] += 1
    surf_cat_roi[sk]["dp"] += dp; surf_cat_roi[sk]["dn"] += 1
    bkt = f"{surf}_{odds_bracket(dog_odds)}"
    bracket_roi[bkt]["p"] += dp; bracket_roi[bkt]["n"] += 1

print(f"  Valid bets analyzed: {len(mo_all)-skipped_mo:,}  |  Skipped: {skipped_mo:,}")

# ═══════════════════════════════════════════════════════════════════════════
# STEP 3: BUILD & PRINT RESULTS
# ═══════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("SURFACE ROI (from market_odds)")
print("=" * 70)
surface_bias_out = {}
for surf in ['clay','grass','hard']:
    d = surf_roi.get(surf)
    if not d or d["fn"] < 3: continue
    fr = roi_v(d["fp"],d["fn"]); dr = roi_v(d["dp"],d["dn"])
    print(f"  [{surf.upper():5}]  Favs: {pct(d['fp'],d['fn'])} (n={d['fn']:,})  Dogs: {pct(d['dp'],d['dn'])} (n={d['dn']:,})")
    surface_bias_out[surf] = {"favorite_roi": fr, "underdog_roi": dr, "n": d["fn"]}

print("\n" + "=" * 70)
print("SURFACE x SLAM/REGULAR ROI")
print("=" * 70)
surf_cat_out = {}
for key in sorted(surf_cat_roi):
    d = surf_cat_roi[key]
    if d["fn"] < 3: continue
    fr = roi_v(d["fp"],d["fn"]); dr = roi_v(d["dp"],d["dn"])
    print(f"  [{key:22}]  Favs: {pct(d['fp'],d['fn'])} (n={d['fn']:,})  Dogs: {pct(d['dp'],d['dn'])} (n={d['dn']:,})")
    surf_cat_out[key] = {"favorite_roi": fr, "underdog_roi": dr, "n": d["fn"]}

print("\n" + "=" * 70)
print("UNDERDOG BRACKET ROI")
print("=" * 70)
bracket_out = {}
for surf in ['clay','grass','hard']:
    for bkt in ["sub130","130_150","150_170","170_200","200_250","250_300","300_500","500plus"]:
        key = f"{surf}_{bkt}"; d = bracket_roi.get(key)
        if not d or d["n"] < 5: continue
        r = roi_v(d["p"],d["n"])
        print(f"  {key:38}  ROI: {r:+.1%}  (n={d['n']:,})")
        bracket_out[key] = {"underdog_roi": r, "n": d["n"]}

print("\n" + "=" * 70)
print("O/U BASE RATES (from 200k+ historical matches)")
print("=" * 70)
ou_out = {}
for key in sorted(ou_stats):
    ou_out[key] = {}
    print(f"\n  [{key}]")
    for line in sorted(ou_stats[key]):
        over_c, total_c = ou_stats[key][line]
        rate = round(over_c/total_c, 4) if total_c > 0 else 0.5
        label = f"over_{str(line).replace('.','_')}"
        ou_out[key][label] = rate
        print(f"    Over {line}: {rate:.1%}  (n={total_c:,})")

print("\n" + "=" * 70)
print("FORMAT GAME DISTRIBUTION")
print("=" * 70)
fmt_dist_out = {}
for fmt in ['bo3','bo5']:
    gl = fmt_games.get(fmt,[])
    if not gl: continue
    sgl = sorted(gl)
    avg = sum(gl)/len(gl)
    print(f"  [{fmt}]  n={len(gl):,}  Avg={avg:.1f}  Median={sgl[len(gl)//2]}  P25={sgl[len(gl)//4]}  P75={sgl[3*len(gl)//4]}")
    fmt_dist_out[fmt] = {"n":len(gl),"avg":round(avg,2),"median":sgl[len(gl)//2],"p25":sgl[len(gl)//4],"p75":sgl[3*len(gl)//4]}

print("\n" + "=" * 70)
print("PLAYER O/U PROFILES (top 30 shown, all saved)")
print("=" * 70)
player_out = {}
SHOWN = 0
for player, games in sorted(player_games.items(), key=lambda x: -len(x[1])):
    if len(games) < 30: continue
    bo3 = [g for g in games if not g["is_slam"]]
    bo5 = [g for g in games if g["is_slam"]]
    def or_(gs, line): return round(sum(1 for g in gs if g["tg"]>line)/len(gs),3) if gs else None
    b3 = or_(bo3, 21.5); b5 = or_(bo5, 35.5)
    l5b3 = [1 if g["tg"]>21.5 else 0 for g in bo3[-5:]]
    l5b5 = [1 if g["tg"]>35.5 else 0 for g in bo5[-5:]]
    player_out[player] = {"bo3_n":len(bo3),"bo5_n":len(bo5),"bo3_over_21_5":b3,"bo5_over_35_5":b5,"last5_bo3":l5b3,"last5_bo5":l5b5}
    if SHOWN < 30:
        b5s = f"{b5:.0%}(n={len(bo5)})" if b5 else f"-(n={len(bo5)})"
        print(f"  {player:<30}  Bo3 O21.5={b3:.0%}(n={len(bo3)})  Bo5={b5s}" if b3 else f"  {player:<30}  -")
        SHOWN += 1
print(f"\n  Total player profiles: {len(player_out):,}")

print("\n" + "=" * 70)
print("PLAYER SURFACE WIN RATES (top 200 by volume)")
print("=" * 70)
surf_wr_out = {}
# Save surface winrates for ALL players in player_surf
top = list(player_surf.keys())
SHOWN2 = 0
for player in top:
    sd = player_surf[player]
    entry = {}
    for surf in ['clay','grass','hard']:
        w,l = sd.get(surf,[0,0])
        entry[surf] = {"wins":w,"losses":l,"win_rate": round(w/(w+l),3) if w+l>0 else None}
    surf_wr_out[player] = entry
    if SHOWN2 < 20:
        parts = [f"{s}:{entry[s]['win_rate']:.0%}(n={entry[s]['wins']+entry[s]['losses']})" for s in ['clay','grass','hard'] if entry[s]['win_rate'] is not None]
        print(f"  {player:<28}  {'  '.join(parts)}")
        SHOWN2 += 1

# ═══════════════════════════════════════════════════════════════════════════
# SAVE
# ═══════════════════════════════════════════════════════════════════════════
cache = {
    "meta": {
        "total_hist_matches": len(hist),
        "settled_market_odds": len(mo_all) - skipped_mo,
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    },
    "surface_bias": surface_bias_out,
    "surface_category_bias": surf_cat_out,
    "underdog_bracket_roi": bracket_out,
    "ou_base_rates": ou_out,
    "format_distribution": fmt_dist_out,
    "player_ou_profiles": player_out,
    "player_surface_winrates": surf_wr_out
}

OUT = os.path.join(os.path.dirname(__file__), "pattern_cache.json")
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(cache, f, indent=2, ensure_ascii=False, default=str)

print(f"\n{'='*70}")
print(f"DONE -> {OUT}")
print(f"  Hist matches : {len(hist):,}")
print(f"  Settled ROI  : {len(mo_all)-skipped_mo:,}")
print(f"  Player profs : {len(player_out):,}")
print(f"  O/U keys     : {list(ou_out.keys())}")
