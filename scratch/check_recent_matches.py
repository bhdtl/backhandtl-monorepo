import os
import sys
import datetime
from supabase import create_client

SUPABASE_URL = "https://suoaznisiowoolxilaju.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b2F6bmlzaW93b29seGlsYWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3MDA2MiwiZXhwIjoyMDgxNzMwMDYyfQ.qcOEsflvc9zJnT5ir-SYe2YhoNczDDS11be5TzLyxEo"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def check():
    print("=== Checking matches since 2026-06-18 ===")
    
    try:
        # Get all matches since June 18
        res = supabase.table("market_odds").select("*").gte("match_time", "2026-06-18T00:00:00Z").order("match_time").execute()
        matches = res.data or []
        print(f"Total matches scheduled since 2026-06-18: {len(matches)}")
        
        # Count by day
        by_day = {}
        has_analysis_count = 0
        has_edge_count = 0
        vetoed_reasons = {}
        
        for m in matches:
            m_time = m.get("match_time") or ""
            day = m_time[:10]
            by_day[day] = by_day.get(day, 0) + 1
            
            analysis = m.get("ai_analysis_text") or ""
            if analysis:
                has_analysis_count += 1
                if "Edge:" in analysis:
                    has_edge_count += 1
                else:
                    # Look for veto reasons in the analysis text
                    # Example format: "🛑 SYNDICATE VETO ..."
                    lines = analysis.split("\n")
                    for line in lines:
                        if "🛑" in line or "VETO" in line or "FILTER" in line:
                            reason = line.strip()
                            vetoed_reasons[reason] = vetoed_reasons.get(reason, 0) + 1
                            
        print("\nMatches scheduled per day:")
        for day, count in sorted(by_day.items()):
            print(f"  {day}: {count}")
            
        print(f"\nMatches with ai_analysis_text: {has_analysis_count}")
        print(f"Matches with active value picks ('Edge:'): {has_edge_count}")
        
        print("\nDetected Vetoes / Filters in analysis text:")
        for reason, count in sorted(vetoed_reasons.items(), key=lambda x: x[1], reverse=True)[:15]:
            # Print safely (encode to ascii with backslashreplace and decode to print safely on windows console)
            safe_reason = reason.encode('ascii', errors='backslashreplace').decode('ascii')
            print(f"  {count}x: {safe_reason}")
            
        # Print a few matches from June 19 and 20
        print("\nSample matches from June 19 & 20:")
        sample_count = 0
        for m in matches:
            m_time = m.get("match_time") or ""
            if "2026-06-19" in m_time or "2026-06-20" in m_time:
                sample_count += 1
                if sample_count > 10:
                    break
                p1 = m.get("player1_name")
                p2 = m.get("player2_name")
                tour = m.get("tournament")
                analysis = m.get("ai_analysis_text") or ""
                # Safe print
                safe_p1 = p1.encode('ascii', errors='backslashreplace').decode('ascii') if p1 else "None"
                safe_p2 = p2.encode('ascii', errors='backslashreplace').decode('ascii') if p2 else "None"
                safe_tour = tour.encode('ascii', errors='backslashreplace').decode('ascii') if tour else "None"
                
                print(f"\n  Match: {safe_p1} vs {safe_p2} ({safe_tour})")
                print(f"  Time: {m_time}")
                print(f"  Odds: {m.get('odds1')} / {m.get('odds2')}")
                if analysis:
                    lines = [l.strip() for l in analysis.split("\n") if l.strip()]
                    last_few_lines = lines[-3:] if len(lines) >= 3 else lines
                    print("  AI Analysis snippet:")
                    for l in last_few_lines:
                        safe_l = l.encode('ascii', errors='backslashreplace').decode('ascii')
                        print(f"    {safe_l}")
                else:
                    print("  AI Analysis: NONE")
                    
    except Exception as e:
        print("Error during check:", e)

if __name__ == "__main__":
    check()
