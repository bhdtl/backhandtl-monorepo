import os
import sys
import asyncio
import re
from datetime import datetime, timezone

# Add scraper path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../scraper")))

# Supabase Credentials
os.environ["SUPABASE_URL"] = "https://suoaznisiowoolxilaju.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b2F6bmlzaW93b29seGlsYWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3MDA2MiwiZXhwIjoyMDgxNzMwMDYyfQ.qcOEsflvc9zJnT5ir-SYe2YhoNczDDS11be5TzLyxEo"
os.environ["OPENROUTER_API_KEY"] = "mock-key-for-testing"

from supabase import create_client
supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

import scraper
from scraper import (
    calculate_value_metrics, 
    find_player_smart, 
    find_best_court_match_smart,
    fetch_player_history_extended
)

async def fix_picks():
    print("=== Supabase Value Picks DB Migration Fix ===")
    
    # 1. Load active rules excluding SYSTEM_AUTOPILOT
    res_rules = supabase.table("scout_rules").select("*").eq("status", "approved").execute()
    all_rules = res_rules.data or []
    filtered_rules = [r for r in all_rules if r.get("description") != "SYSTEM_AUTOPILOT"]
    print(f"Loaded {len(all_rules)} approved rules.")
    print(f"Filtered to {len(filtered_rules)} rules (excluding SYSTEM_AUTOPILOT).")
    
    # Set global rules in imported scraper module
    scraper.GLOBAL_ACTIVE_RULES = filtered_rules
    
    # 2. Get db data
    from scraper import get_db_data
    print("Loading player & court metadata...")
    players, all_skills, all_reports, all_tournaments = await get_db_data()
    report_ids = {r['player_id'] for r in all_reports if isinstance(r, dict) and r.get('player_id')}
    
    # 3. Get upcoming matches
    cutoff = "2026-06-19T22:00:00Z"
    res_matches = supabase.table("market_odds").select("*").gte("match_time", cutoff).order("match_time").execute()
    matches = res_matches.data or []
    print(f"Fetched {len(matches)} upcoming matches to analyze.")
    
    updated_count = 0
    
    for m in matches:
        match_id = m.get("id")
        p1_name = m.get("player1_name")
        p2_name = m.get("player2_name")
        tour = m.get("tournament")
        m_time = m.get("match_time")
        
        fair1 = m.get("ai_fair_odds1")
        fair2 = m.get("ai_fair_odds2")
        odds1 = m.get("odds1")
        odds2 = m.get("odds2")
        ai_text = m.get("ai_analysis_text") or ""
        sim_result = m.get("games_prediction") or {}
        
        if not fair1 or not fair2 or fair1 <= 1.01 or fair2 <= 1.01:
            # Skip matches that were shadow-tracked at the start
            continue
            
        p1_obj = find_player_smart(p1_name, players, report_ids)
        p2_obj = find_player_smart(p2_name, players, report_ids)
        
        if not p1_obj or not p2_obj:
            continue
            
        c1_country = p1_obj.get('country', 'Unknown')
        c2_country = p2_obj.get('country', 'Unknown')
        
        surf, bsi, notes, city, matched_tour = await find_best_court_match_smart(
            tour or "", all_tournaments, p1_name, p2_name, c1_country, c2_country
        )
        
        p1_history = await fetch_player_history_extended(p1_name, limit=20)
        p2_history = await fetch_player_history_extended(p2_name, limit=20)
        
        # Get ELO safely
        from scraper import SurfaceIntelligence
        elo_surf = SurfaceIntelligence.normalize_surface_key(surf)
        s1 = all_skills.get(p1_obj['id'], {})
        s2 = all_skills.get(p2_obj['id'], {})
        elo_metrics1 = s1.get('elo_metrics') or {}
        elo_metrics2 = s2.get('elo_metrics') or {}
        
        if isinstance(elo_metrics1, str):
            try: elo_metrics1 = json.loads(elo_metrics1)
            except: elo_metrics1 = {}
        if isinstance(elo_metrics2, str):
            try: elo_metrics2 = json.loads(elo_metrics2)
            except: elo_metrics2 = {}
            
        elo1 = elo_metrics1.get(elo_surf, 1500)
        elo2 = elo_metrics2.get(elo_surf, 1500)
        
        if isinstance(elo1, dict): elo1 = elo1.get("rating", 1500)
        if isinstance(elo2, dict): elo2 = elo2.get("rating", 1500)
        
        try:
            elo1 = float(elo1) if elo1 is not None else 1500.0
            elo2 = float(elo2) if elo2 is not None else 1500.0
        except:
            elo1, elo2 = 1500.0, 1500.0
            
        _slam_kw = {"australian open", "roland garros", "french open", "wimbledon", "us open"}
        _is_slam = any(kw in (matched_tour or "").lower() for kw in _slam_kw)
        
        op_o1 = m.get("opening_odds1")
        op_o2 = m.get("opening_odds2")
        
        # Recalculate value metrics for both players
        val_p1 = calculate_value_metrics(
            1/fair1, odds1, matched_tour, 1.0, surface=surf, 
            is_favorite=(odds1 <= odds2), is_slam=_is_slam, 
            trading_type=m.get('trading_type', 'PreMatch'), 
            player_name=p1_name, opponent_name=p2_name, 
            player_elo=elo1, opponent_elo=elo2, 
            player_history=p1_history, opponent_history=p2_history, 
            players_list=players, all_skills=all_skills, opening_odds=op_o1
        )
        
        val_p2 = calculate_value_metrics(
            1/fair2, odds2, matched_tour, 1.0, surface=surf, 
            is_favorite=(odds2 <= odds1), is_slam=_is_slam, 
            trading_type=m.get('trading_type', 'PreMatch'), 
            player_name=p2_name, opponent_name=p1_name, 
            player_elo=elo2, opponent_elo=elo1, 
            player_history=p2_history, opponent_history=p1_history, 
            players_list=players, all_skills=all_skills, opening_odds=op_o2
        )
        
        candidate_picks = []
        # Add winner choices
        candidate_picks.append({
            "market_type": "WINNER",
            "pick_name": p1_name,
            "market_odds": odds1,
            "fair_odds": fair1,
            "value_metrics": val_p1,
            "betslip": {
                "contestId": m.get('api_match_key'),
                "bettingTypeKey": "Set_MATCH_HC2W(0.0)",
                "outcomeKey": "1"
            }
        })
        candidate_picks.append({
            "market_type": "WINNER",
            "pick_name": p2_name,
            "market_odds": odds2,
            "fair_odds": fair2,
            "value_metrics": val_p2,
            "betslip": {
                "contestId": m.get('api_match_key'),
                "bettingTypeKey": "Set_MATCH_HC2W(0.0)",
                "outcomeKey": "2"
            }
        })
        
        # Evaluate totals and spreads if they exist
        # Add spreads
        for sp in m.get("neobet_spreads", []):
            hc = sp["handicap"]
            # Let's mock a simple check
            val_h = calculate_value_metrics(0.5, sp["odds1"], matched_tour, 1.0, surface=surf, is_favorite=True)
            val_a = calculate_value_metrics(0.5, sp["odds2"], matched_tour, 1.0, surface=surf, is_favorite=True)
            candidate_picks.append({
                "market_type": "HANDICAP",
                "pick_name": f"{p1_name} {'+' if hc > 0 else ''}{hc} Games",
                "market_odds": sp["odds1"],
                "fair_odds": 2.0,
                "value_metrics": val_h,
                "betslip": {"contestId": m.get('api_match_key'), "bettingTypeKey": sp["market_key"], "outcomeKey": sp["key1"]}
            })
            candidate_picks.append({
                "market_type": "HANDICAP",
                "pick_name": f"{p2_name} {'+' if -hc > 0 else ''}{-hc} Games",
                "market_odds": sp["odds2"],
                "fair_odds": 2.0,
                "value_metrics": val_a,
                "betslip": {"contestId": m.get('api_match_key'), "bettingTypeKey": sp["market_key"], "outcomeKey": sp["key2"]}
            })
            
        # Add totals
        for ou in m.get("neobet_over_unders", []):
            boundary = ou["boundary"]
            val_o = calculate_value_metrics(0.5, ou["over"], matched_tour, 1.0, surface=surf, is_favorite=True)
            val_u = calculate_value_metrics(0.5, ou["under"], matched_tour, 1.0, surface=surf, is_favorite=True)
            candidate_picks.append({
                "market_type": "TOTALS",
                "pick_name": f"Over {boundary} Games",
                "market_odds": ou["over"],
                "fair_odds": 2.0,
                "value_metrics": val_o,
                "betslip": {"contestId": m.get('api_match_key'), "bettingTypeKey": ou["market_key"], "outcomeKey": ou["key_over"]}
            })
            candidate_picks.append({
                "market_type": "TOTALS",
                "pick_name": f"Under {boundary} Games",
                "market_odds": ou["under"],
                "fair_odds": 2.0,
                "value_metrics": val_u,
                "betslip": {"contestId": m.get('api_match_key'), "bettingTypeKey": ou["market_key"], "outcomeKey": ou["key_under"]}
            })
            
        # Filter is_value
        value_picks = [c for c in candidate_picks if c["value_metrics"]["is_value"]]
        value_picks.sort(key=lambda x: x["value_metrics"]["edge_percent"] * x["value_metrics"].get("pattern_multiplier", 1.0), reverse=True)
        
        value_tag = ""
        best_betslip = None
        main_bet_type = "WINNER"
        
        if value_picks:
            best_pick = value_picks[0]
            best_val = best_pick["value_metrics"]
            value_tag = f"\n\n[{best_val['type']}: {best_pick['pick_name']} @ {best_pick['market_odds']} | Fair: {best_pick['fair_odds']} | Edge: {best_val['edge_percent']}% | Stake: {best_val['kelly_stake']}u]"
            best_betslip = best_pick["betslip"]
            best_betslip["url"] = f"https://neo.bet/de/Sportwetten/Tennis?betslip=compact&se={best_betslip['contestId']}!{best_betslip['bettingTypeKey']}!{best_betslip['outcomeKey']}"
            main_bet_type = best_pick["market_type"]
            
            sim_result["neo_betslip"] = best_betslip
            sim_result["main_bet_type"] = main_bet_type
            sim_result["pattern_warning"] = best_val.get("pattern_warning")
            sim_result["pattern_boost"] = best_val.get("pattern_boost")
            sim_result["pattern_multiplier"] = best_val.get("pattern_multiplier", 1.0)
            
            safe_pick = best_pick['pick_name'].encode('ascii', errors='backslashreplace').decode('ascii')
            safe_type = str(best_val['type']).encode('ascii', errors='backslashreplace').decode('ascii')
            print(f"Value Pick generated: {safe_pick} @ {best_pick['market_odds']} ({safe_type}) in {p1_name} vs {p2_name}")
        else:
            sim_result["pattern_warning"] = val_p1.get("pattern_warning") or val_p2.get("pattern_warning")
            sim_result["pattern_boost"] = val_p1.get("pattern_boost") or val_p2.get("pattern_boost")
            sim_result["pattern_multiplier"] = val_p1.get("pattern_multiplier") or val_p2.get("pattern_multiplier")
            
        # Clean old value tag and append new value tag (or empty)
        # Regex to strip old tags
        cleaned_text = re.sub(r'\n*\s*\[.*?(Fair|Edge|VALUE|WATCH|NONE|VETO|BOMB|CONVICTION|MICRO|CORE).*?\]', '', ai_text).strip()
        new_ai_text = cleaned_text + value_tag
        
        # Save to database
        update_payload = {
            "ai_analysis_text": new_ai_text,
            "games_prediction": sim_result,
            "main_bet_type": main_bet_type
        }
        
        try:
            supabase.table("market_odds").update(update_payload).eq("id", match_id).execute()
            updated_count += 1
        except Exception as e:
            print(f"Error updating match {match_id}: {e}")
            
    print(f"\nMigration completed! Successfully updated {updated_count} matches in the database.")

if __name__ == "__main__":
    asyncio.run(fix_picks())
