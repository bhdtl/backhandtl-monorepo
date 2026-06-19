import os
import sys

# Inject environment variables before importing
os.environ["SUPABASE_URL"] = "https://suoaznisiowoolxilaju.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b2F6bmlzaW93b29seGlsYWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3MDA2MiwiZXhwIjoyMDgxNzMwMDYyfQ.qcOEsflvc9zJnT5ir-SYe2YhoNczDDS11be5TzLyxEo"
os.environ["OPENROUTER_API_KEY"] = "sk-or-v1-mock-key-for-testing"

# Add scraper path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../scraper")))
from daily_analyst import parse_value_from_text, check_play_result

import asyncio
from datetime import datetime, timezone, timedelta
from supabase import create_client

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

async def test_recovery_logic():
    print("1. Fetching settled matches from last 30 days...")
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    res = supabase.table("market_odds")\
        .select("player1_name, player2_name, odds1, odds2, opening_odds1, opening_odds2, ai_fair_odds1, ai_fair_odds2, actual_winner_name, score, created_at, tournament, ai_analysis_text")\
        .not_.is_("actual_winner_name", "null")\
        .gte("created_at", cutoff_date)\
        .execute()
    matches = res.data or []
    print(f"Total matches fetched: {len(matches)}")
    
    # Reconstruct actual settled picks (actually bet in production)
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
            "is_win": is_win
        })
        
    print(f"Total actual settled picks reconstructed: {len(settled_picks)}")

    # Helper to check rule match
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

    # Reconstruct shadow picks
    print("2. Reconstructing shadow picks...")
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

    print(f"Total reconstructed shadow picks: {len(all_shadow_picks)}")
    
    # Print subgroup performance for analysis
    print("\n--- Subgroup Performance (Actual Settled Picks) ---")
    subgroups = ["surface:hard", "surface:clay", "surface:grass", "tour:ATP", "tour:WTA", "fav", "dog", "challenger", "regular"]
    subgroup_metrics = {}
    for sub in subgroups:
        # Match condition
        conds = {}
        if "surface:" in sub:
            conds["surface"] = sub.split(":")[1]
        elif "tour:" in sub:
            conds["tour"] = sub.split(":")[1]
        elif sub == "fav":
            conds["is_favorite"] = True
        elif sub == "dog":
            conds["is_favorite"] = False
        elif sub == "challenger":
            conds["is_challenger"] = True
        elif sub == "regular":
            conds["is_challenger"] = False
            
        matching_actual = [p for p in settled_picks if matches_rule_conditions(p, conds)]
        matching_shadow = [p for p in all_shadow_picks if matches_rule_conditions(p, conds)]
        
        act_staked = sum(p["stake"] for p in matching_actual)
        act_profit = sum(p["profit"] for p in matching_actual)
        act_roi = (act_profit / act_staked) * 100 if act_staked > 0 else 0.0
        
        sh_staked = sum(p["stake"] for p in matching_shadow)
        sh_profit = sum(p["profit"] for p in matching_shadow)
        sh_roi = (sh_profit / sh_staked) * 100 if sh_staked > 0 else 0.0
        
        subgroup_metrics[sub] = {"actual": {"bets": len(matching_actual), "roi": act_roi}, "shadow": {"bets": len(matching_shadow), "roi": sh_roi}}
        print(f"Subgroup {sub:12} | Actual Bets: {len(matching_actual):3} (ROI: {act_roi:+6.1f}%) | Shadow Bets: {len(matching_shadow):3} (ROI: {sh_roi:+6.1f}%)")

    # Try fetching rules from database
    print("\n3. Fetching all rules from DB...")
    db_rules = []
    try:
        res_rules = supabase.table("scout_rules").select("*").execute()
        db_rules = res_rules.data or []
        print(f"DB total rules count: {len(db_rules)}")
    except Exception as e:
        print("DB rules load error:", e)

    # Let's dynamically construct mock rules to test the branches!
    print("Injecting dynamic mock rules to test all status transitions...")
    # Find a subgroup with positive shadow ROI to test approved -> rejected (deactivate)
    pos_shadow_sub = None
    for sub, met in subgroup_metrics.items():
        if met["shadow"]["bets"] >= 5 and met["shadow"]["roi"] > 5.0:
            pos_shadow_sub = sub
            break
    if pos_shadow_sub:
        conds = {}
        if "surface:" in pos_shadow_sub: conds["surface"] = pos_shadow_sub.split(":")[1]
        elif "tour:" in pos_shadow_sub: conds["tour"] = pos_shadow_sub.split(":")[1]
        elif pos_shadow_sub == "fav": conds["is_favorite"] = True
        elif pos_shadow_sub == "dog": conds["is_favorite"] = False
        db_rules.append({
            "id": f"mock-approved-deactivate-{pos_shadow_sub}",
            "description": f"Mock Rule for {pos_shadow_sub} (Approved -> should deactivate)",
            "conditions": conds,
            "status": "approved"
        })

    # Find a subgroup with negative actual ROI to test rejected -> approved (reactivate)
    neg_actual_sub = None
    for sub, met in subgroup_metrics.items():
        if met["actual"]["bets"] >= 5 and met["actual"]["roi"] < -15.0:
            neg_actual_sub = sub
            break
    if neg_actual_sub:
        conds = {}
        if "surface:" in neg_actual_sub: conds["surface"] = neg_actual_sub.split(":")[1]
        elif "tour:" in neg_actual_sub: conds["tour"] = neg_actual_sub.split(":")[1]
        elif neg_actual_sub == "fav": conds["is_favorite"] = True
        elif neg_actual_sub == "dog": conds["is_favorite"] = False
        db_rules.append({
            "id": f"mock-rejected-reactivate-{neg_actual_sub}",
            "description": f"Mock Rule for {neg_actual_sub} (Rejected -> should reactivate)",
            "conditions": conds,
            "status": "rejected"
        })
        db_rules.append({
            "id": f"mock-pending-approve-{neg_actual_sub}",
            "description": f"Mock Rule for {neg_actual_sub} (Pending -> should approve)",
            "conditions": conds,
            "status": "pending"
        })

    # Find a subgroup with positive actual ROI to test pending -> rejected (reject)
    pos_actual_sub = None
    for sub, met in subgroup_metrics.items():
        if met["actual"]["bets"] >= 5 and met["actual"]["roi"] > 5.0:
            pos_actual_sub = sub
            break
    if pos_actual_sub:
        conds = {}
        if "surface:" in pos_actual_sub: conds["surface"] = pos_actual_sub.split(":")[1]
        elif "tour:" in pos_actual_sub: conds["tour"] = pos_actual_sub.split(":")[1]
        elif pos_actual_sub == "fav": conds["is_favorite"] = True
        elif pos_actual_sub == "dog": conds["is_favorite"] = False
        db_rules.append({
            "id": f"mock-pending-reject-{pos_actual_sub}",
            "description": f"Mock Rule for {pos_actual_sub} (Pending -> should reject)",
            "conditions": conds,
            "status": "pending"
        })

    print("4. Calculating performance for rules...")
    rule_recommendations = []
    for rule in db_rules:
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
                
                print(f"Rule [APPROVED]: '{desc}' -> Shadow bets: {len(matching_picks)}, Staked: {total_staked:.1f}u, Profit: {net_profit:+.2f}u, ROI: {roi:+.1f}%")
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
            else:
                print(f"Rule [APPROVED]: '{desc}' -> Shadow bets: {len(matching_picks)} (insufficient for re-evaluation)")
        else:
            # Inactive (rejected) or pending rules: compare against actual settled picks
            matching_picks = [p for p in settled_picks if matches_rule_conditions(p, conds)]
            if len(matching_picks) >= 5:
                total_staked = sum(p["stake"] for p in matching_picks)
                net_profit = sum(p["profit"] for p in matching_picks)
                roi = (net_profit / total_staked) * 100 if total_staked > 0 else 0.0
                
                print(f"Rule [{rule_status.upper()}]: '{desc}' -> Real bets: {len(matching_picks)}, Staked: {total_staked:.1f}u, Profit: {net_profit:+.2f}u, ROI: {roi:+.1f}%")
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
            else:
                print(f"Rule [{rule_status.upper()}]: '{desc}' -> Real bets: {len(matching_picks)} (insufficient for re-evaluation)")

    print(f"\nRule Recommendations count: {len(rule_recommendations)}")
    for rec in rule_recommendations:
        print(f"  * ACTION RECOMMENDED: {rec['action_type'].upper()} '{rec['description']}' ({rec['current_status']} -> {rec['recommended_status']}) -> ROI: {rec['roi']:+.1f}% over {rec['bets']} bets. Reason: {rec['reason']}")

if __name__ == "__main__":
    asyncio.run(test_recovery_logic())
