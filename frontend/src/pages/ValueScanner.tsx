import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Zap, Search, Clock, ArrowDown,
  AlertTriangle, CheckCircle2, Shield, XCircle,
  ChevronRight, Filter, Lock, Crown, Target, Activity, HelpCircle, Eye, Settings,
  TrendingUp, TrendingDown, BookOpen, BarChart3, Crosshair, Layers, Flame, Wallet
} from 'lucide-react';
import { ScrollToTop } from '../components/ScrollToTop';
import { LoadingScreen } from '../components/LoadingScreen'; 
import { useTranslation } from 'react-i18next';
import { useAccess } from '../hooks/useAccess';
import { OddsMovementModal } from '../components/OddsMovementModal'; 
import { LiveValueMatch, Player, ParsedBet, GamesPrediction } from '../types/tennis'; 
import { QuantumGamesBadge } from '../components/QuantumGamesBadge';
import { PremiumLock } from '../components/PremiumLock';
import { trackEvent } from '../lib/analytics';

// --- SOTA COMPLIANCE: THE BULLETPROOF DENYLIST ---
const RESTRICTED_COUNTRIES = [
  'US', 'GB', 'CA', 'AU', 'NZ', 'DE', 'AT', 'CH', 'FR', 'IT', 'ES', 'NL', 'BE', 
  'SE', 'DK', 'FI', 'NO', 'IE', 'PT', 'PL', 'GR', 'CZ', 'RO', 'HU',
  'CW', 'AW', 'BQ', 'SX', 'MF',
  'CN', 'SG', 'AE', 'IR', 'KP', 'SY', 'CU', 'SD', 'RU'
];

// GeoAPI Configuration
const GEO_API_KEY = '3ecf375d0a953967bff0bd177a3c9978bcc54286';

// --- DB ROW INTERFACE ---
interface MarketOddsRow { 
  id: string; 
  player1_name: string; 
  player2_name: string; 
  odds1: number | null; 
  odds2: number | null; 
  tournament: string; 
  match_time: string | null; 
  ai_analysis_text?: string; 
  created_at?: string; 
  actual_winner_name?: string | null; 
  ai_fair_odds1?: number; 
  ai_fair_odds2?: number;
  opening_odds1?: number;
  opening_odds2?: number;
  games_prediction?: any; 
  is_visible_in_scanner?: boolean; 
  bookmaker_odds?: Record<string, { odds1: number, odds2: number }>;
}

// --- HELPER: UNIVERSAL VALUE PARSER ---
function parseBetFromText(text: string | undefined): ParsedBet {
  if (!text) {
      return { isBet: false, pickName: '', stake: 0, edge: 0, fairOdds: 0, marketOdds: 0, type: '' };
  }

  // 🚀 SOTA: Updated Regex to catch the exact Syndicate Labels (e.g. MAX BOMB) and Kelly Stake
  if (text.includes('[') && text.includes('Edge:')) {
      const regex = /\[(.*?):\s*(.*?)\s*@\s*([\d.]+)\s*\|\s*Fair:\s*([\d.]+)\s*\|\s*Edge:\s*(-?[\d.]+)%(?:\s*\|\s*Stake:\s*([\d.]+)u)?\]/;
      const match = text.match(regex);
      if (match) {
          let rawStake = match[6] ? parseFloat(match[6]) : 0;
          let finalStake = Math.max(0, Math.min(3, rawStake));
          finalStake = Math.round(finalStake * 10) / 10;

          return {
              isBet: true, 
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
          let finalStake = Math.max(0, Math.min(3, rawStake));
          finalStake = Math.round(finalStake * 10) / 10;

          return {
              isBet: true,
              type: 'LEGACY',
              pickName: match[2].trim(),
              marketOdds: parseFloat(match[3]),
              fairOdds: 0,
              edge: parseFloat(match[4]),
              stake: finalStake
          };
       }
  }
  
  return { isBet: false, pickName: '', stake: 0, edge: 0, fairOdds: 0, marketOdds: 0, type: '' };
}

function findBestPlayerMatch(scrapedName: string, allPlayers: Player[]): Player | undefined {
  if (!scrapedName) return undefined;
  const cleanScrape = scrapedName.trim().toLowerCase();
  const exactLast = allPlayers.find(p => p.last_name.toLowerCase() === cleanScrape);
  if (exactLast) return exactLast;
  return allPlayers.find(p => `${p.first_name} ${p.last_name}`.toLowerCase() === cleanScrape);
}

// --- TIME AGO CALCULATOR ---
function formatTimeAgo(dateString: string | undefined): { text: string, isHot: boolean, isWarm: boolean } {
  if (!dateString) return { text: '', isHot: false, isWarm: false };
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return { text: 'JUST NOW', isHot: true, isWarm: false };
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 15) return { text: `${diffInMinutes}M AGO`, isHot: true, isWarm: false };
  if (diffInMinutes < 60) return { text: `${diffInMinutes}M AGO`, isHot: false, isWarm: true };
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return { text: `${diffInHours}H AGO`, isHot: false, isWarm: false };
  
  const diffInDays = Math.floor(diffInHours / 24);
  return { text: `${diffInDays}D AGO`, isHot: false, isWarm: false };
}

// --- DYNAMIC COLOR SCALE ---
const getEdgeColorClass = (edge: number) => {
  if (edge >= 10) return 'text-tennis-lime'; 
  if (edge >= 5) return 'text-emerald-400';  
  if (edge >= 2) return 'text-[#ccff00]';    
  if (edge > 0) return 'text-yellow-400';    
  if (edge > -5) return 'text-orange-400';   
  return 'text-red-500';                     
};

// --- DYNAMIC BOOKMAKER COLORS ---
const getBookieColors = (bookieName: string) => {
  const name = bookieName.toLowerCase();
  if (name.includes('bet365')) return 'bg-[#007A5E] text-white border-[#009975]';
  if (name.includes('1xbet')) return 'bg-[#1C75BC] text-white border-[#2488D4]';
  if (name.includes('bwin')) return 'bg-[#E5B800] text-black border-[#FFCC00]';
  if (name.includes('pinnacle')) return 'bg-[#FF9900] text-black border-[#FFB84D]';
  if (name.includes('hardrock')) return 'bg-[#5B2B82] text-white border-[#7638A8]';
  if (name.includes('draftkings')) return 'bg-[#41B619] text-black border-[#54E322]';
  if (name.includes('fanduel')) return 'bg-[#212121] text-[#3FFF22] border-[#3FFF22]/50';
  if (name.includes('betmgm')) return 'bg-[#003B70] text-white border-[#005199]';
  if (name.includes('unibet')) return 'bg-[#FFC600] text-black border-[#FFD633]';
  return 'bg-white/10 text-gray-300 border-white/20'; 
};

const formatLastName = (fullName: string) => {
  if (!fullName) return "";
  const clean = fullName.trim();
  if (/\d/.test(clean) || clean.toLowerCase().includes('over') || clean.toLowerCase().includes('under')) {
    return clean;
  }
  const parts = clean.split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : clean;
};

// --- TACTICAL BRIEFING MODAL ---
function ValueScannerBriefing({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => { if (isOpen) setStep(0); }, [isOpen]);
  if (!isOpen) return null;

  const steps = [
      {
          title: "Live Value Stream",
          desc: "This feed finds mathematical value and edges in real-time. We compare 'Market Odds' against our AI's 'Fair Odds'.",
          icon: <Activity size={32} className="text-tennis-lime" />
      },
      {
          title: "Line Shopping",
          desc: "We scan all major books (bet365, Pinnacle, Hardrock) to guarantee you get the best possible price for the mathematical edge.",
          icon: <BookOpen size={32} className="text-purple-400" />
      },
      {
          title: "Deep Play Analytics",
          desc: "We don't just predict the winner. We analyze Set Betting (2:0), Handicaps, and Game Totals to find hidden edges.",
          icon: <Layers size={32} className="text-blue-400" />
      }
  ];

  const nextStep = () => {
      if (step < steps.length - 1) setStep(step + 1);
      else onClose();
  };

  return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose}></div>
          <div className="relative bg-[#1a1d26] border border-white/10 w-full max-w-md rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col items-center text-center transform-gpu will-change-transform">
              <div className="flex gap-2 mb-8">
                  {steps.map((_, i) => (
                      <div key={i} className={`h-1.5 w-12 rounded-full transition-opacity duration-300 ${i <= step ? 'bg-tennis-lime' : 'bg-white/10'}`} />
                  ))}
              </div>
              <div className="h-20 w-20 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center mb-6 shadow-lg shadow-black/50 animate-in zoom-in duration-300 key={step}">
                  {steps[step].icon}
              </div>

              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300" key={`t-${step}`}>
                  {steps[step].title}
              </h3>

              <p className="text-gray-400 text-sm font-medium leading-relaxed mb-8 h-16 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-75" key={`d-${step}`}>
                  {steps[step].desc}
              </p>

              <button onClick={nextStep} className="w-full py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-transform transform-gpu will-change-transform shadow-lg">
                  {step < steps.length - 1 ? "Next Step" : "Start Scanning"}
              </button>
          </div>
      </div>
  );
}

// --- SYNDICATE TYPE BADGE RENDERER ---
const renderTypeBadge = (typeStr: string) => {
  if (!typeStr) return null;
  let style = 'bg-white/10 text-gray-400 border-white/20';
  
  if (typeStr.includes('BOMB')) {
      style = 'bg-[#FF00FF]/10 text-[#FF00FF] border-[#FF00FF]/40 shadow-[0_0_8px_rgba(255,0,255,0.2)]';
  } else if (typeStr.includes('CONVICTION') || typeStr.includes('HIGH VALUE')) {
      style = 'bg-blue-500/10 text-blue-400 border-blue-500/40';
  } else if (typeStr.includes('CORE') || typeStr.includes('VALUE')) {
      style = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40';
  } else if (typeStr.includes('MICRO')) {
      style = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/40';
  } else if (typeStr.includes('VETO') || typeStr.includes('BAD')) {
      style = 'bg-red-500/10 text-red-500 border-red-500/40';
  } else if (typeStr.includes('ALPHA')) {
      style = 'bg-orange-500/10 text-orange-400 border-orange-500/40';
  }
  
  return (
      <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border whitespace-nowrap ${style}`}>
          {typeStr.replace(/[\[\]]/g, '').trim()}
      </div>
  );
};

// --- MAIN COMPONENT ---
export function ValueScanner() {
  const { t, i18n } = useTranslation();
  
  const { isElite, loading: accessLoading } = useAccess();

  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'EDGE' | 'CONFIDENCE' | 'TIME'>('NEWEST');
   
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('en-CA'));
  const [selectedMatch, setSelectedMatch] = useState<LiveValueMatch | null>(null);
  
  const [showTutorial, setShowTutorial] = useState(false);
  const [isGeoSafe, setIsGeoSafe] = useState<boolean>(false);

  const [availableBookies, setAvailableBookies] = useState<string[]>([]);
  const [preferredBookie, setPreferredBookie] = useState<string>('ALL');

  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenValueTutorial');
    if (!hasSeen) {
        setTimeout(() => setShowTutorial(true), 1500);
        localStorage.setItem('hasSeenValueTutorial', 'true');
    }
  }, []);

  useEffect(() => {
      const verifyGeoLocation = async () => {
          try {
              if (sessionStorage.getItem('api_geo_clearance')) {
                  setIsGeoSafe(sessionStorage.getItem('api_geo_clearance') === 'granted');
                  return;
              }

              const response = await fetch(`https://api.getgeoapi.com/v2/ip/check?api_key=${GEO_API_KEY}&format=json&filter=country`);
              if (!response.ok) throw new Error('GeoAPI Network Error');
              const data = await response.json();

              if (data.status === 'success' && data.country && data.country.code) {
                  const countryCode = data.country.code.toUpperCase();
                  if (RESTRICTED_COUNTRIES.includes(countryCode)) {
                      setIsGeoSafe(false);
                      sessionStorage.setItem('api_geo_clearance', 'denied');
                  } else {
                      setIsGeoSafe(true);
                      sessionStorage.setItem('api_geo_clearance', 'granted');
                  }
              }
          } catch (error) {
              setIsGeoSafe(false);
          }
      };
      verifyGeoLocation();
  }, []);

  useEffect(() => {
    if (!accessLoading && isElite) {
        trackEvent('value_scanner_view', {});
    }
  }, [isElite, accessLoading]);

  const datePills = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push({
        label: i === 0 ? t('valueScanner.dates.today') : i === 1 ? t('valueScanner.dates.tomorrow') : d.toLocaleDateString(i18n.language, { weekday: 'short' }),
        value: d.toLocaleDateString('en-CA'), 
        dayNum: d.getDate()
      });
    }
    return dates;
  }, [t, i18n.language]);

  useEffect(() => {
    loadData();
    const channel = supabase.channel('schema-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'market_odds' }, () => runScanner())
        .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []); 

  const loadData = async () => { 
      try { 
          setLoading(true); 
          await runScanner(); 
      } finally { 
          setLoading(false); 
      } 
  };

  const runScanner = async () => {
    try {
      const { data: rawMarketData } = await supabase
        .from('market_odds')
        .select('*')
        .eq('is_visible_in_scanner', true) 
        .order('created_at', { ascending: false })
        .limit(800);
        
      const { data: playersData } = await supabase.from('players').select('*');

      if (rawMarketData && playersData) {
        const tempBookies = new Set<string>();

        const detectedMatches = rawMarketData.map((row: MarketOddsRow) => {
          const p1Name = (row.player1_name || 'Unknown').trim().toLowerCase();
          const p2Name = (row.player2_name || 'Unknown').trim().toLowerCase();

          const playerA = findBestPlayerMatch(p1Name, playersData) || { 
              id: '0', first_name: '', last_name: row.player1_name || 'Unknown', country: '', profile_image_url: '' 
          } as Player;
          
          const playerB = findBestPlayerMatch(p2Name, playersData) || { 
              id: '0', first_name: '', last_name: row.player2_name || 'Unknown', country: '', profile_image_url: '' 
          } as Player;

          let betInfo = parseBetFromText(row.ai_analysis_text);

          let baseOddsA = row.odds1 || row.opening_odds1 || 0;
          let baseOddsB = row.odds2 || row.opening_odds2 || 0;
          
          const bookieOdds = row.bookmaker_odds || {};
          Object.keys(bookieOdds).forEach(b => tempBookies.add(b));

          Object.values(bookieOdds).forEach((odds: any) => {
              if (odds.odds1 > baseOddsA) baseOddsA = odds.odds1;
              if (odds.odds2 > baseOddsB) baseOddsB = odds.odds2;
          });

          let mDate = new Date().toLocaleDateString('en-CA'); 
          let commencingTime = 'TBD';
          try {
              let sourceDateStr = row.match_time || row.created_at;
              if (sourceDateStr) {
                  const dateObj = new Date(sourceDateStr);
                  if (!isNaN(dateObj.getTime())) {
                      mDate = dateObj.toLocaleDateString('en-CA');
                      commencingTime = new Intl.DateTimeFormat(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                      }).format(dateObj);
                  }
              }
          } catch(e) {}

          let derivativeAlert = null;
          if (row.ai_analysis_text && row.ai_analysis_text.includes('[🔥 MASSIVE')) {
              const match = row.ai_analysis_text.match(/\[(🔥 MASSIVE.*?)\]/);
              if (match) {
                  derivativeAlert = match[1];
              }
          }

          return {
            id: row.id, 
            playerA, 
            playerB, 
            baseOddsA,
            baseOddsB, 
            openOdds1: row.opening_odds1,
            openOdds2: row.opening_odds2,
            betInfo: betInfo, 
            derivativeAlert: derivativeAlert,
            tournament: (row.tournament || 'Unknown').replace(/[A-Z0-9]{6,}$/, '').trim(),
            commencing: commencingTime, 
            matchDate: mDate,
            actualWinnerName: row.actual_winner_name,
            games_prediction: row.games_prediction, 
            bookmakerOdds: bookieOdds,
            ai_fair_odds1: row.ai_fair_odds1,
            ai_fair_odds2: row.ai_fair_odds2,
            created_at: row.created_at
          }; 

        }).filter(m => m !== null);

        setAvailableBookies(Array.from(tempBookies).sort());
        setMatches(detectedMatches);
      }
    } catch (e) {} 
  };

  const handleMatchClick = (match: any) => {
    setSelectedMatch(match);
  };

  const handleDateChange = (dateValue: string, label: string) => {
      setSelectedDate(dateValue);
  };

  const handleSortChange = (sortId: any) => {
      setSortBy(sortId);
  };

  if (accessLoading) {
      return <LoadingScreen message="Verifying Clearance & Systems..." />;
  }

  if (loading && matches.length === 0) return <LoadingScreen message={t('valueScanner.loading')} />;

  // 🚀 SOTA DYNAMIC RENDER PIPELINE (SYNDICATE READY)
  const processedMatches = matches
    .map((m: any) => {
        let currentOddsA = m.baseOddsA;
        let currentOddsB = m.baseOddsB;
        let currentBetInfo = { ...m.betInfo };

        if (preferredBookie !== 'ALL') {
            if (m.bookmakerOdds && m.bookmakerOdds[preferredBookie]) {
                currentOddsA = m.bookmakerOdds[preferredBookie].odds1 || 0;
                currentOddsB = m.bookmakerOdds[preferredBookie].odds2 || 0;
            } else {
                currentOddsA = 0;
                currentOddsB = 0;
            }
        }

        let fair1 = m.ai_fair_odds1;
        let fair2 = m.ai_fair_odds2;

        if (!fair1 || !fair2 || fair1 === 0 || fair2 === 0) {
            if (currentOddsA > 1 && currentOddsB > 1) {
                const implied1 = 1 / currentOddsA;
                const implied2 = 1 / currentOddsB;
                const trueProb1 = implied1 / (implied1 + implied2);
                fair1 = 1 / trueProb1;
                fair2 = 1 / (1 - trueProb1);
            } else {
                fair1 = 1.90;
                fair2 = 1.90;
            }
        }

        // 🚀 SOTA: If the Backend properly labeled and processed it, respect it!
        if (currentBetInfo.isBet) {
            const isP1Pick = currentBetInfo.pickName.toLowerCase().includes((m.playerA?.last_name || '').toLowerCase());
            const currentOdds = isP1Pick ? currentOddsA : currentOddsB;
            const currentFair = isP1Pick ? fair1 : fair2;
            const currentEdge = currentFair > 0 ? ((currentOdds / currentFair) - 1) * 100 : currentBetInfo.edge;
            
            currentBetInfo = {
                ...currentBetInfo,
                marketOdds: currentOdds,
                fairOdds: currentFair,
                edge: currentEdge
            };
        } else {
            // Fallback for matches without clear AI labels
            if (currentOddsA > 0 && currentOddsB > 0) {
                 const edge1 = ((currentOddsA / fair1) - 1) * 100;
                 const edge2 = ((currentOddsB / fair2) - 1) * 100;
                 
                 if (edge1 >= edge2) {
                     currentBetInfo = { 
                         ...currentBetInfo, 
                         isBet: true, 
                         pickName: m.playerA?.last_name || 'Player 1', 
                         marketOdds: currentOddsA, 
                         fairOdds: fair1, 
                         edge: edge1, 
                         type: edge1 >= 5 ? '🔥 HIGH VALUE' : (edge1 > 0 ? '📈 VALUE' : '❄️ BAD VALUE'),
                         stake: 0
                     };
                 } else {
                     currentBetInfo = { 
                         ...currentBetInfo, 
                         isBet: true, 
                         pickName: m.playerB?.last_name || 'Player 2', 
                         marketOdds: currentOddsB, 
                         fairOdds: fair2, 
                         edge: edge2, 
                         type: edge2 >= 5 ? '🔥 HIGH VALUE' : (edge2 > 0 ? '📈 VALUE' : '❄️ BAD VALUE'),
                         stake: 0
                     };
                 }
            } else {
                 currentBetInfo.edge = 0;
                 currentBetInfo.pickName = m.playerA?.last_name || 'Player 1';
            }
        }

        let predictionStatus: 'PENDING' | 'CORRECT' | 'WRONG' = 'PENDING';
        if (m.actualWinnerName) {
            const winner = m.actualWinnerName.toLowerCase();
            const pick = (currentBetInfo.pickName || '').toLowerCase(); 
            if (pick) {
                if (winner.includes(pick) || pick.includes(winner) || pick.split(' ').some((p: string) => winner.includes(p))) predictionStatus = 'CORRECT';
                else predictionStatus = 'WRONG';
            }
        }

        return {
            ...m,
            marketOddsA: currentOddsA,
            marketOddsB: currentOddsB,
            betInfo: currentBetInfo,
            status: predictionStatus === 'CORRECT' ? 'WON' : (predictionStatus === 'WRONG' ? 'LOST' : 'PENDING')
        };
    })
    .filter((m: any) => {
        const playerAName = m.playerA?.last_name || '';
        const playerBName = m.playerB?.last_name || '';
        const tournamentName = m.tournament || '';

        return (
            (playerAName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             playerBName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             tournamentName.toLowerCase().includes(searchTerm.toLowerCase()))
            &&
            (m.matchDate === selectedDate) &&
            (m.marketOddsA > 0 && m.marketOddsB > 0) &&
            (m.marketOddsA !== m.marketOddsB)
        );
    })
    .sort((a: any, b: any) => {
        const isFinishedA = a.status !== 'PENDING';
        const isFinishedB = b.status !== 'PENDING';

        if (isFinishedA && !isFinishedB) return 1;
        if (!isFinishedA && isFinishedB) return -1;

        if (sortBy === 'NEWEST') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        if (sortBy === 'EDGE') return (b.betInfo?.edge || 0) - (a.betInfo?.edge || 0);
        if (sortBy === 'CONFIDENCE') return (b.betInfo?.stake || 0) - (a.betInfo?.stake || 0);
        if (sortBy === 'TIME') return (a.commencing || '').localeCompare(b.commencing || '');

        return 0;
    });

  return (
    <div className="pb-32 w-full max-w-5xl mx-auto px-4 md:px-6 relative">
      <ScrollToTop />
      <ValueScannerBriefing isOpen={showTutorial} onClose={() => setShowTutorial(false)} />

      {selectedMatch && (
        <OddsMovementModal
          match={selectedMatch as LiveValueMatch}
          isOpen={!!selectedMatch}
          onClose={() => setSelectedMatch(null)}
        />
      )}

      <div className="mt-8 md:mt-12 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-tennis-lime font-black text-[9px] uppercase tracking-[0.4em] mb-3">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-tennis-lime opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-tennis-lime"></span></span>
              {t('valueScanner.header.badge')}
            </div>
            
            <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTutorial(true)}
                  className="flex items-center justify-center p-2.5 bg-[#1a1d26] rounded-full border border-white/10 hover:border-tennis-lime transition-colors text-gray-400 hover:text-tennis-lime shadow-lg transform-gpu will-change-transform"
                  title="Guide"
                >
                    <HelpCircle size={16} />
                </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none mb-2">{t('valueScanner.header.title')}</h1>
                <p className="text-gray-500 font-medium text-xs">Finding mathematical value and edges in real-time</p>
              </div>
          </div>
      </div>

      <PremiumLock
        isLocked={!isElite}
        minTier="ELITE"
        title="Elite Intelligence"
        description="The Value Scanner identifies mathematical edges in real-time. Upgrade to Elite to access this professional trading tool."
        blurAmount="blur-lg"
      >
          {/* TIME STRIP */}
          <div className="relative -mx-4 px-4 md:mx-0 md:px-0 mb-6 group">
              <div className="flex overflow-x-auto no-scrollbar gap-2.5 pb-1 snap-x snap-mandatory">
                    {(datePills || []).map((d) => (
                        <button
                            key={d.value}
                            onClick={() => handleDateChange(d.value, d.label)}
                            className={`snap-start flex flex-col items-center justify-center min-w-[65px] h-[70px] rounded-2xl border transition-[border-color,background-color,color] duration-300 flex-shrink-0 relative overflow-hidden transform-gpu will-change-transform
                            ${selectedDate === d.value
                                ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.15)] scale-[1.02]'
                                : 'bg-[#1a1d26] text-gray-500 border-white/5 hover:bg-[#252833] hover:border-white/10'}`}
                        >
                            <span className="text-[9px] font-bold uppercase tracking-wider mb-1 opacity-80">{d.label}</span>
                            <span className={`text-xl font-black leading-none ${selectedDate === d.value ? 'text-black' : 'text-gray-300'}`}>{d.dayNum}</span>
                            {selectedDate === d.value && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-tennis-lime"></div>
                            )}
                        </button>
                    ))}
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0f1115] to-transparent pointer-events-none md:hidden"></div>
          </div>

          {/* FILTER & SEARCH BAR */}
          <div className="bg-[#15171e] p-2.5 rounded-2xl border border-white/5 mb-6 flex flex-col md:flex-row gap-3 items-center shadow-lg">
            <div className="relative flex-1 w-full flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                    <input type="text" placeholder={t('valueScanner.filters.search')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-black/20 text-white pl-10 pr-4 py-3 rounded-xl outline-none placeholder:text-gray-600 font-bold text-xs border border-transparent focus:border-white/10 transition-all" />
                </div>
                
                {availableBookies.length > 0 && (
                    <div className="relative min-w-[140px]">
                        <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <select 
                            value={preferredBookie} 
                            onChange={(e) => setPreferredBookie(e.target.value)}
                            className="w-full bg-black/20 text-white pl-10 pr-4 py-3 rounded-xl outline-none font-bold text-xs border border-transparent focus:border-white/10 transition-all appearance-none cursor-pointer"
                        >
                            <option value="ALL">Best Market Odds</option>
                            {availableBookies.map(b => (
                                <option key={b} value={b}>{b.toUpperCase()}</option>
                            ))}
                        </select>
                        <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none rotate-90" />
                    </div>
                )}
            </div>
            
            <div className="flex w-full md:w-auto gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                {[
                    { id: 'NEWEST', icon: Flame, label: 'Latest Drops' },
                    { id: 'EDGE', icon: Zap, label: t('valueScanner.sort.edge') },
                    { id: 'CONFIDENCE', icon: Wallet, label: 'Stake Size' },
                    { id: 'TIME', icon: Clock, label: t('valueScanner.sort.time') }
                ].map((sort) => (
                    <button
                        key={sort.id}
                        onClick={() => handleSortChange(sort.id as any)}
                        className={`flex-1 md:flex-none whitespace-nowrap px-4 py-3 md:py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 border transform-gpu will-change-transform
                        ${sortBy === sort.id
                            ? 'bg-white text-black border-white shadow-lg'
                            : 'bg-black/20 text-gray-500 border-transparent hover:bg-black/40'}`}
                    >
                        <sort.icon size={12} className={sortBy === sort.id && sort.id === 'NEWEST' ? 'text-orange-500' : ''} /> {sort.label}
                    </button>
                ))}
            </div>
          </div>

          {/* MATCH LIST AREA */}
          <div className="space-y-4">
            {processedMatches.length > 0 ? processedMatches.map((match: any) => {
                const analysis = match.betInfo;
                const isFinished = match.status !== 'PENDING';
                const predictionStatus = match.status;

                const safePlayerAName = match.playerA?.last_name || '';
                const safePlayerBName = match.playerB?.last_name || '';
                
                const safePickName = analysis.pickName || safePlayerAName || 'Player';
                const p1IsPick = safePickName ? (safePickName.toLowerCase().includes(safePlayerAName.toLowerCase()) || safePlayerAName.toLowerCase().includes(safePickName.toLowerCase())) : false;
                
                let fairA = 0, fairB = 0;

                const safeFairOdds = analysis.fairOdds || 0;
                if (safeFairOdds > 0) {
                    const prob = 1 / safeFairOdds;
                    if (p1IsPick) { 
                        fairA = safeFairOdds; 
                        fairB = prob < 0.99 ? 1 / (1 - prob) : 99; 
                    } else { 
                        fairB = safeFairOdds; 
                        fairA = prob < 0.99 ? 1 / (1 - prob) : 99; 
                    }
                } else if (match.ai_fair_odds1 && match.ai_fair_odds2) {
                     fairA = match.ai_fair_odds1;
                     fairB = match.ai_fair_odds2;
                }

                const safeEdge = analysis.edge || 0;
                const edgeColorClass = getEdgeColorClass(safeEdge);

                // Line Movement
                const activePickOpenOdds = p1IsPick ? match.openOdds1 : match.openOdds2;
                const activePickCurrentOdds = p1IsPick ? match.marketOddsA : match.marketOddsB;
                const hasMovement = activePickOpenOdds && activePickOpenOdds > 0 && Math.abs(activePickOpenOdds - activePickCurrentOdds) > 0.02;
                const isSharpDumping = activePickCurrentOdds < activePickOpenOdds; 

                const h2hRecord = match.games_prediction?.h2h || "0 - 0";
                const setProbs = match.games_prediction?.set_probs || null;
                const projectedHandicap = match.games_prediction?.projected_handicap || null;
                const probabilitiesJSON = match.games_prediction?.probabilities || {};
                
                const altPlays: any[] = [];
                
                // 1. Set Betting Edge
                if (setProbs) {
                    if (p1IsPick && setProbs["2:0"] >= 55) {
                        altPlays.push({ 
                            type: "Set Edge", 
                            label: `2:0 ${formatLastName(safePlayerAName)}`, 
                            prob: setProbs["2:0"], 
                            fairOdds: (1 / (setProbs["2:0"]/100)).toFixed(2), 
                            marketOdds: match.bookmakerOdds?.bet365?.odds1 || "Market", 
                            icon: Layers, color: "text-blue-400", border: "border-blue-500/20", bg: "bg-blue-500/10" 
                        });
                    } else if (!p1IsPick && setProbs["0:2"] >= 55) {
                        altPlays.push({ 
                            type: "Set Edge", 
                            label: `2:0 ${formatLastName(safePlayerBName)}`, 
                            prob: setProbs["0:2"], 
                            fairOdds: (1 / (setProbs["0:2"]/100)).toFixed(2), 
                            marketOdds: match.bookmakerOdds?.bet365?.odds2 || "Market", 
                            icon: Layers, color: "text-blue-400", border: "border-blue-500/20", bg: "bg-blue-500/10" 
                        });
                    }
                }
                
                // 2. Projected Handicap
                if (projectedHandicap !== null) {
                    const p1FairLine = -projectedHandicap;
                    const p2FairLine = projectedHandicap;
                    const activeFairLine = p1IsPick ? p1FairLine : p2FairLine;
                    
                    if (Math.abs(activeFairLine) >= 1.0) {
                        const sign = activeFairLine > 0 ? '+' : '';
                        const roundedLine = (Math.round(activeFairLine * 2) / 2).toFixed(1);
                        altPlays.push({ 
                            type: "Proj. Spread", 
                            label: `${formatLastName(p1IsPick ? safePlayerAName : safePlayerBName)}`, 
                            isTarget: true,
                            targetValue: `${sign}${roundedLine} Games`,
                            subText: "AI Expected Spread",
                            icon: BarChart3, color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/10" 
                        });
                    }
                }

                // 3. Exact Dynamic Over/Under
                const dynamicOUKey = Object.keys(probabilitiesJSON).find(k => k.startsWith('over_') && !['over_20_5', 'over_21_5', 'over_22_5', 'over_23_5'].includes(k));
                if (dynamicOUKey) {
                    const actualLineValue = dynamicOUKey.split('_')[1];
                    const overProb = probabilitiesJSON[dynamicOUKey] * 100;
                    
                    if (overProb >= 55) {
                        altPlays.push({ 
                            type: "Totals", 
                            label: `OVER ${actualLineValue} Games`, 
                            prob: overProb.toFixed(1), 
                            fairOdds: (1/(overProb/100)).toFixed(2), 
                            marketOdds: "Market", 
                            icon: Target, color: "text-purple-400", border: "border-purple-500/20", bg: "bg-purple-500/10" 
                        });
                    } else if (overProb <= 45) {
                        const underProb = 100 - overProb;
                        altPlays.push({ 
                            type: "Totals", 
                            label: `UNDER ${actualLineValue} Games`, 
                            prob: underProb.toFixed(1), 
                            fairOdds: (1/(underProb/100)).toFixed(2), 
                            marketOdds: "Market", 
                            icon: Target, color: "text-purple-400", border: "border-purple-500/20", bg: "bg-purple-500/10" 
                        });
                    }
                }

                const timeAgoInfo = formatTimeAgo(match.created_at);

                return (
                  <div
                    key={match.id}
                    className={`relative group bg-[#15171e] border rounded-[1.5rem] p-5 hover:border-white/10 transition-[border-color] shadow-xl overflow-hidden active:scale-[0.99] duration-200 transform-gpu will-change-transform
                    ${predictionStatus === 'WON' ? 'border-tennis-lime/40' : (predictionStatus === 'LOST' ? 'border-red-500/30' : 'border-white/5')}
                    `}
                  >
                    
                    {/* --- HEADER --- */}
                    <div className="flex justify-between items-center mb-5 opacity-100 z-10 relative pl-2 cursor-pointer" onClick={() => handleMatchClick(match)}>
                        <div className={`flex items-center gap-2 ${isFinished ? 'opacity-70' : 'opacity-100'}`}>
                            <span className="px-2 py-0.5 rounded text-[8px] font-black text-gray-400 bg-white/5 border border-white/5 uppercase tracking-wide truncate max-w-[120px]">
                                {match.tournament}
                            </span>
                            <div className="h-3 w-px bg-white/10"></div>
                            <span className="text-[9px] font-mono text-gray-500 flex items-center gap-1">
                                <Clock size={10} /> {match.commencing}
                            </span>

                            {!isFinished && timeAgoInfo.text && (
                                <div className={`ml-2 px-1.5 py-0.5 rounded flex items-center gap-1 text-[8px] font-black uppercase tracking-wider
                                    ${timeAgoInfo.isHot ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 animate-pulse' : 
                                      timeAgoInfo.isWarm ? 'bg-yellow-500/10 text-yellow-500/80 border border-yellow-500/20' : 
                                      'bg-white/5 text-gray-500 border border-white/5'}`}
                                >
                                    {timeAgoInfo.isHot && <Flame size={8} />}
                                    {timeAgoInfo.text}
                                </div>
                            )}
                        </div>

                        {!isFinished ? (
                              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-lg backdrop-blur-sm bg-black/20 border-white/5`}>
                                 <Activity size={10} className={edgeColorClass} />
                                 <span className={`text-[9px] font-black uppercase tracking-widest ${edgeColorClass}`}>
                                     {safeEdge > 0 ? '+' : ''}{safeEdge.toFixed(1)}% EDGE
                                 </span>
                              </div>
                        ) : (
                            predictionStatus === 'WON' ? (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-tennis-lime/40 bg-tennis-lime/10 text-tennis-lime shadow-[0_0_10px_rgba(204,255,0,0.2)]">
                                    <CheckCircle2 size={12} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">{t('valueScanner.card.won')}</span>
                                </div>
                            ) : predictionStatus === 'LOST' ? (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-red-500/30 bg-red-500/10 text-red-500">
                                    <XCircle size={12} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">{t('valueScanner.card.miss')}</span>
                                </div>
                            ) : null
                        )}
                    </div>

                    {/* --- CONTENT --- */}
                    <div className={`transition-opacity duration-500 ${isFinished ? 'opacity-40 blur-[1px] grayscale' : ''}`}>
                        <div className="flex items-center justify-between mb-5 cursor-pointer" onClick={() => handleMatchClick(match)}>
                              <div className="flex flex-col w-[35%]">
                                  <div className={`text-sm font-black uppercase leading-none truncate mb-1 ${p1IsPick ? 'text-white' : 'text-gray-400'}`}>
                                      {formatLastName(match.playerA?.last_name || safePlayerAName || 'Unknown')}
                                  </div>
                                  <div className="text-[10px] font-mono font-medium text-gray-500">Best: <span className="text-white">{(match.marketOddsA || 0).toFixed(2)}</span></div>
                              </div>

                              <div className="flex flex-col items-center justify-center w-[30%]">
                                  <div className="bg-black/40 px-2 md:px-3 py-1.5 rounded-lg border border-white/5 flex flex-col items-center shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                                      <span className="text-[6px] md:text-[8px] font-black text-tennis-lime uppercase tracking-widest mb-0.5">{t('valueScanner.card.trueFair')}</span>
                                      <div className="flex flex-col md:flex-row items-center gap-0 md:gap-2 font-mono text-[10px] md:text-[11px] font-bold leading-tight">
                                          <span className={fairA < fairB ? 'text-white' : 'text-gray-500'}>{fairA > 0 ? fairA.toFixed(2) : '-'}</span>
                                          <span className="text-gray-700 hidden md:inline">/</span>
                                          <span className={fairB < fairA ? 'text-white' : 'text-gray-500'}>{fairB > 0 ? fairB.toFixed(2) : '-'}</span>
                                      </div>
                                  </div>
                              </div>

                              <div className="flex flex-col items-end text-right w-[35%]">
                                  <div className={`text-sm font-black uppercase leading-none truncate mb-1 ${!p1IsPick ? 'text-white' : 'text-gray-400'}`}>
                                      {formatLastName(match.playerB?.last_name || safePlayerBName || 'Unknown')}
                                  </div>
                                  <div className="text-[10px] font-mono font-medium text-gray-500">Best: <span className="text-white">{(match.marketOddsB || 0).toFixed(2)}</span></div>
                              </div>
                        </div>

                        {match.derivativeAlert && !isFinished && (
                            <div className="mb-4 bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 flex items-start gap-3 shadow-inner">
                                <AlertTriangle className="text-orange-500 flex-shrink-0 mt-0.5" size={16} />
                                <div>
                                    <div className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Derivative Edge Detected</div>
                                    <div className="text-xs text-orange-100 font-medium leading-snug">{match.derivativeAlert.replace('🔥 MASSIVE OVER EDGE:', '').replace('🔥 MASSIVE UNDER EDGE:', '').trim()}</div>
                                </div>
                            </div>
                        )}

                        {match.games_prediction?.pattern_warning && !isFinished && (
                            <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-3 shadow-inner">
                                <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                                <div>
                                    <div className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Historical Pattern Risk</div>
                                    <div className="text-xs text-red-100 font-medium leading-snug">{match.games_prediction.pattern_warning}</div>
                                </div>
                            </div>
                        )}

                        {match.games_prediction?.pattern_boost && !isFinished && (
                            <div className="mb-4 bg-tennis-lime/10 border border-tennis-lime/30 rounded-lg p-3 flex items-start gap-3 shadow-inner">
                                <Zap className="text-tennis-lime flex-shrink-0 mt-0.5" size={16} />
                                <div>
                                    <div className="text-[10px] font-black text-tennis-lime uppercase tracking-widest mb-1">Historical Pattern Edge</div>
                                    <div className="text-xs text-tennis-lime/90 font-medium leading-snug">{match.games_prediction.pattern_boost}</div>
                                </div>
                            </div>
                        )}

                        {match.games_prediction && !isFinished && !match.derivativeAlert && (
                            <div className="mb-4">
                                <QuantumGamesBadge prediction={match.games_prediction} />
                            </div>
                        )}

                        {!isFinished && (
                            <div className="space-y-2">
                                {/* H2H STRIP */}
                                <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar pb-1">
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10 whitespace-nowrap">
                                        <Crosshair size={10} className="text-purple-400" />
                                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">H2H: <span className="text-white">{h2hRecord}</span></span>
                                    </div>
                                </div>

                                {/* 🚀 MAIN VALUE BAR WITH SOTA SYNDICATE BADGE */}
                                <div className="bg-gradient-to-r from-white/[0.05] to-transparent rounded-lg px-3 py-2 flex justify-between items-center border border-white/10 border-l-2 border-l-tennis-lime shadow-lg">
                                     <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-3">
                                         <span className="text-[9px] font-bold text-gray-300 uppercase tracking-wide">
                                             Pick: <span className="text-white font-black">{formatLastName(safePickName)}</span>
                                         </span>
                                         {renderTypeBadge(analysis.type)}
                                         {match.games_prediction?.is_grand_slam && (
                                             <div className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-yellow-500/10 text-yellow-400 border border-yellow-500/40 shadow-[0_0_8px_rgba(234,179,8,0.2)] flex items-center gap-1 shrink-0">
                                                 <span>🎾</span> Slam (Bo5)
                                             </div>
                                         )}
                                     </div>

                                     <div className="flex items-center gap-3">
                                         {hasMovement && (
                                            <div className={`flex items-center gap-0.5 text-[8px] font-mono font-black ${isSharpDumping ? 'text-tennis-lime' : 'text-red-500'} bg-black/40 px-1.5 py-0.5 rounded border border-white/5`} title={`Opening Line: ${activePickOpenOdds.toFixed(2)}`}>
                                                {isSharpDumping ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                                                <span>{activePickOpenOdds.toFixed(2)} ➔ {activePickCurrentOdds.toFixed(2)}</span>
                                            </div>
                                         )}
                                         
                                         {analysis.stake > 0 && (
                                            <div className="flex items-center gap-1 bg-tennis-lime/10 border border-tennis-lime/20 px-1.5 py-0.5 rounded">
                                                <Wallet size={10} className="text-tennis-lime" />
                                                <span className="text-[9px] font-mono font-black text-tennis-lime">{analysis.stake.toFixed(1)}u</span>
                                            </div>
                                         )}

                                         <div className="text-[9px] font-mono text-gray-500">
                                             FAIR: <span className="text-white font-bold">{safeFairOdds.toFixed(2)}</span>
                                         </div>
                                         <div className={`flex items-center gap-1 text-[10px] font-black ${edgeColorClass}`}>
                                             <Zap size={12} />
                                             {safeEdge > 0 ? '+' : ''}{safeEdge.toFixed(1)}%
                                         </div>
                                     </div>
                                </div>

                                {/* ALT PLAYS */}
                                {altPlays.map((play, i) => (
                                    <div key={i} className={`${play.bg} rounded-lg px-3 py-2 flex justify-between items-center border ${play.border} shadow-inner`}>
                                        <div className="flex items-center gap-1.5 w-[30%]">
                                            <play.icon size={10} className={play.color} />
                                            <span className={`text-[8px] font-black uppercase tracking-widest ${play.color}`}>{play.type}</span>
                                        </div>
                                        <span className="text-[9px] font-bold text-white uppercase text-center w-[40%]">{play.label}</span>
                                        <div className="flex flex-col items-end w-[30%]">
                                            {play.isTarget ? (
                                                <>
                                                    <span className={`text-[9px] font-mono font-bold ${play.color}`}>{play.targetValue}</span>
                                                    <span className="text-[7px] text-gray-500 font-black uppercase tracking-wider mt-0.5">{play.subText}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-1">
                                                        <span className={`text-[9px] font-mono font-bold ${play.color}`}>{play.prob}% Prob</span>
                                                        {play.marketOdds && play.marketOdds !== "Market" && (
                                                            <>
                                                                <span className="text-[9px] text-gray-500">/</span>
                                                                <span className="text-[9px] font-mono text-white font-bold">@{play.marketOdds}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <span className="text-[7px] text-gray-500 font-black uppercase tracking-wider mt-0.5">Fair Odds: {play.fairOdds}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* LINE SHOPPING STRIP */}
                                {match.bookmakerOdds && Object.keys(match.bookmakerOdds).length > 0 && (
                                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 pb-1">
                                        <div className="text-[7px] font-black text-gray-500 uppercase tracking-[0.2em] whitespace-nowrap pl-1">Best Lines:</div>
                                        {Object.entries(match.bookmakerOdds).sort(([bookieA, oddsA]: any, [bookieB, oddsB]: any) => {
                                            const valA = p1IsPick ? oddsA.odds1 : oddsA.odds2;
                                            const valB = p1IsPick ? oddsB.odds1 : oddsB.odds2;
                                            return valB - valA; 
                                        }).map(([bookie, odds]: any) => {
                                            const bookieOddsVal = p1IsPick ? odds.odds1 : odds.odds2;
                                            if (!bookieOddsVal || bookieOddsVal <= 1.01) return null;
                                            
                                            const isBest = bookieOddsVal === activePickCurrentOdds;
                                            const bookieStyle = getBookieColors(bookie);

                                            return (
                                                <div key={bookie} className={`flex items-center flex-shrink-0 gap-1.5 px-2 py-1 rounded-md border ${isBest ? 'opacity-100 ring-1 ring-white/30 shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'opacity-50 grayscale-[50%]'} ${bookieStyle}`}>
                                                    <span className="text-[8px] font-black uppercase tracking-wider">{bookie}</span>
                                                    <div className="w-px h-2.5 bg-white/20"></div>
                                                    <span className="text-[9px] font-mono font-bold">{bookieOddsVal.toFixed(2)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* 🚀 SOTA: NEO.bet 1-Click Wettschein CTA */}
                                <div className="mt-4 flex flex-col gap-1.5 border-t border-white/5 pt-3">
                                    <a 
                                        href={match.games_prediction?.neo_betslip?.url 
                                            ? `${match.games_prediction.neo_betslip.url}-scanner-cta` 
                                            : `https://neo.bet/de/Sportwetten/Tennis?betslip=compact&se=${match.neo_contest_id || match.id}!Set_MATCH_HC2W(0.0)!${p1IsPick ? '1' : '2'}&affiliateId=backhandtl-scanner-cta`
                                        }
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="w-full py-2.5 bg-white/[0.03] border border-white/10 text-gray-200 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-tennis-lime hover:text-black hover:border-tennis-lime hover:shadow-[0_0_25px_rgba(132,204,22,0.4)] transition-all duration-300 flex items-center justify-center gap-1.5 transform-gpu"
                                    >
                                        <Zap size={10} className="fill-current shrink-0" />
                                        {t('picks.neobetCta', 'In den Wettschein')}
                                    </a>
                                    <div className="text-[7.5px] font-bold text-gray-500 tracking-wider text-center uppercase leading-none mt-0.5">
                                        {t('picks.whitelistDisclaimer', 'Offiziell lizenziert (Whitelist) | 18+ | Suchtrisiken | Hilfe unter buwei.de')}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                  </div>
                );
            }) : (
              <div className="flex flex-col items-center justify-center py-20 bg-[#15171e] rounded-[1.5rem] border border-dashed border-white/10 text-center px-6">
                <Filter className="text-gray-700 mb-3" size={32} />
                <div className="text-white font-black uppercase text-sm tracking-wide">{t('valueScanner.noMatches.title')}</div>
                <p className="text-gray-600 text-[10px] mt-1">{t('valueScanner.noMatches.subtitle')}</p>
              </div>
            )}
          </div>
      </PremiumLock>

      {/* Germany Regulatory Whitelist Footer */}
      <div className="mt-16 pt-8 border-t border-white/5 text-center">
          <p className="text-[9px] uppercase tracking-[0.2em] font-black text-gray-600 max-w-xl mx-auto leading-relaxed">
              {t('picks.footerDisclaimer', 'Offiziell lizenziert (Whitelist) | 18+ | Suchtrisiken | Hilfe unter buwei.de')}
          </p>
      </div>
    </div>
  );
}