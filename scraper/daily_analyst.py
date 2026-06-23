import os
import sys
import re
import json
import httpx
import math
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from supabase import create_client

sys.stdout.reconfigure(encoding='utf-8')

def compute_p_value(n_bets: int, avg_odds: float, roi: float) -> float:
    if n_bets <= 0 or avg_odds <= 1.0:
        return 1.0
    se = math.sqrt((avg_odds - 1.0) / n_bets)
    if se <= 0:
        return 1.0
    z = (roi / 100.0) / se
    if roi < 0:
        p = 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))
    else:
        p = 0.5 * (1.0 - math.erf(z / math.sqrt(2.0)))
    return round(p, 4)


# Supabase Credentials
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY or not OPENROUTER_API_KEY:
    print("WARNING: Missing environment variables (SUPABASE_URL, SUPABASE_KEY, OPENROUTER_API_KEY) in daily_analyst.")
    
supabase = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

MODEL_NAME = 'meta-llama/llama-3.3-70b-instruct'

def log(msg: str):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [AI Scout Analyst] {msg}")

# Parsing and helper functions (synchronized with scraper.py)
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
        if not actual_winner: return False
        p = pick.lower().strip()
        w = actual_winner.lower().strip()
        if p in w or w in p: return True
        w_words = w.split()
        w_last = w_words[-1] if w_words else ''
        if w_last and len(w_last) > 2 and w_last in p: return True
        return False

async def call_openrouter(prompt: str, system_prompt: str, model: str = MODEL_NAME, temp: float = 0.15) -> str:
    if not OPENROUTER_API_KEY:
        log("⚠️ OPENROUTER_API_KEY is missing. Skipping API call.")
        return ""
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://neuralscout.com",
        "X-Title": "NeuralScout AI Analyst"
    }
    
    # Models to try in order: primary model, gemini-2.5-flash, and auto-routing free models
    models_to_try = [model, "google/gemini-2.5-flash", "openrouter/free"]
    
    # Deduplicate while preserving order
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
                        log(f"✅ OpenRouter API call succeeded with model: {current_model}.")
                        return content
                else:
                    log(f"⚠️ OpenRouter Error with model {current_model}: HTTP {response.status_code} - Response: {response.text}")
            except Exception as e:
                log(f"⚠️ OpenRouter Exception with model {current_model}: {e}")
                
    log("❌ All models failed in OpenRouter API calls.")
    return ""

async def run_daily_analysis():
    if not supabase:
        log("❌ Supabase client is not initialized. Skipping daily analysis.")
        return

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Check if a report was already generated today
    try:
        check_res = supabase.table("scout_reports").select("id").eq("report_date", today_str).execute()
        if check_res.data:
            log(f"ℹ️ Daily report for {today_str} already exists. Skipping.")
            return
    except Exception as err:
        err_msg = str(err)
        if "relation" in err_msg or "does not exist" in err_msg or "PGRST204" in err_msg:
            log(f"⚠️ Table 'scout_reports' does not exist in database yet. Please run the migration '20260619001500_create_scout_reports.sql'.")
            return
        else:
            log(f"⚠️ Error checking daily report: {err}")
            return

    log(f"Starting daily settled picks analysis for {today_str}...")

    # Fetch settled picks from last 30 days
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    try:
        res = supabase.table("market_odds")\
            .select("player1_name, player2_name, odds1, odds2, opening_odds1, opening_odds2, ai_fair_odds1, ai_fair_odds2, actual_winner_name, score, created_at, tournament, ai_analysis_text")\
            .not_.is_("actual_winner_name", "null")\
            .gte("created_at", cutoff_date)\
            .execute()
        matches = res.data or []
    except Exception as e:
        log(f"❌ Error fetching matches for report: {e}")
        return

    log(f"Retrieved {len(matches)} settled matches from last 30 days.")
    
    settled_picks = []
    total_staked = 0.0
    net_profit = 0.0
    wins_count = 0
    losses_count = 0
    brier_sum = 0.0
    brier_count = 0

    for m in matches:
        text = m.get("ai_analysis_text")
        val_info = parse_value_from_text(text)
        if not val_info or not val_info.get("hasValue"):
            continue
            
        pick_name = val_info["pickName"]
        is_win = check_play_result(pick_name, m)
        odds = val_info["marketOdds"]
        stake = val_info["stake"]
        profit = stake * (odds - 1.0) if is_win else -stake
        
        total_staked += stake
        net_profit += profit
        if is_win:
            wins_count += 1
        else:
            losses_count += 1

        # Calculate Brier score for match winner (if fair probability exists)
        # Brier = (prob_fair - outcome)^2
        fair_odds = val_info.get("fairOdds", 0)
        if fair_odds > 1.0:
            prob_fair = 1.0 / fair_odds
            outcome_val = 1.0 if is_win else 0.0
            brier_sum += (prob_fair - outcome_val) ** 2
            brier_count += 1
            
        tournament = (m.get("tournament") or "").lower()
        surface = "hard"
        if "clay" in tournament or "sand" in tournament or "erde" in tournament or "terre" in tournament:
            surface = "clay"
        elif "grass" in tournament or "rasen" in tournament:
            surface = "grass"
            
        is_challenger = "challenger" in tournament or "itf" in tournament
        is_favorite = odds < 1.80
        tour = "WTA" if "WTA" in (m.get("tournament") or "").upper() else "ATP"
        
        settled_picks.append({
            "pick_name": pick_name,
            "surface": surface,
            "is_challenger": is_challenger,
            "is_favorite": is_favorite,
            "market_odds": odds,
            "stake": stake,
            "profit": profit,
            "tour": tour,
            "is_win": is_win,
            "created_at": m.get("created_at")
        })

    if not settled_picks:
        log("ℹ️ No settled AI picks found in the last 30 days. Creating empty report.")
        # Insert blank report
        try:
            supabase.table("scout_reports").insert({
                "report_date": today_str,
                "summary": "### Täglicher KI-Bericht\nEs wurden in den letzten 30 Tagen keine abgerechneten Wetten gefunden, um eine statistische Auswertung durchzuführen.",
                "metrics": {
                    "total_bets": 0,
                    "win_rate": 0.0,
                    "net_profit": 0.0,
                    "roi": 0.0,
                    "brier_score": 0.0
                }
            }).execute()
        except Exception as e:
            log(f"❌ Error inserting blank report: {e}")
        return

    win_rate = (wins_count / len(settled_picks)) * 100 if settled_picks else 0.0
    roi = (net_profit / total_staked) * 100 if total_staked > 0 else 0.0
    avg_brier = brier_sum / brier_count if brier_count > 0 else 0.0

    # Calculate metrics for last 24 hours (Micro/Ops Agent)
    today_picks = []
    now = datetime.now(timezone.utc)
    cutoff_24h = now - timedelta(hours=24)
    
    for p in settled_picks:
        if p.get("created_at"):
            try:
                p_dt = datetime.fromisoformat(p["created_at"].replace("Z", "+00:00"))
                if p_dt >= cutoff_24h:
                    today_picks.append(p)
            except Exception as ex:
                log(f"⚠️ Error parsing created_at timestamp: {ex}")

    today_bets = len(today_picks)
    today_wins = sum(1 for p in today_picks if p["is_win"])
    today_losses = today_bets - today_wins
    today_profit = sum(p["profit"] for p in today_picks)
    today_win_rate = (today_wins / today_bets) * 100 if today_bets > 0 else 0.0

    today_picks_summary = ""
    if today_picks:
        for idx, tp in enumerate(today_picks, 1):
            status = "GEWONNEN" if tp["is_win"] else "VERLOREN"
            today_picks_summary += f"{idx}. {tp['pick_name']} @ {tp['market_odds']} (Stake: {tp['stake']}u, Profit: {tp['profit']:+.2f}u) -> {status}\n"
    else:
        today_picks_summary = "Keine abgerechneten Wetten in den letzten 24 Stunden."

    log(f"Stats: Bets={len(settled_picks)}, WR={win_rate:.1f}%, Profit={net_profit:+.2f}u, ROI={roi:+.1f}%, Brier={avg_brier:.4f}")
    log(f"Today Stats: Bets={today_bets}, WR={today_win_rate:.1f}%, Profit={today_profit:+.2f}u")

    # ════════════════════════════════════════════════════════════════
    # DEEP PATTERN MINING  (mirrors the manual deep-dive analysis)
    # ════════════════════════════════════════════════════════════════
    import re as _re

    def _classify_pick(pname):
        """Returns (market_type, hval|line)"""
        lo = (pname or "").lower()
        if "over" in lo:
            m = _re.search(r"([\d.]+)", lo)
            return "TOTAL_OVER", float(m.group(1)) if m else None
        if "under" in lo:
            m = _re.search(r"([\d.]+)", lo)
            return "TOTAL_UNDER", float(m.group(1)) if m else None
        m = _re.search(r"([+\-])\s*([\d.]+)", pname or "")
        if m:
            sign = 1.0 if m.group(1) == "+" else -1.0
            v = sign * float(m.group(2))
            return ("HANDICAP_FAVE" if v < 0 else "HANDICAP_DOG"), v
        return "MONEYLINE", None

    def _odds_bracket(odds):
        if odds < 1.50: return "1.00–1.49"
        elif odds < 1.80: return "1.50–1.79"
        elif odds < 2.20: return "1.80–2.19"
        elif odds < 3.00: return "2.20–2.99"
        return "3.00+"

    def _edge_bracket(edge):
        if edge < 4: return "<4%"
        elif edge < 6: return "4–6%"
        elif edge < 8: return "6–8%"
        elif edge < 12: return "8–12%"
        return ">12%"

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

    # Enrich settled_picks with classification fields
    def _parse_pick_edge_from_text(text):
        """Extract edge% from ai_analysis_text — format: Edge: X.X%"""
        if not text: return None
        m = _re.search(r"Edge:\s*(-?[\d.]+)%", text, _re.IGNORECASE)
        return float(m.group(1)) if m else None

    for m_raw in matches:
        text = m_raw.get("ai_analysis_text", "")
        edge_raw = _parse_pick_edge_from_text(text)
        if edge_raw is not None:
            # attach to the matching settled pick via pick_name lookup
            pass  # enrichment done below when building rich_picks

    # Build rich picks by re-parsing all matches (30d)
    rich_picks = []
    for m_raw in matches:
        text = m_raw.get("ai_analysis_text", "")
        val = parse_value_from_text(text)
        if not val or not val.get("hasValue"): continue

        pick_name = val["pickName"]
        odds = val["marketOdds"]
        fair = val.get("fairOdds") or 0
        stake = val["stake"]
        edge = _parse_pick_edge_from_text(text)
        if edge is None and fair > 1.01 and odds > 1.01:
            edge = round(((1/fair) * odds - 1.0) * 100, 1)
        if edge is None: edge = 0.0

        is_win = check_play_result(pick_name, m_raw)
        profit = stake * (odds - 1.0) if is_win else -stake
        market_type, hval = _classify_pick(pick_name)
        clv = round((odds / fair - 1.0) * 100, 2) if (fair and fair > 1.01 and odds > 1.01) else None

        tournament = (m_raw.get("tournament") or "").lower()
        surface = "hard"
        if any(x in tournament for x in ["clay","sand","terre","tierra","erde"]): surface = "clay"
        elif any(x in tournament for x in ["grass","rasen","wimbledon","eastbourne","halle","nottingham","mallorca"]): surface = "grass"

        is_challenger = "challenger" in tournament or "itf" in tournament
        tour = "WTA" if "WTA" in (m_raw.get("tournament") or "").upper() else "ATP"
        is_fav = odds < 1.80
        created_at = m_raw.get("created_at","")
        dt = None
        try: dt = datetime.fromisoformat(created_at.replace("Z","+00:00"))
        except: pass

        rich_picks.append({
            "pick_name": pick_name, "market_type": market_type, "hval": hval,
            "odds": odds, "fair": fair, "edge": edge, "stake": stake,
            "profit": profit, "is_win": is_win, "clv": clv,
            "surface": surface, "tour": tour, "is_challenger": is_challenger,
            "is_fav": is_fav, "created_at": created_at, "dt": dt,
            "odds_bracket": _odds_bracket(odds),
            "edge_bracket": _edge_bracket(edge),
            "stake_bracket": _stake_bracket(stake),
            "total_line_bucket": _total_line_bucket(hval),
        })

    total_rich = len(rich_picks)
    log(f"Deep Mining: {total_rich} rich picks built for analysis.")

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
        skill_str = f"{s['skill']:+.1f}%"
        return (f"  {label}: N={s['n']}, WR={s['wr']}% (BE={s['be_wr']}%, Skill={skill_str}), "
                f"P&L={s['pnl']:+.2f}u, ROI={icon}{s['roi']:+.1f}%, ØQ={s['avg_odds']:.2f}, "
                f"ØEdge={s['avg_edge']}%, CLV={clv}{note}")

    # ─── A. Overall 30d ───────────────────────────────────────────────────────
    overall_30 = _grp_stats(rich_picks)

    # ─── B. Market type breakdown ─────────────────────────────────────────────
    market_types = ["MONEYLINE","HANDICAP_FAVE","HANDICAP_DOG","TOTAL_OVER","TOTAL_UNDER"]
    mkt_stats = {mt: _grp_stats([p for p in rich_picks if p["market_type"]==mt]) for mt in market_types}

    # ─── C. Surface × market type ─────────────────────────────────────────────
    surface_mkt = {}
    for surf in ["hard","grass","clay"]:
        for mt in ["MONEYLINE","HANDICAP_FAVE","HANDICAP_DOG","TOTAL_OVER"]:
            k = f"{surf}|{mt}"
            surface_mkt[k] = _grp_stats([p for p in rich_picks if p["surface"]==surf and p["market_type"]==mt])

    # ─── D. Edge calibration (does edge predict wins?) ───────────────────────
    edge_ranges = [(0,4),(4,5),(5,6),(6,7),(7,8),(8,10),(10,15),(15,100)]
    edge_cal = {}
    for lo,hi in edge_ranges:
        grp = [p for p in rich_picks if lo <= p["edge"] < hi]
        edge_cal[f"{lo}-{hi}%"] = _grp_stats(grp)

    # ─── E. Stake efficiency ──────────────────────────────────────────────────
    stake_brackets = ["<0.5u","0.5–0.9u","1.0–1.4u","1.5–1.9u","2.0u+"]
    stake_eff = {sb: _grp_stats([p for p in rich_picks if p["stake_bracket"]==sb]) for sb in stake_brackets}

    # ─── F. Handicap line × surface ───────────────────────────────────────────
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

    # ─── G. Total line × surface ──────────────────────────────────────────────
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

    # ─── H. Odds bracket × market type ───────────────────────────────────────
    odds_bkt_mkt = {}
    for mt in ["MONEYLINE","HANDICAP_FAVE","HANDICAP_DOG","TOTAL_OVER"]:
        for ob in ["1.00–1.49","1.50–1.79","1.80–2.19","2.20–2.99","3.00+"]:
            grp = [p for p in rich_picks if p["market_type"]==mt and p["odds_bracket"]==ob]
            s = _grp_stats(grp)
            if s and s["n"] >= 3:
                odds_bkt_mkt[f"{mt}|{ob}"] = s

    # ─── I. Surface × tour × market (3-way) ───────────────────────────────────
    three_way = {}
    for surf in ["hard","grass"]:
        for tour_n in ["ATP","WTA"]:
            for mt in ["MONEYLINE","HANDICAP_FAVE","HANDICAP_DOG","TOTAL_OVER"]:
                grp = [p for p in rich_picks if p["surface"]==surf and p["tour"]==tour_n and p["market_type"]==mt]
                s = _grp_stats(grp)
                if s and s["n"] >= 4:
                    three_way[f"{surf}|{tour_n}|{mt}"] = s

    # ─── J. Weekly trend ──────────────────────────────────────────────────────
    now_utc = datetime.now(timezone.utc)
    weekly_trend = {}
    for wk in range(4, -1, -1):
        ws = now_utc - timedelta(days=(wk+1)*7)
        we = now_utc - timedelta(days=wk*7)
        grp = [p for p in rich_picks if p["dt"] and ws <= p["dt"] < we]
        s = _grp_stats(grp)
        if s and s["n"] > 0:
            label = f"W-{wk} ({ws.strftime('%d.%m')}–{we.strftime('%d.%m')})"
            weekly_trend[label] = s

    # ─── K. Challenger vs Main tour ───────────────────────────────────────────
    challenger_stats = {
        "Challenger": _grp_stats([p for p in rich_picks if p["is_challenger"]]),
        "Haupttour":  _grp_stats([p for p in rich_picks if not p["is_challenger"]]),
    }

    # ─── L. 24h picks (micro-audit) ───────────────────────────────────────────
    cutoff_24h = now_utc - timedelta(hours=24)
    picks_24h = [p for p in rich_picks if p["dt"] and p["dt"] >= cutoff_24h]
    picks_24h_stats = _grp_stats(picks_24h)

    # ─── M. Identify critical findings (positives & negatives) ───────────────
    critical_good = []
    critical_bad = []
    for k, s in {**mkt_stats, **surface_mkt, **three_way, **odds_bkt_mkt}.items():
        if not s or s["n"] < 5: continue
        if s["roi"] > 15 and s["skill"] > 5:
            critical_good.append({"segment": k, **s})
        elif s["roi"] < -20:
            critical_bad.append({"segment": k, **s})

    critical_good.sort(key=lambda x: x["roi"], reverse=True)
    critical_bad.sort(key=lambda x: x["roi"])

    # ─── N. Build structured analytics text for LLM ───────────────────────────
    def _section(title, data_dict):
        lines = [f"\n{'='*50}", f"  {title}", f"{'='*50}"]
        for k, s in data_dict.items():
            if s and s.get("n",0) >= 3:
                row = _fmt(k, s)
                if row: lines.append(row)
        return "\n".join(lines)

    analytics_text = f"""
{'='*60}
DEEP PATTERN MINING — 30-TAGE ANALYSE ({total_rich} Picks)
{'='*60}
GESAMT-PERFORMANCE (30 Tage):
{_fmt("Overall", overall_30)}

Skill-Metrik-Erklärung: Skill = WR% minus Break-Even-WR bei dieser Quote.
Positiv = echter statistischer Edge. Negativ = Modell verliert gegen die Linie.

{_section("A. NACH MARKTTYP", mkt_stats)}

{_section("B. SURFACE × MARKTTYP", surface_mkt)}

{_section("C. SURFACE × TOUR × MARKTTYP (3-Wege)", three_way)}

{'='*50}
  D. EDGE-KALIBRIERUNG — Correliert Edge mit Ergebnis?
  (KRITISCH: 5-8% ist der Golden Sweet Spot)
{'='*50}
"""
    for k, s in edge_cal.items():
        if s and s["n"] >= 3:
            analytics_text += f"  Edge {k}: {_fmt('', s)}\n"

    analytics_text += f"""
{'='*50}
  E. STAKE-EFFIZIENZ — Wetten wir mehr auf bessere Picks?
{'='*50}
"""
    for k, s in stake_eff.items():
        if s and s["n"] >= 3:
            analytics_text += f"  {k}: {_fmt('', s)}\n"

    analytics_text += f"""
{'='*50}
  F. HANDICAP LINE × BELAG (Coverage & Margins)
{'='*50}
"""
    for k, v in hc_line_surf.items():
        if v and v.get("n",0) >= 3:
            icon = "✅" if v["roi"] > 3 else ("🔴" if v["roi"] < -10 else "🟡")
            analytics_text += f"  {k}: N={v['n']}, Coverage={v['cov_pct']}%, P&L={v['pnl']:+.2f}u, ROI={icon}{v['roi']:+.1f}%, ØLine=±{v['avg_line']}\n"

    analytics_text += f"""
{'='*50}
  G. TOTALS LINE × BELAG (Hit-Rate je Line-Bucket)
{'='*50}
"""
    for k, v in total_line_surf.items():
        if v and v.get("n",0) >= 3:
            icon = "✅" if v["roi"] > 3 else ("🔴" if v["roi"] < -10 else "🟡")
            analytics_text += f"  {k}: N={v['n']}, Hit={v['hit_pct']}%, P&L={v['pnl']:+.2f}u, ROI={icon}{v['roi']:+.1f}%\n"

    analytics_text += f"""
{'='*50}
  H. QUOTEN-BRACKET × MARKTTYP
{'='*50}
"""
    for k, s in odds_bkt_mkt.items():
        if s and s["n"] >= 4:
            analytics_text += f"  {k}: {_fmt('', s)}\n"

    analytics_text += f"""
{'='*50}
  I. WÖCHENTLICHER TREND
{'='*50}
"""
    for k, s in weekly_trend.items():
        if s:
            icon = "🟢" if s["roi"] > 3 else ("🔴" if s["roi"] < -8 else "🟡")
            analytics_text += f"  {k}: N={s['n']}, WR={s['wr']}%, P&L={s['pnl']:+.2f}u, ROI={icon}{s['roi']:+.1f}%, ØEdge={s['avg_edge']}%\n"

    analytics_text += f"""
{'='*50}
  J. CHALLENGER vs. HAUPTTOUR
{'='*50}
"""
    for k, s in challenger_stats.items():
        if s and s["n"] >= 3:
            analytics_text += f"  {k}: {_fmt('', s)}\n"

    # ─── Top/Bottom segments ──────────────────────────────────────────────────
    analytics_text += f"\n{'='*50}\n  K. BESTE SEGMENTE (ROI > 15%, N ≥ 5)\n{'='*50}\n"
    for seg in critical_good[:6]:
        analytics_text += f"  ✅ {seg['segment']}: ROI={seg['roi']:+.1f}%, Skill={seg['skill']:+.1f}%, N={seg['n']}, P&L={seg['pnl']:+.2f}u\n"
    analytics_text += f"\n{'='*50}\n  L. SCHLECHTESTE SEGMENTE (ROI < -20%, N ≥ 5)\n{'='*50}\n"
    for seg in critical_bad[:6]:
        analytics_text += f"  🔴 {seg['segment']}: ROI={seg['roi']:+.1f}%, Skill={seg['skill']:+.1f}%, N={seg['n']}, P&L={seg['pnl']:+.2f}u\n"

    # ─── 24h Micro-Audit ─────────────────────────────────────────────────────
    micro_24h_text = f"\n{'='*60}\n24H MICRO-AUDIT ({len(picks_24h)} Picks in den letzten 24 Stunden)\n{'='*60}\n"
    if picks_24h:
        micro_24h_text += f"Gesamt: {_fmt('24h Overall', picks_24h_stats)}\n\n"
        for idx, p in enumerate(picks_24h, 1):
            status = "✅ WIN" if p["is_win"] else "❌ LOSS"
            pick_type = p["market_type"].replace("_"," ")
            micro_24h_text += (
                f"{idx}. {p['pick_name']} | {pick_type} | {p['surface'].title()} | "
                f"@{p['odds']:.2f} | Edge {p['edge']:.1f}% | Stake {p['stake']:.1f}u | "
                f"P&L {p['profit']:+.2f}u | CLV {p['clv']:+.1f}%\n" if p['clv'] else
                f"{idx}. {p['pick_name']} | {pick_type} | {p['surface'].title()} | "
                f"@{p['odds']:.2f} | Edge {p['edge']:.1f}% | Stake {p['stake']:.1f}u | "
                f"P&L {p['profit']:+.2f}u | {status}\n"
            )
        micro_24h_text += f"\nMarket-Breakdown 24h:\n"
        for mt in ["MONEYLINE","HANDICAP_FAVE","HANDICAP_DOG","TOTAL_OVER"]:
            g24 = [p for p in picks_24h if p["market_type"]==mt]
            s24 = _grp_stats(g24)
            if s24 and s24["n"]>0:
                micro_24h_text += f"  {mt}: {_fmt('', s24)}\n"
    else:
        micro_24h_text += "Keine abgerechneten Picks in den letzten 24 Stunden.\n"

    # ─── SELF-HEALING / RULE RECOVERY ─────────────────────────────────────────
    all_rules = []
    rule_recommendations = []
    autopilot_enabled = False
    max_veto_percentage = 35.0
    drawdown_limit = 15.0
    autopilot_rule = None
    drawdown_triggered = False
    recent_profit_48h = 0.0

    if supabase:
        try:
            res_rules = supabase.table("scout_rules").select("*").execute()
            all_rules = res_rules.data or []
            log(f"🧠 AI Agent: Loaded {len(all_rules)} rules for recovery and re-evaluation.")
            autopilot_rule = next((r for r in all_rules if r.get("description") == "SYSTEM_AUTOPILOT"), None)
            if autopilot_rule:
                autopilot_enabled = (autopilot_rule.get("status") == "approved")
                conds = autopilot_rule.get("conditions") or {}
                max_veto_percentage = conds.get("max_veto_percentage", 35.0)
                drawdown_limit = conds.get("drawdown_limit_units", 15.0)
                log(f"🧠 Board Agent: Loaded SYSTEM_AUTOPILOT. Enabled={autopilot_enabled}, MaxVeto={max_veto_percentage}%, DrawdownLimit={drawdown_limit}u")
            else:
                seed_data = {"rule_type": "veto", "description": "SYSTEM_AUTOPILOT",
                    "status": "rejected", "conditions": {"max_veto_percentage": 35.0, "drawdown_limit_units": 15.0}, "confidence": 1.0}
                res_insert = supabase.table("scout_rules").insert(seed_data).execute()
                if res_insert.data:
                    autopilot_rule = res_insert.data[0]
                    all_rules.append(autopilot_rule)
                log("🧠 Board Agent: Seeded SYSTEM_AUTOPILOT settings row in database.")
        except Exception as e:
            log(f"⚠️ Error loading/seeding SYSTEM_AUTOPILOT settings: {e}")

    # 48h drawdown circuit breaker
    for p in rich_picks:
        if p["dt"] and p["dt"] >= (now_utc - timedelta(hours=48)):
            recent_profit_48h += p["profit"]
    log(f"🧠 Board Agent: 48h Portfolio Net Profit = {recent_profit_48h:+.2f} units (Limit = -{drawdown_limit} units)")
    if recent_profit_48h <= -drawdown_limit:
        drawdown_triggered = True
        log(f"🚨 EMERGENCY SHUTDOWN: 48h Drawdown Limit exceeded ({recent_profit_48h:+.2f}u <= -{drawdown_limit}u)!")
        if autopilot_enabled:
            autopilot_enabled = False
            if supabase and autopilot_rule:
                try:
                    supabase.table("scout_rules").update({"status": "rejected", "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", autopilot_rule["id"]).execute()
                    log("🚨 Autopilot has been AUTOMATICALLY DISABLED due to emergency drawdown circuit breaker.")
                except Exception as e:
                    log(f"⚠️ Error disabling autopilot in database: {e}")

    # Rule evaluation vs. rich_picks
    def _matches_rule_conditions(pick, conditions):
        if "surface" in conditions:
            if conditions["surface"].lower() != pick["surface"].lower(): return False
        if "is_favorite" in conditions:
            if conditions["is_favorite"] != pick["is_fav"]: return False
        if "is_challenger" in conditions:
            if conditions["is_challenger"] != pick["is_challenger"]: return False
        if "tour" in conditions:
            if conditions["tour"].upper() != pick["tour"].upper(): return False
        if "market_type" in conditions:
            req_mt = conditions["market_type"].lower()
            cand_mt = pick["market_type"].lower()
            if req_mt == "handicap" and "handicap" not in cand_mt: return False
            elif req_mt == "total" and "total" not in cand_mt: return False
            elif req_mt not in ("handicap","total") and req_mt != cand_mt: return False
        if "max_stake_cap" in conditions:
            if pick["stake"] <= float(conditions["max_stake_cap"]): return False
        return True

    for rule in all_rules:
        conds = rule.get("conditions") or {}
        desc = rule.get("description", "")
        rule_id = rule.get("id")
        rule_status = rule.get("status", "pending")
        if desc == "SYSTEM_AUTOPILOT": continue

        matching_picks = [p for p in rich_picks if _matches_rule_conditions(p, conds)]
        mc = len(matching_picks)
        recommended_status = None; action_type = None; reason = None
        roi_val = 0.0; profit_val = 0.0; p_val = 1.0

        if mc >= 8:
            avg_odds_r = sum(p["odds"] for p in matching_picks) / mc
            ts = sum(p["stake"] for p in matching_picks)
            np_r = sum(p["profit"] for p in matching_picks)
            profit_val = np_r
            roi_val = (np_r / ts) * 100 if ts > 0 else 0.0
            p_val = compute_p_value(mc, avg_odds_r, roi_val)

            if rule_status == "approved" and roi_val > 5.0 and p_val < 0.05:
                recommended_status = "rejected"; action_type = "deactivate"
                reason = f"Segment erholt sich signifikant (ROI: {roi_val:+.1f}%, p={p_val})."
            elif rule_status == "rejected" and roi_val < -15.0 and p_val < 0.05:
                recommended_status = "approved"; action_type = "reactivate"
                reason = f"Segment verliert erneut signifikant (ROI: {roi_val:+.1f}%, p={p_val})."
            elif rule_status == "pending":
                if roi_val < -15.0 and p_val < 0.05:
                    recommended_status = "approved"; action_type = "approve"
                    reason = f"Vorschlag bestätigt sich (ROI: {roi_val:+.1f}%, p={p_val})."
                elif roi_val > 5.0 and p_val < 0.05:
                    recommended_status = "rejected"; action_type = "reject"
                    reason = f"Segment profitabel, Vorschlag hinfällig (ROI: {roi_val:+.1f}%, p={p_val})."

        if recommended_status and action_type:
            auto_executed = False
            if autopilot_enabled and supabase:
                try:
                    supabase.table("scout_rules").update({"status": recommended_status, "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", rule_id).execute()
                    auto_executed = True
                    log(f"⚡ Autopilot Auto-Executed: Changed '{desc}' to {recommended_status} ({action_type}).")
                except Exception as db_err:
                    log(f"⚠️ Autopilot error: {db_err}")
            rule_recommendations.append({"rule_id": rule_id, "description": desc, "current_status": rule_status,
                "recommended_status": recommended_status, "action_type": action_type, "bets": mc,
                "roi": round(roi_val,1), "profit": round(profit_val,2), "p_value": p_val,
                "auto_executed": auto_executed, "reason": reason})

    drawdown_warning_md = ""
    if drawdown_triggered:
        drawdown_warning_md = (f"\n> 🚨 **SYSTEM-ALARM:** 48h Drawdown = {recent_profit_48h:+.2f}u (Limit: -{drawdown_limit}u). Autopilot DEAKTIVIERT.\n\n")

    rules_eval_summary = drawdown_warning_md
    if rule_recommendations:
        for rec in rule_recommendations:
            exec_lbl = "⚡ [AUTO]" if rec["auto_executed"] else "⏳ [EMPFEHLUNG]"
            rules_eval_summary += f"\n{exec_lbl} {rec['action_type'].upper()}: '{rec['description']}'\n  N={rec['bets']}, ROI={rec['roi']:+.1f}%, p={rec['p_value']}, Grund: {rec['reason']}\n"
    else:
        rules_eval_summary += "Keine Statusänderungen empfohlen.\n"

    # ─── LLM PROMPT ───────────────────────────────────────────────────────────
    system_prompt = (
        "Du bist ein Multi-Agent AI Reporting System bei einem Elite-Sports-Betting-Syndicate. "
        "Dein System hat DREI spezialisierte Agenten:\n"
        "1. **Deep Pattern Mining Agent (30 Tage):** Analysiert alle statistischen Dimensionen identisch zu einem professionellen Quant-Analysten: "
        "Edge-Kalibrierung (correliert Edge mit echten Ergebnissen?), Skill-Metrik (WR minus Break-Even-WR), "
        "Markttyp × Surface × Tour × Odds-Bracket Breakdowns, Stake-Effizienz, Handicap-Line-Coverage und Totals-Line-Buckets. "
        "Findet sowohl profitable Segmente (ROI > 15%) als auch Verlust-Segmente (ROI < -20%).\n"
        "2. **24H Micro-Audit Agent:** Analysiert jeden einzelnen Pick der letzten 24 Stunden mit Market-Type-Breakdown.\n"
        "3. **Syndicate Board & Risk Officer Agent:** Wertet Regelperformance aus, überwacht Drawdown-Circuit-Breaker, "
        "schlägt neue präzise Scout-Rules vor (mit conditions: surface, market_type, is_favorite, min_edge, line ranges).\n"
        "Schreibe auf Deutsch. Klar, präzise, analytisch. Apple/Revolut-Stil. Sei direkt und faktenbezogen."
    )

    prompt = f"""
    Du hast folgende umfangreiche quantitative Daten:

    {analytics_text}

    {micro_24h_text}

    BOARD AUDIT & REGEL-EVALUIERUNG:
    {rules_eval_summary}

    Autopilot Status: {"Aktiviert" if autopilot_enabled else "Deaktiviert / Manueller Modus"}
    Sicherheitsgrenzen: Max-Veto: {max_veto_percentage}%, 48h Drawdown Limit: -{drawdown_limit}u
    
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

    ANTWORTE NUR MIT EINEM VALIDEN JSON-ARRAY NACH DEM REPTORTEXT, FORMATIERT ALS 'PROPOSALS_JSON:':
    PROPOSALS_JSON:
    [
      {{
        "rule_type": "odds_filter" | "multiplier" | "veto",
        "description": "Präzise Begründung auf Deutsch.",
        "conditions": {{
          "surface": "clay",
          "is_favorite": false,
          "is_challenger": true,
          "tour": "ATP",
          "market_type": "handicap_dog",
          "min_edge": 6.5
        }}
      }}
    ]
    """
    
    ai_response = await call_openrouter(prompt, system_prompt)
    if not ai_response:
        log("❌ OpenRouter returned empty response. Saving metrics only.")
        ai_response = "### Täglicher KI-Bericht\nAnalyse konnte aufgrund eines API-Fehlers nicht vollständig generiert werden."

    # Parse rules proposed by AI
    proposals = []
    clean_summary = ai_response
    if "PROPOSALS_JSON:" in ai_response:
        try:
            parts = ai_response.split("PROPOSALS_JSON:")
            clean_summary = parts[0].strip()
            json_str = parts[1].strip()
            # extract first array match in case of extra markdown wrapping
            arr_match = re.search(r'\[\s*\{.*\}\s*\]', json_str, re.DOTALL)
            if arr_match:
                json_str = arr_match.group(0)
            proposals = json.loads(json_str)
        except Exception as parse_err:
            log(f"⚠️ Error parsing proposed rules: {parse_err}")

    # Write report entry
    report_data = {
        "report_date": today_str,
        "summary": clean_summary,
        "metrics": {
            "total_bets": len(settled_picks),
            "win_rate": round(win_rate, 1),
            "net_profit": round(net_profit, 2),
            "roi": round(roi, 1),
            "brier_score": round(avg_brier, 4),
            "breakdown": metrics_breakdown,
            "rule_recommendations": rule_recommendations,
            "today": {
                "bets": today_bets,
                "win_rate": round(today_win_rate, 1),
                "profit": round(today_profit, 2),
                "wins": today_wins,
                "losses": today_losses,
                "picks": [
                    {
                        "pick_name": p["pick_name"],
                        "market_odds": p["market_odds"],
                        "stake": p["stake"],
                        "profit": p["profit"],
                        "is_win": p["is_win"]
                    } for p in today_picks
                ]
            }
        }
    }
    
    try:
        supabase.table("scout_reports").insert(report_data).execute()
        log(f"✅ Daily report saved for {today_str}.")
    except Exception as e:
        log(f"❌ Error saving daily report in db: {e}")

    # Insert proposed rules into scout_rules as pending
    for prop in proposals:
        r_type = prop.get("rule_type")
        desc = prop.get("description", "Systemvorschlag zur Risikoanpassung.")
        conds = prop.get("conditions", {})
        
        if r_type not in ['veto', 'multiplier', 'odds_filter']:
            continue
            
        try:
            # ── Deduplication: check by conditions fingerprint, NOT description ──
            # The LLM often generates different descriptions for functionally identical rules.
            # We compare the serialized conditions dict to detect semantic duplicates.
            all_existing = supabase.table("scout_rules").select("*").eq("rule_type", r_type).execute()
            conds_fingerprint = json.dumps(dict(sorted(conds.items())), sort_keys=True)
            is_duplicate = False
            for ex in (all_existing.data or []):
                ex_conds = ex.get("conditions") or {}
                ex_fingerprint = json.dumps(dict(sorted(ex_conds.items())), sort_keys=True)
                if ex_fingerprint == conds_fingerprint:
                    log(f"Rule with identical conditions already exists (id={ex['id']}), skipping insertion.")
                    is_duplicate = True
                    break
            if is_duplicate:
                continue

            # ── Stacking guard: reject multiplier if a broader one already covers this scope ──
            if r_type == "multiplier":
                new_mult_keys = {k for k in conds if k != "multiplier"}
                for ex in (all_existing.data or []):
                    ex_conds = ex.get("conditions") or {}
                    ex_mult_keys = {k for k in ex_conds if k != "multiplier"}
                    # A broader rule (fewer condition keys) fires on all matches this new rule
                    # would affect. Both together would stack and multiply stakes unintentionally.
                    if ex_mult_keys and ex_mult_keys.issubset(new_mult_keys):
                        log(f"Stacking multiplier conflict detected: existing rule {ex['id']} already covers this scope. Skipping new rule.")
                        is_duplicate = True
                        break
                if is_duplicate:
                    continue
                
            # Confidence based on ROI
            confidence = round(min(0.95, max(0.10, abs(roi) / 100.0)), 2)
            
            initial_status = "approved" if autopilot_enabled else "pending"
            supabase.table("scout_rules").insert({
                "rule_type": r_type,
                "description": desc,
                "conditions": conds,
                "confidence": confidence,
                "status": initial_status
            }).execute()
            status_label = "auto-approved" if autopilot_enabled else "pending"
            log(f"✨ Proposed rule inserted ({status_label}): {desc}")
        except Exception as e:
            log(f"⚠️ Error saving proposed rule: {e}")

    log("✅ Daily analysis completed.")

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_daily_analysis())
