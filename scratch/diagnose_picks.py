import os
import sys
from supabase import create_client

SUPABASE_URL = "https://suoaznisiowoolxilaju.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b2F6bmlzaW93b29seGlsYWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3MDA2MiwiZXhwIjoyMDgxNzMwMDYyfQ.qcOEsflvc9zJnT5ir-SYe2YhoNczDDS11be5TzLyxEo"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def diagnose():
    print("=== Supabase Database Diagnosis ===")
    
    # 1. Check scout_rules
    try:
        res = supabase.table("scout_rules").select("*").execute()
        print(f"\n1. scout_rules table count: {len(res.data) if res.data else 0}")
        if res.data:
            for rule in res.data:
                print(f"  - ID: {rule.get('id')}, Description: {rule.get('description')}, Type: {rule.get('rule_type')}, Status: {rule.get('status')}, Conditions: {rule.get('conditions')}")
    except Exception as e:
        print("Error querying scout_rules:", e)
        
    # 2. Check scout_reports
    try:
        res = supabase.table("scout_reports").select("*").execute()
        print(f"\n2. scout_reports table count: {len(res.data) if res.data else 0}")
        if res.data:
            for rep in res.data[:5]:
                print(f"  - ID: {rep.get('id')}, Date: {rep.get('report_date')}, Headline: {rep.get('headline') or 'None'}")
    except Exception as e:
        print("Error querying scout_reports:", e)
        
    # 3. Check scouting_reports
    try:
        res = supabase.table("scouting_reports").select("*").execute()
        print(f"\n3. scouting_reports table count: {len(res.data) if res.data else 0}")
        if res.data:
            print("  Columns:", list(res.data[0].keys()))
    except Exception as e:
        print("Error querying scouting_reports:", e)
        
    # 4. Check market_odds
    try:
        # Total count
        res_total = supabase.table("market_odds").select("id", count="exact").limit(1).execute()
        total_count = res_total.count
        print(f"\n4. market_odds total count: {total_count}")
        
        # Value picks count by searching for text pattern "Edge:" or "Fair:" in ai_analysis_text
        res_val = supabase.table("market_odds").select("*").ilike("ai_analysis_text", "%Edge:%").execute()
        print(f"   Value picks count (containing 'Edge:'): {len(res_val.data) if res_val.data else 0}")
        if res_val.data:
            # Sort by match_time or created_at descending
            sorted_picks = sorted(res_val.data, key=lambda x: x.get("match_time") or "", reverse=True)
            print("   Latest 5 value picks:")
            for pick in sorted_picks[:5]:
                print(f"     - Match: {pick.get('player1_name')} vs {pick.get('player2_name')}")
                print(f"       Time: {pick.get('match_time')}, Tour: {pick.get('tournament')}")
                print(f"       Odds: {pick.get('odds1')} / {pick.get('odds2')}")
                print(f"       AI analysis text snippet: {str(pick.get('ai_analysis_text'))[-200:]}...")
                
        # Non-value picks count (upcoming)
        # Let's see some upcoming matches
        import datetime
        now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        res_upcoming = supabase.table("market_odds").select("*").gte("match_time", now_str).order("match_time").limit(5).execute()
        print(f"\n   Upcoming matches (>= {now_str}): {len(res_upcoming.data) if res_upcoming.data else 0}")
        if res_upcoming.data:
            for m in res_upcoming.data:
                print(f"     - Match: {m.get('player1_name')} vs {m.get('player2_name')}")
                print(f"       Time: {m.get('match_time')}, Tour: {m.get('tournament')}")
                print(f"       Odds: {m.get('odds1')} / {m.get('odds2')}")
                print(f"       AI analysis text snippet: {str(m.get('ai_analysis_text'))[:100]}...")
    except Exception as e:
        print("Error querying market_odds:", e)

if __name__ == "__main__":
    diagnose()
