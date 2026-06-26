from supabase import create_client

SUPABASE_URL = 'https://suoaznisiowoolxilaju.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b2F6bmlzaW93b29seGlsYWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3MDA2MiwiZXhwIjoyMDgxNzMwMDYyfQ.qcOEsflvc9zJnT5ir-SYe2YhoNczDDS11be5TzLyxEo'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def reset_today_report():
    today_str = "2026-06-20"
    print(f"Checking for existing report on {today_str}...")
    try:
        res = supabase.table("scout_reports").select("id, summary").eq("report_date", today_str).execute()
        reports = res.data or []
        if not reports:
            print(f"No report found for {today_str}. Nothing to delete.")
            return
            
        for r in reports:
            print(f"Found report {r.get('id')} with snippet: '{r.get('summary')[:60]}'")
            if "API-Fehler" in r.get("summary"):
                print(f"Deleting failed report {r.get('id')}...")
                del_res = supabase.table("scout_reports").delete().eq("id", r.get("id")).execute()
                print("Successfully deleted today's failed report.")
            else:
                print(f"Report {r.get('id')} is not an API-Fehler placeholder. Skipping deletion to be safe.")
    except Exception as e:
        print(f"Error resetting report: {e}")

if __name__ == "__main__":
    reset_today_report()
