import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://suoaznisiowoolxilaju.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b2F6bmlzaW93b29seGlsYWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNzAwNjIsImV4cCI6MjA4MTczMDA2Mn0.4fh5Unx9Gkd_NPrPnc5O8B6edkipbGnUeAIATHFnyaE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('scouting_reports').select('id, player_id, translations');
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  let total = data.length;
  let hasTranslations = 0;
  let hasDe = 0;
  let hasFr = 0;
  let hasIt = 0;
  let hasEs = 0;

  for (const row of data) {
    if (row.translations) {
      hasTranslations++;
      if (row.translations.de && (row.translations.de.strengths || row.translations.de.weaknesses || row.translations.de.mental)) hasDe++;
      if (row.translations.fr && (row.translations.fr.strengths || row.translations.fr.weaknesses || row.translations.fr.mental)) hasFr++;
      if (row.translations.it && (row.translations.it.strengths || row.translations.it.weaknesses || row.translations.it.mental)) hasIt++;
      if (row.translations.es && (row.translations.es.strengths || row.translations.es.weaknesses || row.translations.es.mental)) hasEs++;
    }
  }

  console.log(`Total rows: ${total}`);
  console.log(`Rows with translations column not null: ${hasTranslations}`);
  console.log(`Rows with 'de' translations: ${hasDe}`);
  console.log(`Rows with 'fr' translations: ${hasFr}`);
  console.log(`Rows with 'it' translations: ${hasIt}`);
  console.log(`Rows with 'es' translations: ${hasEs}`);
}

check();
