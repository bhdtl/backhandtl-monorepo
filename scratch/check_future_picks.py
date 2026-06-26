import os
import sys
import datetime
from supabase import create_client

SUPABASE_URL = "https://suoaznisiowoolxilaju.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b2F6bmlzaW93b29seGlsYWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3MDA2MiwiZXhwIjoyMDgxNzMwMDYyfQ.qcOEsflvc9zJnT5ir-SYe2YhoNczDDS11be5TzLyxEo"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def check_future():
    # 2026-06-19T23:00:00Z is 2026-06-20T01:00:00 in UTC+2 (Germany/France)
    cutoff = "2026-06-19T22:00:00Z"
    print(f"=== Checking upcoming matches (match_time >= {cutoff}) ===")
    
    try:
        res = supabase.table("market_odds").select("*").gte("match_time", cutoff).order("match_time").execute()
        matches = res.data or []
        print(f"Total upcoming matches fetched: {len(matches)}")
        
        value_picks = []
        shadow_tracked = []
        no_analysis = []
        
        for m in matches:
            analysis = m.get("ai_analysis_text") or ""
            if not analysis:
                no_analysis.append(m)
            elif "Edge:" in analysis:
                value_picks.append(m)
            else:
                shadow_tracked.append(m)
                
        print(f"Upcoming value picks (containing 'Edge:'): {len(value_picks)}")
        print(f"Upcoming shadow tracked: {len(shadow_tracked)}")
        print(f"Upcoming with no analysis: {len(no_analysis)}")
        
        if value_picks:
            print("\nDetails of upcoming value picks:")
            for m in value_picks:
                p1 = m.get("player1_name")
                p2 = m.get("player2_name")
                tour = m.get("tournament")
                m_time = m.get("match_time")
                analysis = m.get("ai_analysis_text") or ""
                
                safe_p1 = p1.encode('ascii', errors='backslashreplace').decode('ascii') if p1 else "None"
                safe_p2 = p2.encode('ascii', errors='backslashreplace').decode('ascii') if p2 else "None"
                safe_tour = tour.encode('ascii', errors='backslashreplace').decode('ascii') if tour else "None"
                
                print(f"\n  Match: {safe_p1} vs {safe_p2} ({safe_tour})")
                print(f"  Time: {m_time}")
                print(f"  Odds: {m.get('odds1')} / {m.get('odds2')}")
                lines = [l.strip() for l in analysis.split("\n") if l.strip()]
                for l in lines:
                    if "Edge:" in l or "SIM:" in l or "VETO" in l or "FILTER" in l:
                        safe_l = l.encode('ascii', errors='backslashreplace').decode('ascii')
                        print(f"    {safe_l}")
        else:
            print("\nNO UPCOMING VALUE PICKS FOUND.")
            # Let's inspect some of the shadow tracked matches to see what their veto reasons are
            print("\nSample shadow-tracked matches and their analysis reasons:")
            for m in shadow_tracked[:10]:
                p1 = m.get("player1_name")
                p2 = m.get("player2_name")
                tour = m.get("tournament")
                m_time = m.get("match_time")
                analysis = m.get("ai_analysis_text") or ""
                
                safe_p1 = p1.encode('ascii', errors='backslashreplace').decode('ascii') if p1 else "None"
                safe_p2 = p2.encode('ascii', errors='backslashreplace').decode('ascii') if p2 else "None"
                safe_tour = tour.encode('ascii', errors='backslashreplace').decode('ascii') if tour else "None"
                
                print(f"\n  Match: {safe_p1} vs {safe_p2} ({safe_tour}) - {m_time}")
                lines = [l.strip() for l in analysis.split("\n") if l.strip()]
                # Print any lines containing vetoes or the final tags
                reasons = [l for l in lines if any(x in l for x in ["SHADOW", "VETO", "FILTER", "NO EDGE", "TRAP", "FAILURE", "BARRIER"])]
                if not reasons:
                    reasons = lines[-2:]
                for r in reasons:
                    safe_r = r.encode('ascii', errors='backslashreplace').decode('ascii')
                    print(f"    {safe_r}")

    except Exception as e:
        print("Error checking future picks:", e)

if __name__ == "__main__":
    check_future()
