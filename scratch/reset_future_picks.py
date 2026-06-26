import os
import sys
import asyncio
from supabase import create_client

# Supabase Credentials
os.environ["SUPABASE_URL"] = "https://suoaznisiowoolxilaju.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b2F6bmlzaW93b29seGlsYWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3MDA2MiwiZXhwIjoyMDgxNzMwMDYyfQ.qcOEsflvc9zJnT5ir-SYe2YhoNczDDS11be5TzLyxEo"

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

async def reset_picks():
    print("=== Resetting upcoming picks for notification trigger ===")
    cutoff = "2026-06-19T22:00:00Z"
    
    try:
        # Get all upcoming matches
        res = supabase.table("market_odds").select("id, player1_name, player2_name, ai_analysis_text").gte("match_time", cutoff).execute()
        matches = res.data or []
        
        reset_count = 0
        for m in matches:
            analysis = m.get("ai_analysis_text") or ""
            if "Edge:" in analysis:
                print(f"Resetting match: {m.get('player1_name')} vs {m.get('player2_name')}")
                supabase.table("market_odds").update({
                    "ai_analysis_text": "[SHADOW TRACKING] Match collected for historical player metrics.",
                    "games_prediction": {},
                    "main_bet_type": "WINNER"
                }).eq("id", m.get("id")).execute()
                reset_count += 1
                
        print(f"\nSuccessfully reset {reset_count} matches to shadow tracking.")
    except Exception as e:
        print("Error during reset:", e)

if __name__ == "__main__":
    asyncio.run(reset_picks())
