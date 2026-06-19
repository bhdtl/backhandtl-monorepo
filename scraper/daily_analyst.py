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
        return ""
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://neuralscout.com",
        "X-Title": "NeuralScout AI Analyst"
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": temp
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=payload, timeout=60.0)
            if response.status_code != 200:
                return ""
            return response.json()['choices'][0]['message']['content']
        except Exception as e:
            log(f"⚠️ OpenRouter Error: {e}")
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

    # Grouping calculations for analysis
    subgroups = defaultdict(list)
    for p in settled_picks:
        subgroups["overall"].append(p)
        subgroups[f"surface:{p['surface']}"].append(p)
        subgroups[f"tour:{p['tour']}"].append(p)
        subgroups[f"odds_bracket:{'fav' if p['is_favorite'] else 'dog'}"].append(p)
        subgroups[f"challenger:{'challenger' if p['is_challenger'] else 'regular'}"].append(p)

    metrics_breakdown = {}
    failures = []
    
    for sub_name, picks in subgroups.items():
        sub_staked = sum(p["stake"] for p in picks)
        sub_profit = sum(p["profit"] for p in picks)
        sub_roi = (sub_profit / sub_staked) * 100 if sub_staked > 0 else 0.0
        sub_wins = sum(1 for p in picks if p["is_win"])
        sub_wr = (sub_wins / len(picks)) * 100
        
        metrics_breakdown[sub_name] = {
            "bets": len(picks),
            "win_rate": round(sub_wr, 1),
            "profit": round(sub_profit, 2),
            "roi": round(sub_roi, 1)
        }

        # Check for underperforming subgroups (ROI < -15% and at least 5 bets)
        if sub_roi < -15.0 and len(picks) >= 5 and sub_name != "overall":
            failures.append({
                "name": sub_name,
                "bets": len(picks),
                "profit": sub_profit,
                "roi": sub_roi
            })

    # === SELF-HEALING / RULE RECOVERY CYCLE ===
    all_rules = []
    rule_recommendations = []
    if supabase:
        try:
            res_rules = supabase.table("scout_rules").select("*").execute()
            all_rules = res_rules.data or []
            log(f"🧠 AI Agent: Loaded {len(all_rules)} rules for recovery and re-evaluation.")
        except Exception as e:
            log(f"⚠️ Error fetching rules for re-evaluation: {e}")

    if all_rules:
        # Helper to check if a pick matches the conditions of a rule
        def matches_rule_conditions(pick, conditions):
            if "surface" in conditions:
                rule_surf = conditions["surface"].lower().strip()
                cand_surf = pick["surface"].lower().strip()
                if rule_surf != cand_surf:
                    return False
            if "is_favorite" in conditions:
                if conditions["is_favorite"] != pick["is_favorite"]:
                    return False
            if "is_challenger" in conditions:
                if conditions["is_challenger"] != pick["is_challenger"]:
                    return False
            if "tour" in conditions:
                rule_tour = conditions["tour"].upper().strip()
                if rule_tour != pick["tour"].upper().strip():
                    return False
            return True

        # Helper to compute shadow picks
        def run_shadow_kelly(fair_odds, market_odds, opening_odds, surface, is_favorite, is_challenger, tour, player_name, actual_winner):
            if not fair_odds or not market_odds or fair_odds <= 1.01 or market_odds <= 1.01:
                return None
            
            fair_prob = 1.0 / fair_odds
            raw_edge = (fair_prob * market_odds) - 1.0
            actual_edge = raw_edge * 0.40
            edge_percent = round(actual_edge * 100, 1)
            
            if edge_percent > 12.0:
                return None
                
            if opening_odds and opening_odds > 1.01:
                drop_pct = (opening_odds - market_odds) / opening_odds
                if drop_pct > 0.10:
                    return None
                    
            min_edge = 0.015 if market_odds < 1.80 else 0.040
            if actual_edge < min_edge:
                return None
                
            is_win = False
            if actual_winner and player_name:
                p_clean = player_name.lower().strip()
                w_clean = actual_winner.lower().strip()
                is_win = (p_clean in w_clean) or (w_clean in p_clean)
                
            full_kelly = actual_edge / (market_odds - 1.0) if market_odds > 1.0 else 0.0
            raw_stake = (full_kelly * 100) * 0.15
            stake = round(min(5.0, max(0.1, raw_stake)), 1)
            profit = stake * (market_odds - 1.0) if is_win else -stake
            
            return {
                "player_name": player_name,
                "surface": surface,
                "is_favorite": is_favorite,
                "is_challenger": is_challenger,
                "tour": tour,
                "market_odds": market_odds,
                "stake": stake,
                "profit": profit,
                "is_win": is_win
            }

        # Reconstruct shadow picks for all matches in the last 30 days
        all_shadow_picks = []
        for m in matches:
            tournament = (m.get("tournament") or "").lower()
            surface = "hard"
            if "clay" in tournament or "sand" in tournament or "erde" in tournament or "terre" in tournament:
                surface = "clay"
            elif "grass" in tournament or "rasen" in tournament:
                surface = "grass"
                
            is_challenger = "challenger" in tournament or "itf" in tournament
            tour = "WTA" if "WTA" in (m.get("tournament") or "").upper() else "ATP"
            winner_name = m.get("actual_winner_name")
            
            p1_name = m.get("player1_name")
            p2_name = m.get("player2_name")
            
            # P1
            p1_shadow = run_shadow_kelly(
                fair_odds=m.get("ai_fair_odds1"),
                market_odds=m.get("odds1"),
                opening_odds=m.get("opening_odds1"),
                surface=surface,
                is_favorite=m.get("odds1", 2.0) < 1.80,
                is_challenger=is_challenger,
                tour=tour,
                player_name=p1_name,
                actual_winner=winner_name
            )
            if p1_shadow:
                all_shadow_picks.append(p1_shadow)
                
            # P2
            p2_shadow = run_shadow_kelly(
                fair_odds=m.get("ai_fair_odds2"),
                market_odds=m.get("odds2"),
                opening_odds=m.get("opening_odds2"),
                surface=surface,
                is_favorite=m.get("odds2", 2.0) < 1.80,
                is_challenger=is_challenger,
                tour=tour,
                player_name=p2_name,
                actual_winner=winner_name
            )
            if p2_shadow:
                all_shadow_picks.append(p2_shadow)

        # Check recovery/reactivation/decisions for all rules
        for rule in all_rules:
            conds = rule.get("conditions") or {}
            desc = rule.get("description", "")
            rule_id = rule.get("id")
            rule_status = rule.get("status", "pending")
            
            if rule_status == "approved":
                # Active rules: compare against shadow picks (what would have been bet)
                matching_picks = [p for p in all_shadow_picks if matches_rule_conditions(p, conds)]
                if len(matching_picks) >= 5:
                    total_staked = sum(p["stake"] for p in matching_picks)
                    net_profit = sum(p["profit"] for p in matching_picks)
                    roi = (net_profit / total_staked) * 100 if total_staked > 0 else 0.0
                    
                    if roi > 5.0:
                        rule_recommendations.append({
                            "rule_id": rule_id,
                            "description": desc,
                            "current_status": rule_status,
                            "recommended_status": "rejected",
                            "action_type": "deactivate",
                            "bets": len(matching_picks),
                            "roi": round(roi, 1),
                            "profit": round(net_profit, 2),
                            "reason": "Schatten-Performance hat sich erholt (positive Rendite)."
                        })
                        log(f"🩹 Recovery Candidate (Deactivate): '{desc}' (ROI: {roi:.1f}% over {len(matching_picks)} bets)")
            else:
                # Inactive (rejected) or pending rules: compare against actual settled picks
                matching_picks = [p for p in settled_picks if matches_rule_conditions(p, conds)]
                if len(matching_picks) >= 5:
                    total_staked = sum(p["stake"] for p in matching_picks)
                    net_profit = sum(p["profit"] for p in matching_picks)
                    roi = (net_profit / total_staked) * 100 if total_staked > 0 else 0.0
                    
                    if rule_status == "rejected" and roi < -15.0:
                        rule_recommendations.append({
                            "rule_id": rule_id,
                            "description": desc,
                            "current_status": rule_status,
                            "recommended_status": "approved",
                            "action_type": "reactivate",
                            "bets": len(matching_picks),
                            "roi": round(roi, 1),
                            "profit": round(net_profit, 2),
                            "reason": "Subgruppe verliert wieder signifikant (negative Rendite)."
                        })
                        log(f"🩹 Reactivation Candidate (Reactivate): '{desc}' (ROI: {roi:.1f}% over {len(matching_picks)} bets)")
                    elif rule_status == "pending":
                        if roi < -15.0:
                            rule_recommendations.append({
                                "rule_id": rule_id,
                                "description": desc,
                                "current_status": rule_status,
                                "recommended_status": "approved",
                                "action_type": "approve",
                                "bets": len(matching_picks),
                                "roi": round(roi, 1),
                                "profit": round(net_profit, 2),
                                "reason": "Ausstehender Vorschlag bestätigt sich durch anhaltende Verluste."
                            })
                            log(f"🩹 Pending Candidate (Approve): '{desc}' (ROI: {roi:.1f}% over {len(matching_picks)} bets)")
                        elif roi > 5.0:
                            rule_recommendations.append({
                                "rule_id": rule_id,
                                "description": desc,
                                "current_status": rule_status,
                                "recommended_status": "rejected",
                                "action_type": "reject",
                                "bets": len(matching_picks),
                                "roi": round(roi, 1),
                                "profit": round(net_profit, 2),
                                "reason": "Ausstehender Vorschlag hinfällig (Subgruppe ist profitabel)."
                            })
                            log(f"🩹 Pending Candidate (Reject): '{desc}' (ROI: {roi:.1f}% over {len(matching_picks)} bets)")

    rules_evaluation_summary = ""
    if rule_recommendations:
        deactivates = [r for r in rule_recommendations if r["action_type"] == "deactivate"]
        reactivates = [r for r in rule_recommendations if r["action_type"] == "reactivate"]
        approves = [r for r in rule_recommendations if r["action_type"] == "approve"]
        rejects = [r for r in rule_recommendations if r["action_type"] == "reject"]
        
        if deactivates:
            rules_evaluation_summary += "--- VORSCHLÄGE ZUR DEAKTIVIERUNG (Approved -> Rejected) ---\n"
            for idx, r in enumerate(deactivates, 1):
                rules_evaluation_summary += f"{idx}. {r['description']} (ID: {r['rule_id']})\n   - Schatten-Bets: {r['bets']} | Schatten-ROI: {r['roi']:+.1f}% | Schatten-Profit: {r['profit']:+.2f}u\n   - Grund: {r['reason']}\n"
        
        if reactivates:
            rules_evaluation_summary += "\n--- VORSCHLÄGE ZUR REAKTIVIERUNG (Rejected -> Approved) ---\n"
            for idx, r in enumerate(reactivates, 1):
                rules_evaluation_summary += f"{idx}. {r['description']} (ID: {r['rule_id']})\n   - Real-Bets: {r['bets']} | Real-ROI: {r['roi']:+.1f}% | Real-Profit: {r['profit']:+.2f}u\n   - Grund: {r['reason']}\n"
                
        if approves:
            rules_evaluation_summary += "\n--- ANNAHME AUSSTEHENDER VORSCHLÄGE (Pending -> Approved) ---\n"
            for idx, r in enumerate(approves, 1):
                rules_evaluation_summary += f"{idx}. {r['description']} (ID: {r['rule_id']})\n   - Real-Bets: {r['bets']} | Real-ROI: {r['roi']:+.1f}% | Real-Profit: {r['profit']:+.2f}u\n   - Grund: {r['reason']}\n"
                
        if rejects:
            rules_evaluation_summary += "\n--- ABLEHNUNG AUSSTEHENDER VORSCHLÄGE (Pending -> Rejected) ---\n"
            for idx, r in enumerate(rejects, 1):
                rules_evaluation_summary += f"{idx}. {r['description']} (ID: {r['rule_id']})\n   - Real-Bets: {r['bets']} | Real-ROI: {r['roi']:+.1f}% | Real-Profit: {r['profit']:+.2f}u\n   - Grund: {r['reason']}\n"
    else:
        rules_evaluation_summary = "Aktuell keine Statusänderungen für bestehende Regeln empfohlen."

    # Call OpenRouter for Report Summary & Proposals
    system_prompt = (
        "You are a Multi-Agent AI Reporting System at an elite sports betting syndicate. "
        "Your system has three distinct agents:\n"
        "1. Daily Operations Analyst (Micro-Perspective): Reviews only the picks and results of the last 24 hours.\n"
        "2. Macro Risk & Calibration Strategist (Macro-Perspective): Reviews the 30-day statistical performance and subgroups to calibrate the system and manage risk.\n"
        "3. Self-Healing Agent (Rule Recovery & Re-evaluation): Analyzes the shadow/actual performance of rules and recommends changing their status (activating/deactivating/deciding).\n"
        "Write an executive-level German report. Use clean markdown structure, Apple/Revolut clarity, and plain bold headers/bullet points. "
        "Keep it extremely analytical and direct."
    )
    
    prompt = f"""
    Hier sind die Daten für unsere Tennis-KI:
    
    =========================================
    1. HEUTIGE ERGEBNISSE (Letzte 24 Stunden) - Für den Daily Operations Analyst:
    - Anzahl Wetten: {today_bets}
    - Trefferquote: {today_win_rate:.1f}% ({today_wins}W - {today_losses}L)
    - Netto-Gewinn: {today_profit:+.2f} Units
    
    Einzelspiele von heute:
    {today_picks_summary}
    
    =========================================
    2. HISTORISCHE PERFORMANCE (Letzte 30 Tage) - Für den Macro Risk Strategist:
    - Gesamtzahl Wetten: {len(settled_picks)}
    - Trefferquote: {win_rate:.1f}% ({wins_count}W - {losses_count}L)
    - Reingewinn: {net_profit:+.2f} Units
    - ROI/Yield: {roi:.1f}%
    - Brier-Score (KI-Kalibrierung): {avg_brier:.4f} (Je näher an 0, desto besser. >0.25 ist schlechter als Zufall)
    
    Subgruppen-Ergebnisse:
    {json.dumps(metrics_breakdown, indent=2)}
    
    Identifizierte Schwachstellen (ROI < -15%):
    {json.dumps(failures, indent=2)}
    
    =========================================
    3. REGEL-EVALUIERUNG & STATUS-VORSCHLÄGE (Self-Healing Agent):
    {rules_evaluation_summary}
    
    Bitte erstelle einen strukturierten Bericht auf Deutsch im Apple/Revolut-Stil mit folgenden Sektionen:
    
    ### 📊 Sektion 1: Daily Operations Audit (Micro Ops Agent)
    - Ein kurzer Rückblick auf die Ergebnisse der letzten 24 Stunden (1-2 prägnante Sätze).
    - Details zu den heutigen Wetten (Auffälligkeiten, glückliche/unglückliche Verläufe, Chokes).
    
    ### ⚙️ Sektion 2: Strategische Risiko- & Kalibrierungs-Analyse (Macro Risk Strategist)
    - Eine detaillierte Auswertung des 30-Tage-Trends und der Subgruppen. Warum verlieren/gewinnen bestimmte Beläge (Rasen/Sand) oder Klassen (WTA/ATP, Challenger vs. Haupttour)?
    - Empfehlungen zur Kalibrierung des Scrapers (Vorschlag von Vetoes, Einsatzdämpfern per Multiplier oder Mindest-Edge-Verschiebungen).
    
    ### 🩹 Sektion 3: Regel-Re-Evaluierung & Self-Healing (Self-Healing Agent)
    - Wenn Regeln in '3. REGEL-EVALUIERUNG & STATUS-VORSCHLÄGE' gelistet sind, analysiere die Performance. Erkläre in 1-2 Sätzen auf Deutsch, warum sich diese Subgruppe erholt hat (Schatten-ROI positiv) oder wieder verliert (Real-ROI negativ), und empfiehle explizit die vorgeschlagene Statusänderung (Approved -> Rejected oder Rejected -> Approved oder Pending -> Approved/Rejected) im CMS.
    - Falls keine Änderungen empfohlen werden, schreibe einfach: 'Aktuell keine Statusänderungen für bestehende Regeln empfohlen.'
    
    Gibt es Vorschläge für NEUE Regeln, formuliere sie am Ende des Berichts als JSON-Array im Format:
    PROPOSALS_JSON:
    [
      {{
        "rule_type": "odds_filter" oder "multiplier" oder "veto",
        "description": "Präzise Begründung auf Deutsch.",
        "conditions": {{
          "surface": "clay" (falls zutreffend),
          "is_favorite": false (falls zutreffend),
          "is_challenger": true (falls zutreffend),
          "tour": "ATP" (falls zutreffend),
          "min_edge": 6.5 (nur falls odds_filter, empfohlen 5.5 bis 7.0),
          "multiplier": 0.5 (nur falls multiplier)
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
            # Check duplicate description
            dupe = supabase.table("scout_rules").select("id").eq("description", desc).execute()
            if dupe.data:
                continue
                
            # Confidence based on ROI
            confidence = round(min(0.95, max(0.10, abs(roi) / 100.0)), 2)
            
            supabase.table("scout_rules").insert({
                "rule_type": r_type,
                "description": desc,
                "conditions": conds,
                "confidence": confidence,
                "status": "pending"
            }).execute()
            log(f"✨ Proposed pending rule inserted: {desc}")
        except Exception as e:
            log(f"⚠️ Error saving proposed rule: {e}")

    log("✅ Daily analysis completed.")

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_daily_analysis())
