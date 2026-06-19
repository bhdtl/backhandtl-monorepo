import os
import sys
from supabase import create_client

SUPABASE_URL = "https://suoaznisiowoolxilaju.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b2F6bmlzaW93b29seGlsYWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3MDA2MiwiZXhwIjoyMDgxNzMwMDYyfQ.qcOEsflvc9zJnT5ir-SYe2YhoNczDDS11be5TzLyxEo"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    res = supabase.table("scouting_reports").select("*").limit(1).execute()
    print("Success! scouting_reports exists.")
    if res.data:
        print("Columns:", list(res.data[0].keys()))
    else:
        print("Table is empty.")
except Exception as e:
    print("Error querying scouting_reports:", e)
