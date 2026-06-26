import sys
from supabase import create_client

# Force stdout encoding to UTF-8
sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://suoaznisiowoolxilaju.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b2F6bmlzaW93b29seGlsYWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3MDA2MiwiZXhwIjoyMDgxNzMwMDYyfQ.qcOEsflvc9zJnT5ir-SYe2YhoNczDDS11be5TzLyxEo'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def view_all_reports():
    print("Fetching all scout_reports safely...")
    try:
        res = supabase.table("scout_reports").select("*").order("report_date", desc=True).execute()
        reports = res.data or []
        print(f"Total reports found: {len(reports)}")
        for r in reports:
            print("=" * 60)
            print(f"Date: {r.get('report_date')} | Created: {r.get('created_at')} | ID: {r.get('id')}")
            summary = r.get('summary', '')
            # print only first 150 chars or indicator
            is_err = "API-Fehler" in summary
            print(f"Status: {'⚠️ API ERROR' if is_err else '✅ SUCCESS'}")
            print(f"Summary Preview:\n{summary[:500]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    view_all_reports()
