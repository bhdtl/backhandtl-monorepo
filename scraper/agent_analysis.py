import os
import sys
import re
import json
import httpx
import time
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from supabase import create_client

sys.stdout.reconfigure(encoding='utf-8')

# Supabase Credentials
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY or not OPENROUTER_API_KEY:
    print("FATAL: Missing environment variables (SUPABASE_URL, SUPABASE_KEY, OPENROUTER_API_KEY).")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
MODEL_NAME = 'meta-llama/llama-3.3-70b-instruct'

def log(msg: str):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}")

# ═══════════════════════════════════════════════════════════════════════════
# PARSING AND RESULT CHECKING (Synchronized with scraper.py)
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

# ═══════════════════════════════════════════════════════════════════════════
# OPENROUTER PROMPT DRAFTING
# ═══════════════════════════════════════════════════════════════════════════
async def call_openrouter(prompt: str, model: str = MODEL_NAME, temp: float = 0.15) -> str:
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
    
    system_prompt = (
        "You are the Neural Scout AI Ops Analyst. Analyze historical tennis betting failures. "
        "You MUST reply ONLY with a single valid JSON object containing the rule proposal. "
        "Make sure the description is in German, analytical, and professional."
    )
    
    async with httpx.AsyncClient() as client:
        for current_model in models_to_try:
            log(f"Calling OpenRouter with model: {current_model}...")
            payload = {
                "model": current_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "temperature": temp, 
                "response_format": {"type": "json_object"}
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

# ═══════════════════════════════════════════════════════════════════════════
# MAIN WORKFLOW
# ═══════════════════════════════════════════════════════════════════════════
async def run_analysis():
    log("📊 AI Scout Analyst starting yield analysis...")
    
    # 1. Fetch settled matches from last 30 days
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    try:
        res = supabase.table("market_odds")\
            .select("player1_name, player2_name, odds1, odds2, actual_winner_name, score, created_at, tournament, ai_analysis_text")\
            .not_.is_("actual_winner_name", "null")\
            .gte("created_at", cutoff_date)\
            .execute()
        matches = res.data or []
    except Exception as e:
        log(f"❌ Supabase Fetch Error: {e}")
        return
        
    log(f"Loaded {len(matches)} settled matches from the last 30 days.")
    
    # 2. Parse picks and outcomes
    settled_picks = []
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
        
        # Determine features
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
            "tour": tour
        })
        
    log(f"Extracted {len(settled_picks)} settled AI picks.")
    if len(settled_picks) < 10:
        log("⚠️ Insufficient settled picks volume in last 30 days to perform pattern mining.")
        return

    # 3. Analyze subgroups
    subgroups = defaultdict(list)
    for p in settled_picks:
        # Define combinations
        keys = [
            ("overall", "overall"),
            ("surface", p["surface"]),
            ("surface_odds", f"{p['surface']}_{'fav' if p['is_favorite'] else 'dog'}"),
            ("tour_surface", f"{p['tour']}_{p['surface']}"),
            ("challenger_odds", f"{'challenger' if p['is_challenger'] else 'regular'}_{'fav' if p['is_favorite'] else 'dog'}"),
            ("surface_challenger", f"{p['surface']}_{'challenger' if p['is_challenger'] else 'regular'}"),
            ("odds_bracket", "fav" if p["is_favorite"] else "dog"),
            ("challenger", "challenger" if p["is_challenger"] else "regular")
        ]
        for category, val in keys:
            subgroups[f"{category}:{val}"].append(p)
            
    # Check if autopilot is active
    autopilot_enabled = False
    try:
        res_auto = supabase.table("scout_rules").select("status").eq("description", "SYSTEM_AUTOPILOT").execute()
        if res_auto.data:
            autopilot_enabled = (res_auto.data[0].get("status") == "approved")
            log(f"🧠 Board Agent: Loaded SYSTEM_AUTOPILOT. Enabled={autopilot_enabled}")
    except Exception as e:
        log(f"⚠️ Error checking autopilot settings: {e}")

    # 4. Filter failure subgroups
    failures = []
    for sub_name, picks in subgroups.items():
        total_bets = len(picks)
        if total_bets < 8:  # Minimum bet volume for a pattern
            continue
            
        total_staked = sum(p["stake"] for p in picks)
        net_profit = sum(p["profit"] for p in picks)
        yield_pct = net_profit / total_staked if total_staked > 0 else 0.0
        
        if yield_pct < -0.15:  # Losing heavily (worse than -15% ROI)
            category, value = sub_name.split(":")
            failures.append({
                "category": category,
                "value": value,
                "total_bets": total_bets,
                "net_profit": net_profit,
                "yield_pct": yield_pct
            })
            
    log(f"Identified {len(failures)} failure pattern candidates.")
    
    # 5. Process each candidate failure through AI agent
    for f in failures:
        log(f"Drafting rule for failure: {f['category']} = {f['value']} (Bets: {f['total_bets']}, ROI: {f['yield_pct']:.1%})")
        
        # Build prompt
        prompt = f"""
        We have discovered a statistically significant betting failure subgroup in our Tennis AI Scout predictions over the last 30 days:
        - Subgroup Category: {f['category']}
        - Subgroup Value: {f['value']}
        - Number of Bets: {f['total_bets']}
        - Net Return: {f['net_profit']:.2f} units
        - yield/ROI: {f['yield_pct']:.1%}
        
        Based on tennis tactical analysis (e.g. rally tolerance on clay, court speed on hard/grass, variance in challenger/ITF circuits, underdogs vs favorites), explain why this failure pattern is happening in a professional German summary (2-3 sentences).
        
        Decide on a professional syndicate-level calibration rule:
        1. "odds_filter": If the yield is between -15% and -25% and represents high-variance betting (e.g. ATP underdogs, hard court dogs), propose raising the minimum value edge required to trade this subgroup. Propose a "min_edge" between 5.5% and 7.0% (instead of the standard 4.0%).
        2. "multiplier": Propose scaling down the stakes (e.g., multiplier between 0.3 and 0.6) to mitigate downside variance while keeping the system active in this segment.
        3. "veto": Complete skip. Propose this ONLY if the yield is worse than -25% and represents a structural breakdown that cannot be rescued by raising the edge threshold.
        
        WARNING: If you select "veto", you MUST NOT include "min_edge" in the conditions. Veto rules skip the entire subgroup unconditionally. If you want to specify a minimum edge threshold, you MUST use "odds_filter" as the rule_type.
        
        Generate the appropriate JSON rule configuration matching these conditions:
        - Valid conditions keys: "surface" (clay/grass/hard), "is_favorite" (true/false), "is_challenger" (true/false), "tour" (ATP/WTA).
        
        OUTPUT JSON TEMPLATE:
        {{
            "description": "Taktische Begründung und quantitative Empfehlung auf Deutsch.",
            "rule_type": "odds_filter" or "multiplier" or "veto",
            "conditions": {{
                "surface": "clay" (include only if relevant),
                "is_favorite": false (include only if relevant),
                "is_challenger": true (include only if relevant),
                "tour": "ATP" (include only if relevant),
                "min_edge": 6.0 (include only if rule_type is 'odds_filter', recommended 5.5 to 7.0),
                "multiplier": 0.5 (include only if rule_type is 'multiplier')
            }}
        }}
        """
        
        ai_res = await call_openrouter(prompt)
        if not ai_res:
            continue
            
        try:
            cleaned = ai_res.replace("json", "").replace("```", "").strip()
            data = json.loads(cleaned)
            
            rule_type = data.get("rule_type", "veto")
            desc = data.get("description", "Veto pattern matches due to poor historical ROI.")
            conds = data.get("conditions", {})
            
            # Simple deduplication check
            existing = supabase.table("scout_rules").select("*").eq("description", desc).execute()
            if existing.data:
                log("Rule already exists in database, skipping insertion.")
                continue
                
            confidence = round(float(-f["yield_pct"] * min(1.0, f["total_bets"] / 20.0)), 2)
            
            initial_status = "approved" if autopilot_enabled else "pending"
            # Insert rule
            supabase.table("scout_rules").insert({
                "rule_type": rule_type,
                "description": desc,
                "conditions": conds,
                "confidence": confidence,
                "status": initial_status
            }).execute()
            
            status_label = "auto-approved" if autopilot_enabled else "pending"
            log(f"Successfully created {status_label} rule: {desc}")
            
        except Exception as err:
            log(f"⚠️ Error parsing or inserting rule: {err}")
            continue

    log("✅ Analysis cycle completed.")

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_analysis())
