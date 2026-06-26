import sys
from supabase import create_client

sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://suoaznisiowoolxilaju.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b2F6bmlzaW93b29seGlsYWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3MDA2MiwiZXhwIjoyMDgxNzMwMDYyfQ.qcOEsflvc9zJnT5ir-SYe2YhoNczDDS11be5TzLyxEo'
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def analyze_all_candidates():
    # Load rules
    r_rules = supabase.table('scout_rules').select('*').eq('status', 'approved').execute()
    active_rules = [r for r in (r_rules.data or []) if r.get('description') != 'SYSTEM_AUTOPILOT']
    print(f"Loaded {len(active_rules)} approved rules.")
    
    # Fetch matches
    res = supabase.table('market_odds')\
        .select('*')\
        .is_('actual_winner_name', 'null')\
        .order('match_time')\
        .execute()
        
    matches = res.data or []
    print(f"Loaded {len(matches)} upcoming matches.\n")
    
    total_candidates_with_pos_edge = 0
    vetoed_by_edge_floor = 0
    vetoed_by_fake_edge = 0
    vetoed_by_stake_rounding = 0
    vetoed_by_scout_rules = {}
    approved_picks = []

    # Simple model to evaluate rule match
    for m in matches:
        p1 = m.get('player1_name')
        p2 = m.get('player2_name')
        tour = m.get('tournament') or ''
        surf_raw = tour.lower()
        surface = "hard"
        if any(x in surf_raw for x in ["clay","sand","terre","tierra","erde"]): surface = "clay"
        elif any(x in surf_raw for x in ["grass","rasen","wimbledon","eastbourne","halle","nottingham"]): surface = "grass"
        
        is_challenger = "challenger" in surf_raw or "itf" in surf_raw
        
        # We can construct candidate picks: Winner, Spreads, Totals
        # Let's inspect Winner P1 and P2
        o1 = m.get('odds1')
        o2 = m.get('odds2')
        fair1 = m.get('ai_fair_odds1')
        fair2 = m.get('ai_fair_odds2')
        
        candidates = []
        if o1 and fair1 and o1 > 1.01 and fair1 > 1.01:
            candidates.append(('WINNER', p1, o1, fair1, o1 <= o2))
        if o2 and fair2 and o2 > 1.01 and fair2 > 1.01:
            candidates.append(('WINNER', p2, o2, fair2, o2 <= o1))
            
        # Add neobet spreads
        for sp in m.get("neobet_spreads", []):
            # We can't simulate easily here, but we can check if they were in games_prediction
            pass
            
        # Let's check candidates
        for mkt_type, name, odds, fair, is_fav in candidates:
            prob = 1.0 / fair
            raw_edge = (prob * odds) - 1.0
            
            if raw_edge <= 0:
                continue
                
            total_candidates_with_pos_edge += 1
            
            # Haircut
            scale_edge = round(raw_edge * 0.40 * 100, 1)
            
            # Kelly stake
            b = odds - 1.0
            full_kelly = (raw_edge * 0.40) / b if b > 0 else 0
            if odds < 2.00:
                kelly_fraction = 0.15
            elif odds < 3.00:
                kelly_fraction = 0.10
            elif odds < 5.00:
                kelly_fraction = 0.05
            else:
                kelly_fraction = 0.02
                
            base_stake = full_kelly * 100 * kelly_fraction
            
            # Evaluate filters
            # 1. Fake Edge Trap
            if scale_edge > 12.0:
                vetoed_by_fake_edge += 1
                continue
                
            # 2. Edge Floor
            # Find edge floor rule
            edge_floor = 5.0 # default
            for r in active_rules:
                if r.get('rule_type') == 'odds_filter':
                    edge_floor = r.get('conditions', {}).get('min_edge', 5.0)
            
            if scale_edge < edge_floor:
                vetoed_by_edge_floor += 1
                continue
                
            # Evaluate active rules
            veto_reason = None
            for r in active_rules:
                r_type = r.get('rule_type')
                conds = r.get('conditions', {})
                desc = r.get('description', '')
                
                # Check match
                rule_match = True
                if "surface" in conds and conds["surface"] != surface: rule_match = False
                if "is_favorite" in conds and conds["is_favorite"] != is_fav: rule_match = False
                if "is_challenger" in conds and conds["is_challenger"] != is_challenger: rule_match = False
                if "market_type" in conds:
                    req_mt = conds["market_type"].lower()
                    if req_mt != "moneyline": rule_match = False # since we only analyze ML here
                if "max_odds" in conds and odds > conds["max_odds"]: rule_match = False
                
                if rule_match:
                    if r_type == 'veto':
                        veto_reason = desc
                        break
            
            if veto_reason:
                vetoed_by_scout_rules[veto_reason] = vetoed_by_scout_rules.get(veto_reason, 0) + 1
                continue
                
            # Round stake
            final_stake = round(base_stake, 1)
            if final_stake <= 0.0:
                vetoed_by_stake_rounding += 1
                continue
                
            approved_picks.append({
                "match": f"{p1} vs {p2}",
                "pick": name,
                "odds": odds,
                "fair": fair,
                "scale_edge": scale_edge,
                "stake": final_stake
            })
            
    print(f"Total candidates with positive edge: {total_candidates_with_pos_edge}")
    print(f"  Filtered by EDGE_FLOOR (< 5% edge): {vetoed_by_edge_floor}")
    print(f"  Filtered by Fake Edge Trap (> 12% edge): {vetoed_by_fake_edge}")
    print(f"  Filtered by Stake rounding to 0.0u: {vetoed_by_stake_rounding}")
    print("  Filtered by Scout Rules:")
    for rule, count in vetoed_by_scout_rules.items():
        print(f"    - {rule}: {count}")
        
    print(f"\nApproved Picks ({len(approved_picks)}):")
    for p in approved_picks:
        print(f"  - {p['pick']} in {p['match']} @ {p['odds']} | Fair: {p['fair']} | Edge: {p['scale_edge']}% | Stake: {p['stake']}u")

if __name__ == '__main__':
    analyze_all_candidates()
