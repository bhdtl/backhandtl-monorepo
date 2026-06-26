import os
import sys
from supabase import create_client

SUPABASE_URL = "https://suoaznisiowoolxilaju.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b2F6bmlzaW93b29seGlsYWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3MDA2MiwiZXhwIjoyMDgxNzMwMDYyfQ.qcOEsflvc9zJnT5ir-SYe2YhoNczDDS11be5TzLyxEo"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def analyze():
    cutoff = "2026-06-19T22:00:00Z"
    print(f"=== Deep Match Analysis (match_time >= {cutoff}) ===")
    
    try:
        res = supabase.table("market_odds").select("*").gte("match_time", cutoff).order("match_time").execute()
        matches = res.data or []
        
        true_shadow_count = 0
        fully_analyzed_count = 0
        no_analysis_count = 0
        
        reasons_summary = {}
        
        for m in matches:
            text = m.get("ai_analysis_text") or ""
            if not text:
                no_analysis_count += 1
            elif text.startswith("[SHADOW TRACKING]"):
                true_shadow_count += 1
            else:
                fully_analyzed_count += 1
                # Find if there are vetoes or why it's not a value pick
                # Check for brackets or specific lines
                lines = [l.strip() for l in text.split("\n") if l.strip()]
                found_result_tag = False
                for line in lines:
                    if "[" in line and "]" in line and ("VETO" in line or "FILTER" in line or "NO EDGE" in line or "TRAP" in line or "FAILURE" in line or "BARRIER" in line):
                        found_result_tag = True
                        reasons_summary[line] = reasons_summary.get(line, 0) + 1
                if not found_result_tag:
                    # Let's see the last line
                    if lines:
                        last_line = lines[-1]
                        reasons_summary[last_line] = reasons_summary.get(last_line, 0) + 1
                        
        print(f"Total Matches: {len(matches)}")
        print(f"  - Skipped (both_players_found = False): {true_shadow_count}")
        print(f"  - Fully Analyzed (both players found): {fully_analyzed_count}")
        print(f"  - No Analysis field: {no_analysis_count}")
        
        print("\nAnalysis Outcomes for Fully Analyzed matches:")
        for r, count in sorted(reasons_summary.items(), key=lambda x: x[1], reverse=True):
            safe_r = r.encode('ascii', errors='backslashreplace').decode('ascii')
            print(f"  {count}x: {safe_r}")
            
    except Exception as e:
        print("Error during analysis:", e)

if __name__ == "__main__":
    analyze()
