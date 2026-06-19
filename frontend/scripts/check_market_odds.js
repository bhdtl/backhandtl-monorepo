import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://suoaznisiowoolxilaju.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b2F6bmlzaW93b29seGlsYWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNzAwNjIsImV4cCI6MjA4MTczMDA2Mn0.4fh5Unx9Gkd_NPrPnc5O8B6edkipbGnUeAIATHFnyaE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function parseValueFromText(text) {
    if (!text) {
        return { hasValue: false, marketOdds: 0, edge: 0, pickName: '', stake: 0, type: '' };
    }

    if (text.includes('[') && text.includes('Edge:')) {
        const regex = /\[(.*?):\s*(.*?)\s*@\s*([\d.]+)\s*\|\s*Fair:\s*([\d.]+)\s*\|\s*Edge:\s*(-?[\d.]+)%(?:\s*\|\s*Stake:\s*([\d.]+)u)?\]/;
        const match = text.match(regex);
        
        if (match) {
            let rawStake = match[6] ? parseFloat(match[6]) : 0;
            let finalStake = Math.max(0, Math.min(5, rawStake));
            finalStake = Math.round(finalStake * 10) / 10;

            return {
                hasValue: true,
                type: match[1].trim(),
                pickName: match[2].trim(),
                marketOdds: parseFloat(match[3]),
                fairOdds: parseFloat(match[4]),
                edge: parseFloat(match[5]),
                stake: finalStake
            };
        }
    }

    if (text.includes('Stake:')) {
         const legacyRegex = /\[?(💎|🛡️|⚖️|💰|HUNTER).*?:\s*(.*?)\s*@\s*([\d.]+).*?Edge:\s*(-?[\d.]+)%.*?Stake:\s*([\d.]+)u/;
         const match = text.match(legacyRegex);
         if (match) {
            let rawStake = parseFloat(match[5]);
            let finalStake = Math.max(0, Math.min(5, rawStake));
            finalStake = Math.round(finalStake * 10) / 10;
            
            return {
                hasValue: true,
                type: 'LEGACY',
                pickName: match[2].trim(),
                marketOdds: parseFloat(match[3]),
                edge: parseFloat(match[4]),
                stake: finalStake
            };
         }
    }
    
    return { hasValue: false, marketOdds: 0, edge: 0, pickName: '', stake: 0, type: '' };
}

async function check() {
  console.log("--- Scanning Database for Matches matching Frontend Regexes ---");
  
  // Page through matches to find any that parse as value
  let offset = 0;
  let limit = 2000;
  let parsedValueCount = 0;
  let matchesWithPicks = [];

  while (offset < 24000) {
    const { data, error } = await supabase
      .from('market_odds')
      .select('player1_name, player2_name, match_time, ai_analysis_text, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error page:', error);
      break;
    }

    if (!data || data.length === 0) break;

    for (const m of data) {
      const valInfo = parseValueFromText(m.ai_analysis_text);
      if (valInfo.hasValue) {
        parsedValueCount++;
        if (matchesWithPicks.length < 15) {
          matchesWithPicks.push({ match: m, valInfo });
        }
      }
    }

    offset += limit;
  }

  console.log(`Total matches parsed: ${offset}`);
  console.log(`Total matches that qualify as a Value Pick: ${parsedValueCount}`);

  if (matchesWithPicks.length > 0) {
    console.log("\nMatches qualifying as Value Picks:\n");
    matchesWithPicks.forEach((entry, idx) => {
      const m = entry.match;
      const v = entry.valInfo;
      console.log(`[${idx + 1}] ${m.player1_name} vs ${m.player2_name} | Match Time: ${m.match_time} | Created: ${m.created_at}`);
      console.log(`    - Type: ${v.type} | Pick: ${v.pickName} | Odds: ${v.marketOdds} | Fair: ${v.fairOdds} | Edge: ${v.edge}% | Stake: ${v.stake}u`);
      console.log(`    - Analysis Text: ${m.ai_analysis_text ? m.ai_analysis_text.substring(m.ai_analysis_text.indexOf('[')) : "NULL"}`);
      console.log("-----------------------------------------");
    });
  } else {
    console.log("No matches found in the entire database matching either regex.");
  }
}

check();
