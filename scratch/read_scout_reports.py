import os
import sys
from supabase import create_client

# Using the Supabase Service Role credentials
SUPABASE_URL = 'https://suoaznisiowoolxilaju.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b2F6bmlzaW93b29seGlsYWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3MDA2MiwiZXhwIjoyMDgxNzMwMDYyfQ.qcOEsflvc9zJnT5ir-SYe2YhoNczDDS11be5TzLyxEo'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def check_reports():
    print("Fetching latest from scout_reports...")
    try:
        res = supabase.table("scout_reports").select("*").order("created_at", desc=True).limit(5).execute()
        reports = res.data or []
        print(f"Found {len(reports)} reports.")
        for r in reports:
            print("-" * 50)
            print(f"ID: {r.get('id')}")
            print(f"Date: {r.get('report_date')}")
            print(f"Created At: {r.get('created_at')}")
            print(f"Summary Snippet:\n{r.get('summary')[:300]}")
            print(f"Metrics: {r.get('metrics')}")
    except Exception as e:
        print(f"Error fetching: {e}")

if __name__ == "__main__":
    check_reports()
