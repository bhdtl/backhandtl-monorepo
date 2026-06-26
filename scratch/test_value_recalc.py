import os
import sys
import asyncio
from datetime import datetime, timezone

# Add scraper path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../scraper")))

# Set environment variables for supabase
os.environ["SUPABASE_URL"] = "https://suoaznisiowoolxilaju.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b2F6bmlzaW93b29seGlsYWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3MDA2MiwiZXhwIjoyMDgxNzMwMDYyfQ.qcOEsflvc9zJnT5ir-SYe2YhoNczDDS11be5TzLyxEo"
os.environ["OPENROUTER_API_KEY"] = "mock-key-for-testing"

from supabase import create_client
supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

# Import functions from scraper
import scraper
from scraper import (
    calculate_value_metrics, 
    find_player_smart, 
    find_best_court_match_smart,
    fetch_player_history_extended
)

async def test_recalc():
    print("=== Testing value recalculation without SYSTEM_AUTOPILOT ===")
    
    # 1. Load active rules excluding SYSTEM_AUTOPILOT
    res_rules = supabase.table("scout_rules").select("*").eq("status", "approved").execute()
    all_rules = res_rules.data or []
    filtered_rules = [r for r in all_rules if r.get("description") != "SYSTEM_AUTOPILOT"]
    print(f"Loaded {len(all_rules)} approved rules.")
    print(f"Filtered to {len(filtered_rules)} rules (excluded SYSTEM_AUTOPILOT).")
    
    # Set the global variable in scraper module to the filtered rules!
    scraper.GLOBAL_ACTIVE_RULES = filtered_rules
    
    # 2. Get players, skills, tournaments using scraper's get_db_data
    from scraper import get_db_data
    players, all_skills, all_reports, all_tournaments = await get_db_data()
    report_ids = {r['player_id'] for r in all_reports if isinstance(r, dict) and r.get('player_id')}
    
    # 3. Fetch upcoming matches since June 19th 22:00 UTC
    cutoff = "2026-06-19T22:00:00Z"
    res_matches = supabase.table("market_odds").select("*").gte("match_time", cutoff).order("match_time").execute()
    matches = res_matches.data or []
    print(f"Fetched {len(matches)} upcoming matches.")
    
    value_picks_found = 0
    
    for m in matches:
        p1_name = m.get("player1_name")
        p2_name = m.get("player2_name")
        tour = m.get("tournament")
        m_time = m.get("match_time")
        
        # Check if it was fully analyzed (has fair odds)
        fair1 = m.get("ai_fair_odds1")
        fair2 = m.get("ai_fair_odds2")
        odds1 = m.get("odds1")
        odds2 = m.get("odds2")
        
        if not fair1 or not fair2 or fair1 <= 1.01 or fair2 <= 1.01:
            # Skip if not fully analyzed (e.g. shadow tracking due to player not found)
            continue
            
        # Match players
        p1_obj = find_player_smart(p1_name, players, report_ids)
        p2_obj = find_player_smart(p2_name, players, report_ids)
        
        if not p1_obj or not p2_obj:
            continue
            
        c1_country = p1_obj.get('country', 'Unknown')
        c2_country = p2_obj.get('country', 'Unknown')
        
        # Smart court matching
        surf, bsi, notes, city, matched_tour = await find_best_court_match_smart(
            tour or "", all_tournaments, p1_name, p2_name, c1_country, c2_country
        )
        
        p1_history = await fetch_player_history_extended(p1_name, limit=20)
        p2_history = await fetch_player_history_extended(p2_name, limit=20)
        
        # Get ELO safely
        from scraper import SurfaceIntelligence
        elo_surf = SurfaceIntelligence.normalize_surface_key(surf)
        s1 = all_skills.get(p1_obj['id'], {}) if p1_obj else {}
        s2 = all_skills.get(p2_obj['id'], {}) if p2_obj else {}
        elo_metrics1 = s1.get('elo_metrics') or {}
        elo_metrics2 = s2.get('elo_metrics') or {}
        
        if isinstance(elo_metrics1, str):
            import json
            try: elo_metrics1 = json.loads(elo_metrics1)
            except: elo_metrics1 = {}
        if isinstance(elo_metrics2, str):
            import json
            try: elo_metrics2 = json.loads(elo_metrics2)
            except: elo_metrics2 = {}
            
        elo1 = elo_metrics1.get(elo_surf, 1500)
        elo2 = elo_metrics2.get(elo_surf, 1500)
        
        if isinstance(elo1, dict):
            elo1 = elo1.get("rating", 1500)
        if isinstance(elo2, dict):
            elo2 = elo2.get("rating", 1500)
        try:
            elo1 = float(elo1) if elo1 is not None else 1500.0
            elo2 = float(elo2) if elo2 is not None else 1500.0
        except:
            elo1, elo2 = 1500.0, 1500.0
        
        # Determine Slam
        _slam_kw = {"australian open", "roland garros", "french open", "wimbledon", "us open"}
        _is_slam = any(kw in (matched_tour or "").lower() for kw in _slam_kw)
        
        # Opening odds
        op_o1 = m.get("opening_odds1")
        op_o2 = m.get("opening_odds2")
        
        # Run calculate_value_metrics
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
        
        # Print if value is found
        if val_p1.get("is_value"):
            value_picks_found += 1
            print(f"\n[VALUE FOUND] Match: {p1_name} vs {p2_name} | {m_time}")
            print(f"  Bet on: {p1_name} @ {odds1} (Fair: {fair1})")
            print(f"  Edge: {val_p1.get('edge_percent')}% | Stake: {val_p1.get('kelly_stake')}u")
            safe_type = str(val_p1.get('type')).encode('ascii', errors='backslashreplace').decode('ascii')
            print(f"  Type: {safe_type}")
        elif val_p2.get("is_value"):
            value_picks_found += 1
            print(f"\n[VALUE FOUND] Match: {p1_name} vs {p2_name} | {m_time}")
            print(f"  Bet on: {p2_name} @ {odds2} (Fair: {fair2})")
            print(f"  Edge: {val_p2.get('edge_percent')}% | Stake: {val_p2.get('kelly_stake')}u")
            safe_type = str(val_p2.get('type')).encode('ascii', errors='backslashreplace').decode('ascii')
            print(f"  Type: {safe_type}")
            
    print(f"\nRecalculation finished. Total value picks found without SYSTEM_AUTOPILOT: {value_picks_found}")

if __name__ == "__main__":
    asyncio.run(test_recalc())
