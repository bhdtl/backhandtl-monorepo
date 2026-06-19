import os
import sys

# Inject environment variables before importing scraper
os.environ["SUPABASE_URL"] = "https://suoaznisiowoolxilaju.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b2F6bmlzaW93b29seGlsYWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3MDA2MiwiZXhwIjoyMDgxNzMwMDYyfQ.qcOEsflvc9zJnT5ir-SYe2YhoNczDDS11be5TzLyxEo"
os.environ["OPENROUTER_API_KEY"] = "sk-or-v1-mock-key-for-testing"

# Configure stdout encoding to utf-8 to prevent charmap errors on Windows
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import asyncio
from supabase import create_client

sys.path.append(os.path.abspath("scraper"))
from scraper import (
    get_db_data, find_player_smart, find_best_court_match_smart,
    fetch_player_history_extended, MomentumV2Engine, SurfaceIntelligence,
    calculate_empirical_ou, QuantumGamesSimulator, MarkovChainEngine
)

async def test_full_sim():
    print("1. Fetching DB data...")
    players, all_skills, all_reports, all_tournaments = await get_db_data()
    print(f"Total players: {len(players)}, skills: {len(all_skills)}, reports: {len(all_reports)}, tournaments: {len(all_tournaments)}")
    
    p1_raw = "Titouan Droguet"
    p2_raw = "Jurij Rodionov"
    
    report_ids = {r.get('player_id') for r in all_reports if r.get('player_id')}
    
    p1_obj = find_player_smart(p1_raw, players, report_ids)
    p2_obj = find_player_smart(p2_raw, players, report_ids)
    
    print("p1_obj found:", p1_obj is not None)
    print("p2_obj found:", p2_obj is not None)
    
    if not p1_obj or not p2_obj:
        print("Player not found in database!")
        return

    full_n1 = f"{p1_obj.get('first_name', '')} {p1_obj.get('last_name', '')}".strip()
    full_n2 = f"{p2_obj.get('first_name', '')} {p2_obj.get('last_name', '')}".strip()
    
    print("2. Finding best court match...")
    surf, bsi, notes, city_for_weather, matched_tour_name = await find_best_court_match_smart(
        "Dublin", all_tournaments, full_n1, full_n2, p1_obj.get('country', 'Unknown'), p2_obj.get('country', 'Unknown')
    )
    print(f"Court: surf={surf}, bsi={bsi}, tour={matched_tour_name}")
    
    _best_of = 3
    print("3. Fetching histories...")
    p1_history = await fetch_player_history_extended(full_n1, limit=20)
    p2_history = await fetch_player_history_extended(full_n2, limit=20)
    
    print("4. Calculating momentum form...")
    p1_form_v2 = MomentumV2Engine.calculate_rating(p1_history[:20], full_n1)
    p2_form_v2 = MomentumV2Engine.calculate_rating(p2_history[:20], full_n2)
    print("Form P1:", p1_form_v2)
    print("Form P2:", p2_form_v2)
    
    s1 = all_skills.get(p1_obj['id'], {})
    s2 = all_skills.get(p2_obj['id'], {})
    
    print("5. Surface profile...")
    p1_surface_profile = SurfaceIntelligence.compute_player_surface_profile(s1.get('elo_metrics', {}), s1.get('sackmann_metrics', {}))
    p2_surface_profile = SurfaceIntelligence.compute_player_surface_profile(s2.get('elo_metrics', {}), s2.get('sackmann_metrics', {}))
    
    print("6. Empirical OU...")
    empirical_ou = calculate_empirical_ou(p1_history, p2_history, is_slam=(_best_of == 5))
    print("Empirical OU:", empirical_ou)
    
    print("7. Quantum Games simulation...")
    sim_result = QuantumGamesSimulator.run_simulation(s1, s2, bsi, surf, actual_ou_line=None, empirical_ou=empirical_ou, best_of=_best_of)
    print("Sim result (Quantum):", sim_result)
    
    print("8. Markov Chain simulation...")
    sackmannA = s1.get('sackmann_metrics', {})
    sackmannB = s2.get('sackmann_metrics', {})
    
    mc_results = MarkovChainEngine.run_simulation(
        s1=s1, s2=s2,
        formA=p1_form_v2['score'], formB=p2_form_v2['score'],
        bsi=bsi, surface=surf,
        sackmannA=sackmannA, sackmannB=sackmannB,
        iterations=2500,
        best_of=_best_of
    )
    print("MC Results:", mc_results)
    print("All tests passed successfully!")

if __name__ == "__main__":
    asyncio.run(test_full_sim())
