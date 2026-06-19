import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://suoaznisiowoolxilaju.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b2F6bmlzaW93b29seGlsYWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNzAwNjIsImV4cCI6MjA4MTczMDA2Mn0.4fh5Unx9Gkd_NPrPnc5O8B6edkipbGnUeAIATHFnyaE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  console.log("--- Querying latest scout_reports ---");
  const { data: reports, error: err2 } = await supabase
    .from('scout_reports')
    .select('id, report_date, summary, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (err2) {
    console.error('Error fetching reports:', err2);
    return;
  }

  console.log(`Found ${reports ? reports.length : 0} latest reports:`);
  if (reports) {
    reports.forEach((rep, idx) => {
      console.log(`[${idx + 1}] Report Date: ${rep.report_date} | Created: ${rep.created_at}`);
      console.log(`    - Summary snippet:\n${rep.summary ? rep.summary.substring(0, 1000) + "..." : "NULL"}`);
      console.log("-----------------------------------------");
    });
  }
}

check();
