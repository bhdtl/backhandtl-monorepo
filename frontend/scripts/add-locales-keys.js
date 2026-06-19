import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const enLocFile = path.join(__dirname, '../src/locales/en.json');
const enData = JSON.parse(fs.readFileSync(enLocFile, 'utf8'));

const newBlocks = {
  "courts": {
    "alerts": {
      "invalidBsi": "Invalid BSI rating. Must be between 1 and 100.",
      "saveError": "Failed to save court details.",
      "deleteConfirm": "Are you sure you want to delete this court?",
      "deleteError": "Failed to delete court."
    },
    "loading": "Loading courts data..."
  },
  "loadManagement": {
    "statusText": {
      "fresh": "FRESH",
      "critical": "CRITICAL LOAD",
      "heavy": "HEAVY LEGS",
      "rhythm": "MATCH RHYTHM"
    },
    "descriptions": {
      "fresh": "Optimal physical condition. No signs of fatigue expected.",
      "critical": "Extreme fatigue. Massive risk of performance drop in late sets.",
      "heavy": "Increased load over the last 2 weeks. Recovery deficit likely.",
      "rhythm": "Perfect match rhythm. Player is dialed in without being overworked."
    },
    "title": "Physiological Load Status",
    "timeOnCourt": "Time on Court (Last 14 Days)",
    "min": "Min",
    "assessment": "Load Assessment",
    "comebackRating": "Comeback Rating",
    "post1stSetLoss": "Post 1st-Set Loss",
    "statsSummary": "{{wins}}W – {{losses}}L ({{rate}}%)",
    "comebackDesc": "Measures the player's capacity to salvage a victory after losing the opening set, calculated from their recent match history logs."
  },
  "intelligence": {
    "briefings": "AI Intelligence Briefings",
    "viewHub": "View Hub",
    "noAlerts": "No recent intelligence alerts found. The player appears physically and mentally stable.",
    "keyTakeaways": "Key Takeaways:",
    "readOriginal": "Read Original Source",
    "scoutingDossier": "Scouting & Composure Dossier",
    "updated": "Updated",
    "coreStrengths": "Core Strengths",
    "noStrengths": "No strength details recorded.",
    "developmentAreas": "Development Areas",
    "noWeaknesses": "No vulnerability details recorded.",
    "psychologicalProfile": "Psychological Profile",
    "defaultMental": "Mental resilience indicators are standard. No specific composure alerts generated."
  },
  "scouting": {
    "defaultStrengths": "Elite baseline play, powerful first serve, and quick lateral court speed.",
    "defaultWeaknesses": "Vulnerable under pressure on second serve return; occasional unforced errors on high-bounce forehands.",
    "defaultMental": "Maintains high concentration levels. Demonstrates solid resilience in tiebreaks but occasionally lacks composure when facing early breaks."
  },
  "playerDropdown": {
    "unknownPlayer": "Unknown Player",
    "searchPlaceholder": "Search players by name...",
    "noResultsSearch": "No players found matching your search.",
    "noPlayers": "No players available."
  },
  "skillBar": {
    "ariaLabel": "Skill Rating"
  },
  "surfaceMastery": {
    "preferredSurface": "Preferred Surface",
    "specialist": "{{surface}} Specialist",
    "rating": {
      "average": "Average",
      "elite": "ELITE",
      "strong": "STRONG",
      "solid": "SOLID",
      "vulnerable": "VULNERABLE",
      "weakness": "WEAKNESS"
    },
    "matches": "{{count}} MATCHES",
    "best": "BEST"
  },
  "vegasForm": {
    "quantumEngine": "Quantum Form Engine",
    "form": "FORM",
    "recentForm": "Recent Form (Last 5)",
    "noMatchRecords": "No match records found.",
    "overallWinLoss": "Overall Win / Loss Rate",
    "filterSortMatches": "Filter & Sort Matches",
    "sort": "Sort",
    "newest": "Newest",
    "oldest": "Oldest",
    "matchLog": "Match Log & Betting Odds",
    "showingMatches": "Showing {{count}} Matches",
    "noMatchesFound": "No matches found matching the selected filters.",
    "quote": "Quote",
    "won": "Won",
    "lost": "Lost",
    "partnerOffer": "Exclusive Partner Offer",
    "liveAction": "NEO.bet Live Betting Action",
    "partnership": "Partnership",
    "partnerDesc": "Open a bet directly inside NEO.bet for this player's next match. Lock in premium ATP/WTA odds and leverage Backhand Tennis Line daily AI insights to maximize your edge.",
    "betLive": "Bet Live on NEO.bet"
  }
};

// Add to enData
Object.assign(enData, newBlocks);

// Ensure mobileMenu.nav exists
if (!enData.mobileMenu) enData.mobileMenu = {};
if (!enData.mobileMenu.nav) enData.mobileMenu.nav = {};
enData.mobileMenu.nav.tournamentOracle = "Tournament Oracle";

fs.writeFileSync(enLocFile, JSON.stringify(enData, null, 2), 'utf8');
console.log('Successfully added keys to en.json');
