import os
import sys
import re
import json
import httpx
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from supabase import create_client

sys.stdout.reconfigure(encoding='utf-8')

# Supabase Credentials
SUPABASE_URL = os.environ.get("SUPABASE_URL") or 'https://suoaznisiowoolxilaju.supabase.co'
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY") or 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b2F6bmlzaW93b29seGlsYWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3MDA2MiwiZXhwIjoyMDgxNzMwMDYyfQ.qcOEsflvc9zJnT5ir-SYe2YhoNczDDS11be5TzLyxEo'
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")

if not OPENROUTER_API_KEY:
    log("⚠️ OPENROUTER_API_KEY is missing. Skipping analysis run.")
    sys.exit(0)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
MODEL_NAME = 'meta-llama/llama-3.3-70b-instruct'

def log(msg: str):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}")

# ═══════════════════════════════════════════════════════════════════════════
# PARSING AND HELPERS
# ═══════════════════════════════════════════════════════════════════════════

def parse_value_from_text(text):
    if not text:
        return {"hasValue": False}
    if '[' in text and 'Edge:' in text:
        type_match = re.search(r'\[(.*?):', text)
        player_match = re.search(r':\s*(.*?)\s*@', text)
        odds_match = re.search(r'@\s*([\d.]+)', text)
        fair_match = re.search(r'Fair:\s*([\d.]+)', text)
        edge_match = re.search(r'Edge:\s*(-?[\d.]+)%', text)
        stake_match = re.search(r'Stake:\s*([\d.]+)u', text)
        if player_match and odds_match and edge_match:
            raw_stake = float(stake_match.group(1)) if stake_match else 0.0
            final_stake = round(max(0.0, min(5.0, raw_stake)), 1)
            return {
                "hasValue": True,
                "type": type_match.group(1).strip() if type_match else 'VALUE',
                "pickName": player_match.group(1).strip(),
                "marketOdds": float(odds_match.group(1)),
                "fairOdds": float(fair_match.group(1)) if fair_match else 0.0,
                "edge": float(edge_match.group(1)),
                "stake": final_stake
            }
    if 'Stake:' in text:
        legacy_regex = r'\[?(💎|🛡️|⚖️|💰|HUNTER).*?:\s*(.*?)\s*@\s*([\d.]+).*?Edge:\s*(-?[\d.]+)%.*?Stake:\s*([\d.]+)u'
        match = re.search(legacy_regex, text)
        if match:
            raw_stake = float(match.group(5))
            final_stake = round(max(0.0, min(5.0, raw_stake)), 1)
            return {
                "hasValue": True,
                "type": 'LEGACY',
                "pickName": match.group(2).strip(),
                "marketOdds": float(match.group(3)),
                "fairOdds": 0.0,
                "edge": float(match.group(4)),
                "stake": final_stake
            }
    return {"hasValue": False}

def parse_score(score_raw):
    if not score_raw: return None
    clean = re.sub(r'[^\d\-\s]', ' ', score_raw.replace(':', '-'))
    parts = re.split(r'\s+', clean.strip())
    p1, p2, valid = 0, 0, 0
    for part in parts:
        m = re.match(r'(\d+)-(\d+)', part)
        if m:
            a, b = int(m.group(1)), int(m.group(2))
            if a > 7 or b > 7: continue
            p1 += a; p2 += b; valid += 1
    return (p1, p2, valid) if valid else None

def _classify_pick(pick_name):
    lower = (pick_name or '').lower().strip()
    if 'over' in lower:
        m = re.search(r'([\d.]+)', lower)
        return 'TOTAL_OVER', float(m.group(1)) if m else None
    if 'under' in lower:
        m = re.search(r'([\d.]+)', lower)
        return 'TOTAL_UNDER', float(m.group(1)) if m else None
    m = re.search(r'([+\-])\s*([\d.]+)', pick_name or '')
    if m:
        sign = 1.0 if m.group(1) == '+' else -1.0
        val = sign * float(m.group(2))
        return ('HANDICAP_FAVE' if val < 0 else 'HANDICAP_DOG'), val
    return 'MONEYLINE', None

def is_player1_target(pick_name: str, p1_name: str) -> bool:
    if not pick_name or not p1_name: return False
    pick = pick_name.lower().strip()
    p1 = p1_name.lower().strip()
    if pick in p1 or p1 in pick: return True
    clean_pick = re.sub(r'[.,\/#!$%\^&\*;:{}=\-_`~()]', ' ', pick)
    pick_words = clean_pick.split()
    clean_p1 = re.sub(r'[.,\/#!$%\^&\*;:{}=\-_`~()]', ' ', p1)
    p1_words = clean_p1.split()
    p1_last = p1_words[-1] if p1_words else ''
    p1_first = p1_words[0] if p1_words else ''
    if p1_last and len(p1_last) >= 2 and p1_last in pick_words: return True
    if p1_first and len(p1_first) >= 2 and p1_first in pick_words: return True
    return False

def check_winner_result(pick_name: str, actual_winner: str) -> bool:
    if not actual_winner or not pick_name: return False
    p = pick_name.lower().strip()
    w = actual_winner.lower().strip()
    if p in w or w in p: return True
    w_words = w.split()
    w_last = w_words[-1] if w_words else ''
    if w_last and len(w_last) > 2 and w_last in p: return True
    return False

def check_play_result(pick_name: str, match: dict) -> bool:
    if not pick_name or not match: return False
    pick = pick_name.strip()
    actual_winner = match.get("actual_winner_name")
    score = match.get("score")
    p1 = match.get("player1_name", "")
    p2 = match.get("player2_name", "")
    lower_pick = pick.lower()
    
    if "over" in lower_pick or "under" in lower_pick:
        if not score: return False
        clean_score = re.sub(r'[^0-9\-\s]', '', score.replace(':', '-'))
        sets = clean_score.split()
        total_games = 0
        valid_sets = 0
        for s in sets:
            parts = s.split('-')
            if len(parts) == 2:
                try:
                    total_games += int(parts[0]) + int(parts[1])
                    valid_sets += 1
                except ValueError: continue
        if valid_sets == 0: return False
        match_num = re.search(r'[\d.]+', pick)
        if not match_num: return False
        boundary = float(match_num.group(0))
        if "over" in lower_pick: return total_games > boundary
        elif "under" in lower_pick: return total_games < boundary
        return False
    elif re.search(r'[+-]\s*\d+(?:\.\d+)?', pick):
        if not score or not p1 or not p2: return False
        clean_score = re.sub(r'[^0-9\-\s]', '', score.replace(':', '-'))
        sets = clean_score.split()
        p1_games, p2_games, valid_sets = 0, 0, 0
        for s in sets:
            parts = s.split('-')
            if len(parts) == 2:
                try:
                    p1_games += int(parts[0])
                    p2_games += int(parts[1])
                    valid_sets += 1
                except ValueError: continue
        if valid_sets == 0: return False
        is_p1 = is_player1_target(pick, p1)
        is_p2 = is_player1_target(pick, p2)
        match_sign_num = re.search(r'([+-]\s*\d+(?:\.\d+)?)', pick)
        if not match_sign_num: return False
        handicap = float(match_sign_num.group(1).replace(' ', ''))
        if is_p1: return p1_games + handicap > p2_games
        elif is_p2: return p2_games + handicap > p1_games
        return False
    else:
        return check_winner_result(pick, actual_winner)

def _odds_bracket(odds):
    if odds < 1.50: return "1.00–1.49"
    elif odds < 1.80: return "1.50–1.79"
    elif odds < 2.20: return "1.80–2.19"
    elif odds < 3.00: return "2.20–2.99"
    return "3.00+"

def _edge_bracket(edge):
    if edge < 4.0: return "0-4%"
    elif edge < 5.0: return "4-5%"
    elif edge < 6.0: return "5-6%"
    elif edge < 7.0: return "6-7%"
    elif edge < 8.0: return "7-8%"
    elif edge < 10.0: return "8-10%"
    elif edge < 15.0: return "10-15%"
    return "15%+"

def _stake_bracket(stake):
    if stake < 0.5: return "<0.5u"
    elif stake < 1.0: return "0.5–0.9u"
    elif stake < 1.5: return "1.0–1.4u"
    elif stake < 2.0: return "1.5–1.9u"
    return "2.0u+"

def _total_line_bucket(hval):
    if hval is None: return None
    if hval < 19.5: return "<19.5"
    elif hval < 20.5: return "19.5–20.5"
    elif hval < 21.5: return "20.5–21.5"
    elif hval < 22.5: return "21.5–22.5"
    elif hval < 23.5: return "22.5–23.5"
    return "23.5+"

def compute_p_value(n, avg_odds, roi):
    if n < 5 or roi >= 0: return 1.0
    try:
        roi_dec = roi / 100.0
        t_stat = (roi_dec * (n ** 0.5)) / ((max(0.01, avg_odds - 1)) ** 0.5)
        import math
        z = abs(t_stat)
        p = 0.5 * (1.0 + math.erf(z / (2 ** 0.5)))
        return round(1.0 - p, 4)
    except:
        return 1.0

# ═══════════════════════════════════════════════════════════════════════════
# OPENROUTER ENGINE
# ═══════════════════════════════════════════════════════════════════════════

async def call_openrouter(prompt: str, system_prompt: str, model: str = MODEL_NAME, temp: float = 0.15) -> str:
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://neuralscout.com",
        "X-Title": "NeuralScout AI Ops Analyst"
    }
    
    models_to_try = [model, "google/gemini-2.5-flash", "openrouter/free"]
    seen = set()
    models_to_try = [x for x in models_to_try if not (x in seen or seen.add(x))]
    
    async with httpx.AsyncClient() as client:
        for current_model in models_to_try:
            log(f"Calling OpenRouter with model: {current_model}...")
            payload = {
                "model": current_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "temperature": temp
            }
            try:
                response = await client.post(url, headers=headers, json=payload, timeout=60.0)
                if response.status_code == 200:
                    content = response.json()['choices'][0]['message']['content']
                    if content:
                        log(f"✅ OpenRouter API call succeeded.")
                        return content
                else:
                    log(f"⚠️ OpenRouter Error: {response.status_code} - {response.text}")
            except Exception as e:
                log(f"⚠️ OpenRouter Exception: {e}")
                
    return ""

# ═══════════════════════════════════════════════════════════════════════════
# MAIN ANALYSIS WORKFLOW
# ═══════════════════════════════════════════════════════════════════════════

async def run_analysis():
    log("📊 AI Scout Analyst starting full quant deep-dive analysis...")
    
    # 1. Fetch settled matches from last 30 days
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    try:
        res = supabase.table("market_odds")\
            .select("player1_name, player2_name, odds1, odds2, opening_odds1, opening_odds2, ai_fair_odds1, ai_fair_odds2, actual_winner_name, score, created_at, tournament, ai_analysis_text")\
            .not_.is_("actual_winner_name", "null")\
            .neq("actual_winner_name", "")\
            .gte("created_at", cutoff_date)\
            .execute()
        matches = res.data or []
    except Exception as e:
        log(f"❌ Supabase Fetch Error: {e}")
        return
        
    log(f"Loaded {len(matches)} settled matches from the last 30 days.")
    
    # Build rich picks
    rich_picks = []
    for m in matches:
        text = m.get("ai_analysis_text")
        val = parse_value_from_text(text)
        
        # Build if text missing but fair odds available
        if (not val or not val.get("hasValue")) and m.get("ai_fair_odds1") and m.get("ai_fair_odds2"):
            op1 = m.get("opening_odds1") or m.get("odds1")
            op2 = m.get("opening_odds2") or m.get("odds2")
            if op1 and op2:
                edge1 = ((op1 / m["ai_fair_odds1"]) - 1) * 100
                edge2 = ((op2 / m["ai_fair_odds2"]) - 1) * 100
                if edge1 > 1.0:
                    val = { "hasValue": True, "type": "INFO", "pickName": m["player1_name"], "marketOdds": op1, "fairOdds": m["ai_fair_odds1"], "stake": 1.0, "edge": edge1 }
                elif edge2 > 1.0:
                    val = { "hasValue": True, "type": "INFO", "pickName": m["player2_name"], "marketOdds": op2, "fairOdds": m["ai_fair_odds2"], "stake": 1.0, "edge": edge2 }
                    
        if not val or not val.get("hasValue"):
            continue
            
        pick_name = val["pickName"]
        odds = val["marketOdds"]
        fair = val.get("fairOdds") or 0.0
        stake = val["stake"]
        
        # Parse edge
        edge = None
        if text:
            m_edge = re.search(r"Edge:\s*(-?[\d.]+)%", text, re.IGNORECASE)
            edge = float(m_edge.group(1)) if m_edge else None
        if edge is None and fair > 1.01 and odds > 1.01:
            edge = round(((1/fair) * odds - 1.0) * 100, 1)
        if edge is None:
            edge = 0.0
            
        is_win = check_play_result(pick_name, m)
        if is_win is None:
            continue
            
        profit = stake * (odds - 1.0) if is_win else -stake
        market_type, hval = _classify_pick(pick_name)
        clv = round((odds / fair - 1.0) * 100, 2) if (fair > 1.01 and odds > 1.01) else None
        
        tournament = (m.get("tournament") or "").lower()
        surface = "hard"
        if any(x in tournament for x in ["clay","sand","terre","tierra","erde"]): surface = "clay"
        elif any(x in tournament for x in ["grass","rasen","wimbledon","eastbourne","halle","nottingham"]): surface = "grass"
        
        is_challenger = "challenger" in tournament or "itf" in tournament
        tour = "WTA" if "WTA" in (m.get("tournament") or "").upper() else "ATP"
        is_fav = odds < 1.80
        created_at = m.get("created_at", "")
        
        rich_picks.append({
            "pick_name": pick_name, "market_type": market_type, "hval": hval,
            "odds": odds, "fair": fair, "edge": edge, "stake": stake,
            "profit": profit, "is_win": is_win, "clv": clv,
            "surface": surface, "tour": tour, "is_challenger": is_challenger,
            "is_fav": is_fav, "created_at": created_at,
            "odds_bracket": _odds_bracket(odds),
            "edge_bracket": _edge_bracket(edge),
            "stake_bracket": _stake_bracket(stake),
            "total_line_bucket": _total_line_bucket(hval)
        })
        
    total_rich = len(rich_picks)
    log(f"Extracted {total_rich} rich picks for pattern analysis.")
    if total_rich < 10:
        log("⚠️ Insufficient resolved picks to run analysis.")
        return
        
    # Group stats helpers
    def _grp_stats(grp):
        n = len(grp)
        if n == 0: return None
        wins = sum(1 for p in grp if p["is_win"])
        staked = sum(p["stake"] for p in grp)
        pnl = sum(p["profit"] for p in grp)
        roi = pnl / staked * 100 if staked > 0 else 0
        wr = wins / n * 100
        avg_odds = sum(p["odds"] for p in grp) / n
        avg_edge = sum(p["edge"] for p in grp) / n
        be_wr = 100.0 / avg_odds
        skill = wr - be_wr
        clv_list = [p["clv"] for p in grp if p["clv"] is not None]
        avg_clv = sum(clv_list)/len(clv_list) if clv_list else None
        return dict(n=n, wins=wins, wr=round(wr,1), staked=round(staked,2),
                    pnl=round(pnl,2), roi=round(roi,1), avg_odds=round(avg_odds,2),
                    avg_edge=round(avg_edge,1), be_wr=round(be_wr,1),
                    skill=round(skill,1), avg_clv=round(avg_clv,1) if avg_clv else None)

    def _fmt(label, s, note=""):
        if not s: return ""
        icon = "🟢" if s["roi"] > 3 else ("🔴" if s["roi"] < -8 else "🟡")
        clv = f"{s['avg_clv']:+.1f}%" if s["avg_clv"] is not None else "N/A"
        return (f"{label}: N={s['n']}, WR={s['wr']}% (BE={s['be_wr']}%, Skill={s['skill']:+}%), "
                f"P&L={s['pnl']:+.2f}u, ROI={icon}{s['roi']:+.1f}%, ØQ={s['avg_odds']:.2f}, ØEdge={s['avg_edge']}%, CLV={clv}{note}")

    # Build quantitative breakdowns
    overall_30 = _grp_stats(rich_picks)
    
    market_types = ["MONEYLINE","HANDICAP_FAVE","HANDICAP_DOG","TOTAL_OVER","TOTAL_UNDER"]
    mkt_stats = {mt: _grp_stats([p for p in rich_picks if p["market_type"]==mt]) for mt in market_types}
    
    surface_mkt = {}
    for surf in ["hard","grass","clay"]:
        for mt in ["MONEYLINE","HANDICAP_FAVE","HANDICAP_DOG","TOTAL_OVER"]:
            k = f"{surf}|{mt}"
            surface_mkt[k] = _grp_stats([p for p in rich_picks if p["surface"]==surf and p["market_type"]==mt])
            
    edge_ranges = [(0,4),(4,5),(5,6),(6,7),(7,8),(8,10),(10,15),(15,100)]
    edge_cal = {f"{lo}-{hi}%": _grp_stats([p for p in rich_picks if lo <= p["edge"] < hi]) for lo,hi in edge_ranges}
    
    stake_brackets = ["<0.5u","0.5–0.9u","1.0–1.4u","1.5–1.9u","2.0u+"]
    stake_eff = {sb: _grp_stats([p for p in rich_picks if p["stake_bracket"]==sb]) for sb in stake_brackets}
    
    # 3-way breakdown
    three_way = {}
    for surf in ["hard","grass","clay"]:
        for tour_n in ["ATP","WTA"]:
            for mt in ["MONEYLINE","HANDICAP_FAVE","HANDICAP_DOG","TOTAL_OVER"]:
                grp = [p for p in rich_picks if p["surface"]==surf and p["tour"]==tour_n and p["market_type"]==mt]
                s = _grp_stats(grp)
                if s and s["n"] >= 3:
                    three_way[f"{surf}|{tour_n}|{mt}"] = s
                    
    # Handicap Line breakdown
    hc_records = [p for p in rich_picks if "HANDICAP" in p["market_type"] and p["hval"] is not None]
    hc_line_surf = {}
    line_labels = ["±1.5","±2.5","±3.5","±4.5","±6.5+"]
    def _hc_line_label(hval):
        ah = abs(hval)
        if ah <= 1.5: return "±1.5"
        elif ah <= 2.5: return "±2.5"
        elif ah <= 3.5: return "±3.5"
        elif ah <= 4.5: return "±4.5"
        return "±6.5+"
    for surf in ["hard","grass","clay"]:
        for ll in line_labels:
            grp = [p for p in hc_records if p["surface"]==surf and _hc_line_label(p["hval"])==ll]
            if grp:
                n=len(grp); wins=sum(1 for p in grp if p["is_win"])
                staked=sum(p["stake"] for p in grp); pnl=sum(p["profit"] for p in grp)
                roi=pnl/staked*100 if staked>0 else 0
                avg_line=sum(abs(p["hval"]) for p in grp)/n
                hc_line_surf[f"{surf}|{ll}"] = {"n":n,"wins":wins,"cov_pct":round(wins/n*100,1),
                    "pnl":round(pnl,2),"roi":round(roi,1),"avg_line":round(avg_line,1)}

    # Totals breakdown
    total_records = [p for p in rich_picks if p["market_type"]=="TOTAL_OVER" and p["hval"] is not None]
    total_line_surf = {}
    for surf in ["hard","grass"]:
        for tlb in ["<19.5","19.5–20.5","20.5–21.5","21.5–22.5","22.5–23.5","23.5+"]:
            grp = [p for p in total_records if p["surface"]==surf and p["total_line_bucket"]==tlb]
            if len(grp) >= 3:
                n=len(grp); wins=sum(1 for p in grp if p["is_win"])
                staked=sum(p["stake"] for p in grp); pnl=sum(p["profit"] for p in grp)
                roi=pnl/staked*100 if staked>0 else 0
                total_line_surf[f"{surf}|{tlb}"] = {"n":n,"hit_pct":round(wins/n*100,1),
                    "pnl":round(pnl,2),"roi":round(roi,1)}

    # Challenger vs Main Tour
    challenger_stats = {
        "Challenger": _grp_stats([p for p in rich_picks if p["is_challenger"]]),
        "Haupttour":  _grp_stats([p for p in rich_picks if not p["is_challenger"]]),
    }

    # 24H Micro-Audit (Settled in last 24h)
    now_utc = datetime.now(timezone.utc)
    cutoff_24h = now_utc - timedelta(hours=24)
    picks_24h = [p for p in rich_picks if p["created_at"] and datetime.fromisoformat(p["created_at"].replace("Z","+00:00")) >= cutoff_24h]
    picks_24h_stats = _grp_stats(picks_24h)

    # Build quantitative text representation for the AI
    def _section(title, data_dict):
        lines = [f"\n{title}:"]
        for k, s in data_dict.items():
            if s and s.get("n", 0) >= 3:
                lines.append(f"  {_fmt(k, s)}")
        return "\n".join(lines)

    analytics_text = f"""
OVERALL 30d PERFORMANCE:
{_fmt("Overall", overall_30)}

{_section("NACH MARKTTYP", mkt_stats)}

{_section("SURFACE × MARKTTYP", surface_mkt)}

{_section("SURFACE × TOUR × MARKTTYP (3-way)", three_way)}

{_section("EDGE KALIBRIERUNG", edge_cal)}

{_section("STAKE EFFIZIENZ", stake_eff)}

HANDICAP LINES × BELAG:
"""
    for k, v in hc_line_surf.items():
        if v and v.get("n", 0) >= 3:
            analytics_text += f"  {k}: N={v['n']}, Coverage={v['cov_pct']}%, P&L={v['pnl']:+.2f}u, ROI={v['roi']:+.1f}%, ØLine=±{v['avg_line']}\n"

    analytics_text += "\nTOTALS LINES × BELAG:\n"
    for k, v in total_line_surf.items():
        if v and v.get("n", 0) >= 3:
            analytics_text += f"  {k}: N={v['n']}, Hit={v['hit_pct']}%, P&L={v['pnl']:+.2f}u, ROI={v['roi']:+.1f}%\n"

    analytics_text += f"\nCHALLENGER vs HAUPTTOUR:\n"
    for k, s in challenger_stats.items():
        if s: analytics_text += f"  {_fmt(k, s)}\n"

    # Micro audit text
    micro_24h_text = f"\n24H MICRO-AUDIT ({len(picks_24h)} resolved picks last 24h):\n"
    if picks_24h:
        micro_24h_text += f"  {_fmt('24h Overall', picks_24h_stats)}\n"
        for idx, p in enumerate(picks_24h, 1):
            res_str = "WIN" if p["is_win"] else "LOSS"
            micro_24h_text += f"  {idx}. {p['pick_name']} | {p['market_type']} | {p['surface']} | @{p['odds']:.2f} | Edge {p['edge']:.1f}% | Stake {p['stake']:.1f}u | P&L {p['profit']:+.2f}u | {res_str}\n"
    else:
        micro_24h_text += "  Keine abgerechneten Picks in den letzten 24 Stunden.\n"

    # Fetch autopilot status
    autopilot_enabled = False
    try:
        res_auto = supabase.table("scout_rules").select("status").eq("description", "SYSTEM_AUTOPILOT").execute()
        if res_auto.data:
            autopilot_enabled = (res_auto.data[0].get("status") == "approved")
            log(f"🧠 Board Agent: Autopilot Active = {autopilot_enabled}")
    except Exception as e:
        log(f"⚠️ Error checking autopilot settings: {e}")

    # ═══════════════════════════════════════════════════════════════════════════
    # SYSTEM & USER PROMPT DRAFTING (Deep-Dive aligned)
    # ═══════════════════════════════════════════════════════════════════════════
    
    system_prompt = (
        "Du bist der Lead Quant Analyst und Risk Officer bei einem professionellen Tennis-Wettsyndikat.\n"
        "Deine Aufgabe ist es, die Performance der KI-Modell-Picks anhand detaillierter quantitativer Daten zu analysieren "
        "und hochgradig präzise Anpassungsregeln (Scout Rules) vorzuschlagen, um Verlustsegmente zu eliminieren und profitable Segmente abzusichern.\n\n"
        "Deine Denkweise entspricht exakt der eines professionellen Quants:\n"
        "1. **Edge-Kalibrierung:** Prüfe, ob die berechnete Edge der Modelle tatsächlich mit Gewinnraten korreliert. "
        "Wenn z.B. Monster-Edges (>15%) hohe Verluste aufweisen, liegt ein systemischer Bias vor, der über einen Multiplier (z.B. 0.1x) bestraft werden muss. "
        "Ist die Edge zu niedrig (<5.0%), führt sie oft zu negativem ROI - hier ist ein Odds-Filter (min_edge) ratsam.\n"
        "2. **Markttyp × Belag × Tour Breakdowns (3-Wege-Rauschen):** Suche nach strukturell unprofitablen Nischen. "
        "Beispiel: ATP/WTA Underdog Handicaps auf Hartplatz, bestimmte Over/Under-Linien auf Rasen.\n"
        "3. **Stake-Effizienz:** Überprüfe, ob die Modelle bei hohen Einsätzen (Max-Stakes) schlechter performen. "
        "Wenn ja, begrenze diese Spitzen durch eine Stake-Deckelung (Stake Cap).\n"
        "4. **24h Micro-Audit:** Ziehe kurzfristige Alarme in Betracht, wenn der Micro-Audit der letzten 24 Stunden extreme Abweichungen zeigt.\n\n"
        "Du musst als Antwort ein JSON-Array von Regelvorschlägen zurückgeben. Antworte AUSSCHLIESSLICH im angegebenen JSON-Format. "
        "Beschreibungen müssen prägnant auf Deutsch sein."
    )

    prompt = f"""
    Hier sind die aktuellen Performance-Daten der letzten 30 Tage und das 24h Micro-Audit:
    
    {analytics_text}
    
    {micro_24h_text}
    
    Generiere basierend auf diesen Daten neue sinnvolle Regelvorschläge (Scout Rules).
    Nutze dabei präzise Bedingungen in den 'conditions' Feldern.
    
    Unterstützte condition Keys in der Datenbank:
    - "surface": "clay" | "grass" | "hard"
    - "is_favorite": true | false
    - "is_challenger": true | false
    - "tour": "ATP" | "WTA"
    - "market_type": "moneyline" | "handicap_dog" | "handicap_fave" | "handicap" | "total_over" | "total_under" | "total"
    - "min_edge_above": float (z.B. 15.0 - feuert nur wenn Edge diesen Schwellenwert überschreitet)
    - "exact_line": float (z.B. 21.5 - feuert nur für diese exakte Over/Under-Linie)
    - "line_outside_range": [low, high] (z.B. [2.5, 3.5] - vetoed falls Handicap/Total-Linie außerhalb des Bereichs liegt)
    - "max_odds": float (z.B. 1.79 - feuert nur bei Quoten unter/gleich dem Schwellenwert)
    - "min_edge": float (z.B. 5.0 - Mindest-Edge für odds_filter)
    - "multiplier": float (z.B. 0.6 - Stake-Skalierungsfaktor für multiplier)
    
    Regeltypen:
    - "veto": Komplettes Verbot. Bedingungen müssen exakt zutreffen.
    - "multiplier": Stake-Skalierung. Benötigt "multiplier" in conditions.
    - "odds_filter": Erhöht Mindest-Edge. Benötigt "min_edge" in conditions.

    ANTWORTE NUR MIT EINEM VALIDEN JSON-ARRAY IM FOLGENDEN FORMAT:
    [
      {{
        "rule_type": "veto" | "multiplier" | "odds_filter",
        "description": "Taktische und statistische Begründung auf Deutsch.",
        "conditions": {{
           // Relevante Bedingungen hier eintragen
        }}
      }}
    ]
    """
    
    ai_res = await call_openrouter(prompt, system_prompt)
    if not ai_res:
        log("❌ Empty response from OpenRouter.")
        return
        
    try:
        arr_match = re.search(r'\[\s*\{.*\}\s*\]', ai_res, re.DOTALL)
        if arr_match:
            json_str = arr_match.group(0)
        else:
            json_str = ai_res.replace("json", "").replace("```", "").strip()
            
        proposals = json.loads(json_str)
        log(f"Parsed {len(proposals)} proposed rules from AI Analyst.")
        
        # Deduplicate and insert
        for prop in proposals:
            r_type = prop.get("rule_type")
            desc = prop.get("description", "Systemvorschlag zur Risikosteuerung.")
            conds = prop.get("conditions", {})
            
            if r_type not in ['veto', 'multiplier', 'odds_filter']:
                continue
                
            # ── Deduplication fingerprint ──
            all_existing = supabase.table("scout_rules").select("*").eq("rule_type", r_type).execute()
            conds_fingerprint = json.dumps(dict(sorted(conds.items())), sort_keys=True)
            is_duplicate = False
            for ex in (all_existing.data or []):
                ex_conds = ex.get("conditions") or {}
                ex_fingerprint = json.dumps(dict(sorted(ex_conds.items())), sort_keys=True)
                if ex_fingerprint == conds_fingerprint:
                    log(f"Rule with identical conditions already exists, skipping: {desc}")
                    is_duplicate = True
                    break
            if is_duplicate:
                continue
                
            # ── Stacking Guard ──
            if r_type == "multiplier":
                new_mult_keys = {k for k in conds if k != "multiplier"}
                for ex in (all_existing.data or []):
                    ex_conds = ex.get("conditions") or {}
                    ex_mult_keys = {k for k in ex_conds if k != "multiplier"}
                    if ex_mult_keys and ex_mult_keys.issubset(new_mult_keys):
                        log(f"Stacking multiplier conflict detected, skipping: {desc}")
                        is_duplicate = True
                        break
                if is_duplicate:
                    continue
                    
            confidence = round(min(0.95, max(0.10, abs(overall_30.get("roi", 0.0)) / 100.0)), 2)
            initial_status = "approved" if autopilot_enabled else "pending"
            
            supabase.table("scout_rules").insert({
                "rule_type": r_type,
                "description": desc,
                "conditions": conds,
                "confidence": confidence,
                "status": initial_status
            }).execute()
            
            status_lbl = "approved" if autopilot_enabled else "pending"
            log(f"✨ Proposed rule successfully saved ({status_lbl}): {desc}")
            
    except Exception as err:
        log(f"❌ Error parsing proposed rules JSON: {err}")
        log(f"Raw AI Response: {ai_res}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_analysis())
