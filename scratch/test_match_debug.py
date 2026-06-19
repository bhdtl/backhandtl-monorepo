import os
import sys

# Inject environment variables before importing scraper
os.environ["SUPABASE_URL"] = "https://suoaznisiowoolxilaju.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b2F6bmlzaW93b29seGlsYWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3MDA2MiwiZXhwIjoyMDgxNzMwMDYyfQ.qcOEsflvc9zJnT5ir-SYe2YhoNczDDS11be5TzLyxEo"
os.environ["OPENROUTER_API_KEY"] = "sk-or-v1-mock-key-for-testing"

import asyncio
from supabase import create_client

sys.path.append(os.path.abspath("scraper"))
from scraper import fetch_player_history_extended, get_advanced_load_analysis

async def test_match():
    p1_last = "Droguet"
    p2_last = "Rodionov"
    
    print(f"1. Fetching history for {p1_last}...")
    h1 = await fetch_player_history_extended(p1_last, 10)
    print(f"Success! {p1_last} history matches count: {len(h1)}")
    
    print(f"2. Fetching history for {p2_last}...")
    h2 = await fetch_player_history_extended(p2_last, 10)
    print(f"Success! {p2_last} history matches count: {len(h2)}")
    
    print("3. Analyzing fatigue for player 1...")
    fat1 = await get_advanced_load_analysis(h1)
    print("Fatigue 1:", fat1)
    
    print("4. Analyzing fatigue for player 2...")
    fat2 = await get_advanced_load_analysis(h2)
    print("Fatigue 2:", fat2)
    
    print("Done test.")

if __name__ == "__main__":
    asyncio.run(test_match())
