import os
import sys
from supabase import create_client

SUPABASE_URL = "https://suoaznisiowoolxilaju.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b2F6bmlzaW93b29seGlsYWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3MDA2MiwiZXhwIjoyMDgxNzMwMDYyfQ.qcOEsflvc9zJnT5ir-SYe2YhoNczDDS11be5TzLyxEo"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    res = supabase.table("players").select("*").limit(1).execute()
    if res.data:
        player = res.data[0]
        print("Columns in players table:")
        for k in sorted(player.keys()):
            print(f"  {k}")
    else:
        print("Success, but players table is empty!")
except Exception as e:
    print("Error querying players:", e)
