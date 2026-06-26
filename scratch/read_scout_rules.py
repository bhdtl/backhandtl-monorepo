from supabase import create_client

SUPABASE_URL = 'https://suoaznisiowoolxilaju.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b2F6bmlzaW93b29seGlsYWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3MDA2MiwiZXhwIjoyMDgxNzMwMDYyfQ.qcOEsflvc9zJnT5ir-SYe2YhoNczDDS11be5TzLyxEo'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def check_rules():
    print("Fetching scout_rules...")
    try:
        res = supabase.table("scout_rules").select("*").execute()
        rules = res.data or []
        print(f"Found {len(rules)} rules in scout_rules.")
        for r in rules:
            print(f"- ID: {r.get('id')} | Type: {r.get('rule_type')} | Description: {r.get('description')} | Status: {r.get('status')}")
    except Exception as e:
        print(f"Error fetching scout_rules: {e}")

def check_insights():
    print("\nFetching latest tennis_insights...")
    try:
        res = supabase.table("tennis_insights").select("*").order("created_at", desc=True).limit(5).execute()
        insights = res.data or []
        print(f"Found {len(insights)} insights.")
        for ins in insights:
            print(f"- Headline: {ins.get('headline')} | Player ID: {ins.get('player_id')} | Sentiment: {ins.get('sentiment')}")
            print(f"  Summary: {ins.get('summary')}")
    except Exception as e:
        print(f"Error fetching tennis_insights: {e}")

if __name__ == "__main__":
    check_rules()
    check_insights()
