import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { ScrollToTop } from '../components/ScrollToTop';
import { 
  Target, Zap, Clock, Shield, Flame, Wallet, ArrowRight, Layers, Activity, CheckCircle2, TrendingUp, TrendingDown, MapPin,
  Brain, ChevronDown, ChevronUp, AlignLeft, Crosshair, Gift
} from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { PremiumLock } from '../components/PremiumLock';
import { useAccess } from '../hooks/useAccess';
import { NeoBetPromoModal } from '../components/NeoBetPromoModal';

// --- TYPES ---
interface Player {
  id: string;
  first_name: string;
  last_name: string;
  country: string;
  profile_image_url: string | null;
}

// --- ROBUST HELPERS (SYNCED WITH SOTA ENGINE) ---
const isPlayer1Target = (pickName: string, p1Name: string) => {
    const pick = pickName.toLowerCase().trim();
    const p1 = p1Name.toLowerCase().trim();
    if (pick.includes(p1) || p1.includes(pick)) return true;
    const pickLast = pick.split(' ').pop() || '';
    if (pickLast && p1.includes(pickLast)) return true;
    return false;
};

const parseValueFromText = (text: string | undefined) => {
    if (!text) {
        return { hasValue: false, marketOdds: 0, edge: 0, pickName: '', stake: 0, type: '' };
    }

    // 🚀 SOTA: Updated Regex to catch the exact Syndicate Labels (e.g. MAX BOMB) and Fractional Kelly Stake
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
};

const displayPickName = (name: string) => {
    if (!name) return "";
    const clean = name.trim();
    if (/\d/.test(clean) || clean.toLowerCase().includes('over') || clean.toLowerCase().includes('under')) {
        return clean;
    }
    return clean.split(' ').pop() || clean;
};

// 🚀 SOTA: PARSER FÜR DIE GIL GROSS AI ANALYSE
const parseAiAnalysis = (text: string | undefined) => {
    if (!text) return null;
    
    try {
        const keyMatch = text.match(/🔑(.*?)(?=\n📝)/s);
        const keyFactor = keyMatch ? keyMatch[1].trim() : null;

        const analysisMatch = text.match(/📝(.*?)(?=\n🎯)/s);
        const analysis = analysisMatch ? analysisMatch[1].trim() : null;

        const bulletsMatch = text.match(/🎯 Tactical Keys:\n([\s\S]*?)(?=\n\[|$)/);
        const bulletsRaw = bulletsMatch ? bulletsMatch[1].trim() : '';
        const bullets = bulletsRaw.split('\n').map(b => b.replace(/^- /, '').trim()).filter(Boolean);

        if (!keyFactor && !analysis) return null;

        return { keyFactor, analysis, bullets };
    } catch (e) {
        return null;
    }
};

// --- ELITE ARCHITECT: LABEL STYLING ENGINE (SYNCED WITH SYNDICATE RULES) ---
const getLabelStyle = (type: string, isMaxBomb: boolean) => {
    if (!type) return 'bg-white/10 text-white border-white/20';
    const t = type.toUpperCase();
    
    if (t.includes('BOMB') || isMaxBomb) {
        return 'bg-[#FF00FF]/10 text-[#FF00FF] border-[#FF00FF]/40 shadow-[0_0_8px_rgba(255,0,255,0.2)]';
    }
    if (t.includes('CONVICTION') || t.includes('HIGH VALUE')) {
        return 'bg-blue-500/10 text-blue-400 border-blue-500/40';
    }
    if (t.includes('CORE') || t.includes('VALUE')) {
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40';
    }
    if (t.includes('MICRO')) {
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/40';
    }
    if (t.includes('VETO') || t.includes('BAD')) {
        return 'bg-red-500/10 text-red-500 border-red-500/40';
    }
    if (t.includes('ALPHA')) {
        return 'bg-orange-500/10 text-orange-400 border-orange-500/40';
    }
    return 'bg-white/10 text-white border-white/20'; // Standard Value
};

// Helper to convert 2-letter country code to flag emoji
const getFlagEmoji = (countryCode: string) => {
  if (!countryCode || countryCode.toUpperCase() === 'UN') return '🏳️';
  const cleanCode = countryCode.trim().toLowerCase();
  const codePoints = cleanCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch (e) {
    return '🏳️';
  }
};

// --- COUNTRY CODE HELPER ---
const getCountryCode = (countryName: string) => {
    const map: { [key: string]: string } = {
        'USA': 'US', 'United States': 'US', 'Great Britain': 'GB', 'United Kingdom': 'GB',
        'France': 'FR', 'Spain': 'ES', 'Germany': 'DE', 'Italy': 'IT', 'Australia': 'AU',
        'Canada': 'CA', 'Argentina': 'AR', 'Russia': 'RU', 'Serbia': 'RS', 'Switzerland': 'CH',
        'Japan': 'JP', 'China': 'CN', 'Brazil': 'AR', 'Croatia': 'HR', 'Poland': 'PL',
        'Czech Republic': 'CZ', 'Netherlands': 'NL', 'Belgium': 'BE', 'Austria': 'AT',
        'Greece': 'GR', 'Bulgaria': 'BG', 'Denmark': 'DK', 'Sweden': 'SE', 'Norway': 'NO'
    };
    return map[countryName] || 'UN'; 
};

// --- FRAMER MOTION VARIANTS ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } }
};

// --- HELPER COMPONENT: PLAYER AVATAR ---
const PlayerAvatar = ({ player, isTarget }: { player: Player | undefined, isTarget: boolean }) => {
    if (!player) return null;
    const initial = player.last_name ? player.last_name.charAt(0) : '?';
    
    return (
        <div className="relative flex shrink-0">
            {player.profile_image_url ? (
                <img 
                    src={player.profile_image_url} 
                    alt={player.last_name} 
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-full object-cover border-2 shadow-lg ${isTarget ? 'border-tennis-lime' : 'border-white/10 opacity-50 grayscale'}`}
                />
            ) : (
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center font-black text-lg md:text-xl border-2 shadow-lg
                    ${isTarget ? 'bg-tennis-lime/20 text-tennis-lime border-tennis-lime' : 'bg-white/5 text-gray-500 border-white/10 opacity-50'}`}
                >
                    {initial}
                </div>
            )}
            {/* Flag Overlay - SVG/HTTP-free Native Emoji */}
            {player.country && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 md:w-6 md:h-6 rounded-full border border-[#1a1d26] bg-[#1a1d26] flex items-center justify-center text-xs select-none shadow">
                    {getFlagEmoji(getCountryCode(player.country))}
                </div>
            )}
        </div>
    );
};

export function AIPicksPage() {
  const { t } = useTranslation();
  const { isElite, loading: accessLoading } = useAccess();
  
  const [activePicks, setActivePicks] = useState<any[]>(() => {
    const cached = localStorage.getItem('bh_cached_picks');
    return cached ? JSON.parse(cached) : [];
  });
  const [playerMap, setPlayerMap] = useState<Map<string, Player>>(new Map());
  const [loading, setLoading] = useState(() => {
    return !localStorage.getItem('bh_cached_picks');
  });
  const [timeFilter, setTimeFilter] = useState<'ALL' | '30MIN'>('ALL');
  const [isMobile, setIsMobile] = useState(false);
  
  // 🚀 SOTA: State für das Expandieren der KI Analyse
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  
  // Realtime Debounce Ref
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchActivePicks();
    
    // Optimierte Realtime Subscription (verhindert Spam bei Quoten-Updates)
    const debouncedFetch = () => {
        if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = setTimeout(() => {
            fetchActivePicks();
        }, 3000); // Wartet 3 Sekunden, fasst alle Updates zusammen
    };

    const channel = supabase.channel('active-picks')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'market_odds' }, debouncedFetch)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'market_odds' }, debouncedFetch)
        .subscribe();
        
    return () => { 
        if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
        supabase.removeChannel(channel); 
    };
  }, []);

  const fetchActivePicks = async () => {
    try {
        const { data: playersData } = await supabase.from('players').select('id, first_name, last_name, country, profile_image_url');
        const pMap = new Map();
        if (playersData) {
            playersData.forEach(p => {
                const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
                const lastName = p.last_name.toLowerCase();
                pMap.set(fullName, p);
                if (!pMap.has(lastName)) pMap.set(lastName, p); 
            });
        }
        setPlayerMap(pMap);

        // Filtert Matches für heute & Zukunft
        const { data, error } = await supabase
            .from('market_odds')
            .select('id, player1_name, player2_name, odds1, odds2, opening_odds1, opening_odds2, ai_fair_odds1, ai_fair_odds2, ai_analysis_text, actual_winner_name, score, match_time, last_update, created_at, is_visible_in_scanner, tournament, games_prediction, neo_contest_id, api_match_key')
            .eq('is_visible_in_scanner', true)
            .is('actual_winner_name', null)
            .gte('match_time', new Date(new Date().setHours(0,0,0,0)).toISOString())
            .order('match_time', { ascending: true })
            .limit(10000); 

        if (error) throw error;

        const validPicks: any[] = [];

        if (data) {
            data.forEach(match => {
                const valInfo = parseValueFromText(match.ai_analysis_text);
                
                // 🚀 SOTA Frontend Gatekeeper: Erlaubt Fractional Kelly (Micro Edges), blockiert VETO und NOISE
                if (valInfo.hasValue && valInfo.stake > 0 && !valInfo.type.includes('VETO') && !valInfo.type.includes('NOISE')) {
                    let derivativeAlert = null;
                    if (match.ai_analysis_text && match.ai_analysis_text.includes('[🔥 MASSIVE')) {
                        const matchArr = match.ai_analysis_text.match(/\[(🔥 MASSIVE.*?)\]/);
                        if (matchArr) derivativeAlert = matchArr[1];
                    }

                    const p1IsPick = isPlayer1Target(valInfo.pickName, match.player1_name);
                    
                    const activePickOpenOdds = p1IsPick ? match.opening_odds1 : match.opening_odds2;
                    const activePickCurrentOdds = p1IsPick ? match.odds1 : match.odds2;
                    
                    // SOTA Line Movement Fix: Prozentual statt absolut (3% Schwellenwert)
                    let hasMovement = false;
                    let isSharpDumping = false;
                    if (activePickOpenOdds && activePickOpenOdds > 0) {
                        const diffPercent = Math.abs(activePickOpenOdds - activePickCurrentOdds) / activePickOpenOdds;
                        if (diffPercent >= 0.03) {
                            hasMovement = true;
                            isSharpDumping = activePickCurrentOdds < activePickOpenOdds; 
                        }
                    }

                    // Bestimme das wahre "Update Time" für den 30-Minuten Filter
                    // Wenn last_update existiert, nutze es, ansonsten created_at
                    const relevantTime = match.last_update || match.created_at;

                    validPicks.push({
                        ...match,
                        relevantTime: relevantTime,
                        parsedVal: valInfo,
                        derivativeAlert,
                        movement: { hasMovement, openOdds: activePickOpenOdds, currentOdds: activePickCurrentOdds, isSharpDumping },
                        isPlayer1Target: p1IsPick
                    });
                }
            });
        }

        // Sortiere strikt nach KI-Überzeugung (Stake)
        validPicks.sort((a, b) => b.parsedVal.stake - a.parsedVal.stake);
        setActivePicks(validPicks);
        
        // SOTA: Cache in localStorage sichern
        localStorage.setItem('bh_cached_picks', JSON.stringify(validPicks));

    } catch (err) {
        console.error("Error fetching active picks:", err);
    } finally {
        setLoading(false);
    }
  };

  const getPlayerDetails = (nameStr: string) => {
      const clean = nameStr.toLowerCase().trim();
      let p = playerMap.get(clean);
      if (p) return p;
      for (let [key, value] of playerMap.entries()) {
          if (clean.includes(key) || key.includes(clean.split(' ').pop() || '')) {
              return value;
          }
      }
      return { id: '0', first_name: '', last_name: nameStr, country: '', profile_image_url: null };
  };

  const displayedPicks = useMemo(() => {
      let list = [...activePicks];
      
      if (timeFilter === '30MIN') {
          const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).getTime();
          list = list.filter(pick => {
              const pickTime = new Date(pick.relevantTime).getTime();
              return pickTime >= thirtyMinsAgo;
          });
      }
      
      return list.filter(pick => !pick.parsedVal.type.toLowerCase().includes('live'));
  }, [activePicks, timeFilter]);

  const pickOfTheDay = useMemo(() => {
      if (displayedPicks.length === 0) return null;
      const sorted = [...displayedPicks].sort((a, b) => {
          if (b.parsedVal.stake !== a.parsedVal.stake) {
              return b.parsedVal.stake - a.parsedVal.stake;
          }
          return b.parsedVal.edge - a.parsedVal.edge;
      });
      return sorted[0];
  }, [displayedPicks]);

  const currentKpis = useMemo(() => {
      let units = 0;
      let maxEdge = 0;
      displayedPicks.forEach(p => {
          units += p.parsedVal.stake;
          if (p.parsedVal.edge > maxEdge) maxEdge = p.parsedVal.edge;
      });
      return {
          totalActive: displayedPicks.length,
          totalUnitsRisked: parseFloat(units.toFixed(1)),
          highestEdge: parseFloat(maxEdge.toFixed(1))
      };
  }, [displayedPicks]);

  if (accessLoading || loading) return <LoadingScreen message="Loading Active AI Portfolio..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32 min-h-screen">
      <ScrollToTop />
      
      {/* HEADER: Apple-Style Typography */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-tennis-lime/10 rounded-xl ring-1 ring-tennis-lime/20">
            <Target size={24} className="text-tennis-lime" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter">Action Portfolio</h1>
        </div>
        <p className="text-gray-400 text-sm md:text-base font-medium max-w-2xl leading-relaxed pl-1">
          Your curated list of mathematically validated predictions for today. Sized by the Kelly Criterion for optimal bankroll growth.
        </p>
      </div>

      <PremiumLock
        isLocked={!isElite}
        minTier="ELITE"
        title="Elite Portfolio"
        description="The AI Picks Portfolio is strictly reserved for Elite members. Upgrade to unlock exact Kelly stakes and real-time Action Lists."
        blurAmount="blur-xl"
      >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-lg font-black text-white uppercase tracking-wider pl-1">Picks Stream</h2>
              <div className="flex items-center bg-[#15171e] p-1 rounded-xl border border-white/5 self-start sm:self-auto shadow-inner w-full sm:w-auto">
                  <button
                      onClick={() => setTimeFilter('ALL')}
                      className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${timeFilter === 'ALL' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                      All Plays
                  </button>
                  <button
                      onClick={() => setTimeFilter('30MIN')}
                      className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 ${timeFilter === '30MIN' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.15)]' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}
                  >
                      <Flame size={12} className={timeFilter === '30MIN' ? 'animate-pulse' : ''} />
                      Last 30 Min
                  </button>
              </div>
          </div>

          <div className="flex md:grid md:grid-cols-3 gap-4 mb-8 -mx-4 px-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar md:mx-0 md:px-0">
              <div className="min-w-[200px] md:min-w-0 snap-center bg-[#1a1d26]/80 backdrop-blur-xl border border-white/5 rounded-[1.5rem] p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Activity size={80} className="text-gray-400" /></div>
                  <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2 text-gray-400">
                          <Activity size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Active Plays</span>
                      </div>
                      <span className="text-4xl font-black text-white tracking-tight">{currentKpis.totalActive}</span>
                  </div>
              </div>

              <div className="min-w-[200px] md:min-w-0 snap-center bg-[#1a1d26]/80 backdrop-blur-xl border border-tennis-lime/20 rounded-[1.5rem] p-5 flex flex-col justify-between shadow-[0_0_20px_rgba(132,204,22,0.05)] relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-tennis-lime/10 blur-2xl rounded-full transition-all duration-500"></div>
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Wallet size={80} className="text-tennis-lime" /></div>
                  <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2 text-tennis-lime">
                          <Wallet size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Risk Sizing</span>
                      </div>
                      <div className="flex items-end gap-1">
                          <span className="text-4xl font-black text-tennis-lime tracking-tight">{currentKpis.totalUnitsRisked}</span>
                          <span className="text-lg font-bold text-tennis-lime/60 mb-1 tracking-widest">u</span>
                      </div>
                  </div>
              </div>

              <div className="min-w-[200px] md:min-w-0 snap-center bg-[#1a1d26]/80 backdrop-blur-xl border border-white/5 rounded-[1.5rem] p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Zap size={80} className="text-blue-400" /></div>
                  <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2 text-blue-400">
                          <Zap size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Max Edge</span>
                      </div>
                      <div className="flex items-end gap-1">
                          <span className="text-4xl font-black text-white tracking-tight">+{currentKpis.highestEdge}</span>
                          <span className="text-lg font-bold text-gray-500 mb-1">%</span>
                      </div>
                  </div>
              </div>
          </div>

          {/* 🚀 NEU: NEO.bet Exklusiver Banner */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setIsPromoOpen(true)}
            className="mb-8 relative overflow-hidden rounded-[2rem] border border-white/5 bg-black/40 hover:border-tennis-lime/20 cursor-pointer shadow-xl transition-all duration-300 group"
          >
              <div className="absolute top-0 right-0 w-32 h-32 bg-tennis-lime/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-tennis-lime/10 transition-all duration-500" />
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6">
                  <div className="flex items-center gap-4">
                      <div className="p-3 bg-tennis-lime/10 rounded-2xl border border-tennis-lime/20 text-tennis-lime hidden sm:block">
                          <Gift size={20} className="animate-pulse" />
                      </div>
                      <div>
                          <div className="flex items-center gap-2 mb-1">
                              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tennis-lime opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-tennis-lime"></span></span>
                              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-tennis-lime">Partner Promotion</span>
                          </div>
                          <h3 className="text-base font-black text-white uppercase tracking-tight">Sichere dir 25€ gratis Wettguthaben</h3>
                          <p className="text-xs text-gray-500 font-semibold mt-0.5">Exklusive Freebet ohne Einzahlung für unsere AI Picks.</p>
                      </div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                      <span className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white group-hover:border-white/30 transition-all">Promo freischalten</span>
                      <img src="/neobet_logo_white.svg" alt="neobet" className="h-4 w-auto opacity-70 group-hover:opacity-100 transition-opacity" />
                  </div>
              </div>
          </motion.div>

          {/* 🚀 NEU: PICK OF THE DAY HERO CARD */}
          {pickOfTheDay && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-10 relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#1d1f27] to-[#111317] border border-tennis-lime/30 p-6 md:p-8 shadow-[0_0_50px_rgba(204,255,0,0.06)] group hover:border-tennis-lime/60 transition-all duration-300"
              >
                  {isMobile ? (
                    <>
                      <div 
                        className="absolute top-0 right-0 w-80 h-80 -z-10 pointer-events-none" 
                        style={{
                          background: 'radial-gradient(circle at top right, rgba(132, 204, 22, 0.04) 0%, rgba(132, 204, 22, 0) 70%)'
                        }}
                      />
                      <div 
                        className="absolute bottom-0 left-0 w-80 h-80 -z-10 pointer-events-none" 
                        style={{
                          background: 'radial-gradient(circle at bottom left, rgba(168, 85, 247, 0.03) 0%, rgba(168, 85, 247, 0) 70%)'
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <div className="absolute top-0 right-0 w-80 h-80 bg-tennis-lime/5 rounded-full blur-[90px] pointer-events-none group-hover:bg-tennis-lime/10 transition-all duration-500" />
                      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/5 rounded-full blur-[90px] pointer-events-none" />
                    </>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-white/5 relative z-10">
                      <div className="flex items-center gap-2.5">
                          <div className="flex h-2.5 w-2.5 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tennis-lime opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-tennis-lime"></span>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-tennis-lime">
                              Pick of the Day / Premium Selection
                          </span>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto text-[10px] font-mono font-bold text-gray-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                          <MapPin size={10} className="text-gray-400" />
                          <span className="truncate max-w-[150px] uppercase tracking-wider">{pickOfTheDay.tournament}</span>
                          <span className="text-gray-600">|</span>
                          <Clock size={10} className="text-gray-400" />
                          <span>{new Date(pickOfTheDay.match_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                      <div className="lg:col-span-7 flex flex-col justify-center">
                          <div className="flex items-center justify-between px-4 md:px-8 mb-6">
                              <div className={`flex flex-col items-center w-[40%] text-center gap-3 ${pickOfTheDay.isPlayer1Target ? 'opacity-100' : 'opacity-50'}`}>
                                  <PlayerAvatar player={getPlayerDetails(pickOfTheDay.player1_name)} isTarget={pickOfTheDay.isPlayer1Target} />
                                  <span className="text-sm font-black uppercase tracking-tight text-white leading-tight">
                                      {pickOfTheDay.player1_name.split(' ').pop()}
                                  </span>
                              </div>
                              <div className="w-10 h-10 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-xs font-black text-gray-500 shadow-inner">
                                  VS
                              </div>
                              <div className={`flex flex-col items-center w-[40%] text-center gap-3 ${!pickOfTheDay.isPlayer1Target ? 'opacity-100' : 'opacity-50'}`}>
                                  <PlayerAvatar player={getPlayerDetails(pickOfTheDay.player2_name)} isTarget={!pickOfTheDay.isPlayer1Target} />
                                  <span className="text-sm font-black uppercase tracking-tight text-white leading-tight">
                                      {pickOfTheDay.player2_name.split(' ').pop()}
                                  </span>
                              </div>
                          </div>

                          <div className="bg-black/40 rounded-2xl p-4 border border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
                              <div>
                                  <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 font-mono">RECOMMENDED PLAY</div>
                                  <div className="text-base font-black text-white uppercase tracking-tight">
                                      {displayPickName(pickOfTheDay.parsedVal.pickName)}
                                  </div>
                              </div>
                              <div className="flex gap-4 shrink-0">
                                  <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5 flex flex-col items-center">
                                      <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Odds</span>
                                      <span className="text-base font-mono font-black text-white">@{pickOfTheDay.parsedVal.marketOdds.toFixed(2)}</span>
                                  </div>
                                  <div className="bg-tennis-lime/10 px-4 py-2 rounded-xl border border-tennis-lime/20 flex flex-col items-center">
                                      <span className="text-[8px] font-bold text-tennis-lime uppercase tracking-widest mb-0.5">True Edge</span>
                                      <span className="text-base font-mono font-black text-tennis-lime">+{pickOfTheDay.parsedVal.edge.toFixed(1)}%</span>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="lg:col-span-5 bg-black/40 rounded-3xl p-5 md:p-6 border border-white/5 flex flex-col justify-between h-full relative overflow-hidden group/calc">
                          {isMobile ? (
                              <div 
                                className="absolute -top-10 -right-10 w-24 h-24 -z-10 pointer-events-none"
                                style={{
                                  background: 'radial-gradient(circle at top right, rgba(132, 204, 22, 0.08) 0%, rgba(132, 204, 22, 0) 70%)'
                                }}
                              />
                          ) : (
                              <div className="absolute -top-10 -right-10 w-24 h-24 bg-tennis-lime/10 rounded-full blur-xl pointer-events-none group-hover/calc:bg-tennis-lime/20 transition-all duration-300" />
                          )}
                          
                          <div className="flex items-center gap-2 mb-4">
                              <Gift size={16} className="text-tennis-lime animate-pulse" />
                              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-tennis-lime">Freebet ROI Calculator</span>
                          </div>

                          <div className="space-y-3 mb-6">
                              <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Freebet-Einsatz:</span>
                                  <span className="text-xs font-mono font-bold text-white bg-white/5 px-2.5 py-1 rounded">25.00 €</span>
                              </div>
                              <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Mögl. Auszahlung:</span>
                                  <span className="text-xs font-mono font-black text-white bg-white/5 px-2.5 py-1 rounded">
                                      {(25 * pickOfTheDay.parsedVal.marketOdds).toFixed(2)} €
                                  </span>
                              </div>
                              <div className="h-px bg-white/5 my-1" />
                              <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-tennis-lime font-black uppercase tracking-wider flex items-center gap-1">
                                      <Zap size={10} /> Netto-Reingewinn:
                                  </span>
                                  <span className="text-lg font-mono font-black text-tennis-lime bg-tennis-lime/10 px-3 py-1.5 rounded-xl border border-tennis-lime/20 shadow-[0_0_15px_rgba(204,255,0,0.1)]">
                                      {(25 * (pickOfTheDay.parsedVal.marketOdds - 1)).toFixed(2)} €
                                  </span>
                              </div>
                          </div>

                          <a
                              href={pickOfTheDay.games_prediction?.neo_betslip?.url 
                                  ? `${pickOfTheDay.games_prediction.neo_betslip.url}-potd` 
                                  : `https://neo.bet/de/Sportwetten/Tennis?betslip=compact&se=${pickOfTheDay.neo_contest_id || pickOfTheDay.api_match_key || pickOfTheDay.id}!Set_MATCH_HC2W(0.0)!${pickOfTheDay.isPlayer1Target ? '1' : '2'}&affiliateId=backhandtl-potd`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-3.5 bg-white text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-tennis-lime hover:scale-[1.01] active:scale-[0.99] transition-all hover:shadow-[0_0_20px_rgba(204,255,0,0.4)] flex items-center justify-center gap-2 transform-gpu"
                          >
                              <Zap size={12} className="fill-current" />
                              <span>Tipp platzieren mit 25€ Freebet</span>
                          </a>
                      </div>
                  </div>
              </motion.div>
          )}

          {displayedPicks.length === 0 ? (
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="flex flex-col items-center justify-center py-20 bg-[#1a1d26]/30 backdrop-blur-md rounded-[2rem] border border-white/5 text-center px-6 shadow-2xl relative overflow-hidden"
             >
                <Shield className="text-gray-600 mb-4 animate-pulse" size={32} />
                <div className="text-white font-black uppercase tracking-widest mb-2 text-xs">
                  {timeFilter === '30MIN' ? 'No Recent Drops' : 'No Active Plays'}
                </div>
                <p className="text-gray-500 text-[11px] max-w-sm leading-relaxed pl-1">
                  {timeFilter === '30MIN' 
                     ? 'The AI has not detected any new edges in the last 30 minutes. Switch back to "All Plays" to view the full active portfolio.' 
                     : 'The AI has not detected any high-conviction mathematical edges at this moment. The scanner runs 24/7.'}
                </p>
             </motion.div>
          ) : isMobile ? (
             /* Mobile Grid: No Framer Motion animations for maximum scrolling speed */
             <div className="grid grid-cols-1 gap-5">
                 {displayedPicks.map((pick) => {
                     const val = pick.parsedVal;
                     const matchDate = new Date(pick.match_time);
                     const timeString = matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                     
                     const isMaxBomb = val.stake >= 2.5;
                     const p1IsTarget = pick.isPlayer1Target; 
                     
                     const p1Data = getPlayerDetails(pick.player1_name);
                     const p2Data = getPlayerDetails(pick.player2_name);

                     const diffInMinutes = Math.floor((new Date().getTime() - new Date(pick.relevantTime).getTime()) / 60000);
                     const isHotDrop = diffInMinutes <= 30;
                     
                     const tagClasses = getLabelStyle(val.type, isMaxBomb);
                     const analysisData = parseAiAnalysis(pick.ai_analysis_text);
                     const isExpanded = expandedId === pick.id;

                     return (
                         <div 
                             key={pick.id}
                             className={`relative flex flex-col bg-[#15171e] rounded-[2rem] border ${isMaxBomb ? 'border-tennis-lime/30 shadow-[0_0_30px_rgba(132,204,22,0.08)]' : 'border-white/5 shadow-xl'} overflow-hidden group`}
                         >
                             {/* Top Banner: Tournament & Time */}
                             <div className="px-5 py-3 border-b border-white/5 bg-black/20 flex items-center justify-between">
                                 <div className="flex items-center gap-1.5 overflow-hidden pr-2">
                                     <MapPin size={10} className="text-gray-500 shrink-0" />
                                     <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">
                                         {pick.tournament}
                                     </span>
                                 </div>
                                 <div className="flex items-center gap-2 shrink-0">
                                     {isHotDrop && (
                                         <span className="flex items-center gap-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider animate-pulse">
                                             <Flame size={8} /> New
                                         </span>
                                     )}
                                     <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-gray-500 bg-white/5 px-2 py-1 rounded-md">
                                         <Clock size={10} /> {timeString}
                                     </div>
                                 </div>
                             </div>

                             {/* Core Matchup */}
                             <div className="p-5 flex-grow flex flex-col cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : pick.id)}>
                                 <div className="flex items-center justify-between mb-6">
                                     <div className={`flex flex-col items-center w-[40%] text-center gap-2 ${p1IsTarget ? 'opacity-100' : 'opacity-60'}`}>
                                         <PlayerAvatar player={p1Data} isTarget={p1IsTarget} />
                                         <span className={`text-xs font-black uppercase tracking-tight leading-tight ${p1IsTarget ? 'text-white' : 'text-gray-400'}`}>
                                             {pick.player1_name.split(' ').pop()}
                                         </span>
                                     </div>
                                     <div className="flex flex-col items-center justify-center w-[20%]">
                                         <div className="w-6 h-6 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-[8px] font-black text-gray-600 shadow-inner">
                                             VS
                                         </div>
                                     </div>
                                     <div className={`flex flex-col items-center w-[40%] text-center gap-2 ${!p1IsTarget ? 'opacity-100' : 'opacity-60'}`}>
                                         <PlayerAvatar player={p2Data} isTarget={!p1IsTarget} />
                                         <span className={`text-xs font-black uppercase tracking-tight leading-tight ${!p1IsTarget ? 'text-white' : 'text-gray-400'}`}>
                                             {pick.player2_name.split(' ').pop()}
                                         </span>
                                     </div>
                                 </div>

                                 {pick.derivativeAlert && (
                                     <div className="mb-2 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-start gap-2.5">
                                         <Flame className="text-orange-500 shrink-0 mt-0.5" size={14} />
                                         <div>
                                             <div className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-0.5">Alt Market Edge</div>
                                             <div className="text-[10px] text-orange-100/80 font-medium leading-snug">
                                                 {pick.derivativeAlert.replace('🔥 MASSIVE OVER EDGE:', 'OVER').replace('🔥 MASSIVE UNDER EDGE:', 'UNDER').trim()}
                                             </div>
                                         </div>
                                     </div>
                                 )}

                                 {pick.games_prediction?.pattern_warning && (
                                      <div className="mb-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2.5">
                                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0 animate-pulse"></div>
                                          <div>
                                              <div className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-0.5">Historical Pattern Risk</div>
                                              <div className="text-[10px] text-red-100/80 font-medium leading-snug">
                                                  {pick.games_prediction.pattern_warning}
                                              </div>
                                          </div>
                                      </div>
                                  )}

                                  {pick.games_prediction?.pattern_boost && (
                                      <div className="mb-2 bg-tennis-lime/10 border border-tennis-lime/20 rounded-xl p-3 flex items-start gap-2.5">
                                          <div className="w-1.5 h-1.5 rounded-full bg-tennis-lime mt-1.5 shrink-0"></div>
                                          <div>
                                              <div className="text-[9px] font-black text-tennis-lime uppercase tracking-widest mb-0.5">Historical Pattern Edge</div>
                                              <div className="text-[10px] text-tennis-lime/90 font-medium leading-snug">
                                                  {pick.games_prediction.pattern_boost}
                                              </div>
                                          </div>
                                      </div>
                                  )}
                                 
                                 {pick.movement.hasMovement && !pick.derivativeAlert && (
                                      <div className="mb-2 bg-black/30 border border-white/5 rounded-xl p-2.5 flex items-center justify-between">
                                         <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Line Move</span>
                                         <div className={`flex items-center gap-1 text-[10px] font-mono font-black ${pick.movement.isSharpDumping ? 'text-tennis-lime' : 'text-red-500'}`}>
                                             {pick.movement.isSharpDumping ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                                             {pick.movement.openOdds.toFixed(2)} ➔ {pick.movement.currentOdds.toFixed(2)}
                                         </div>
                                      </div>
                                 )}
                             </div>

                             {/* THE ACTION TRAY */}
                             <div className={`p-4 ${isMaxBomb ? 'bg-tennis-lime/5' : 'bg-[#1a1d26]'} border-t ${isMaxBomb ? 'border-tennis-lime/20' : 'border-white/5'} mt-auto relative overflow-hidden`}>
                                 {isMaxBomb && <div className="absolute inset-0 bg-gradient-to-t from-tennis-lime/10 to-transparent pointer-events-none"></div>}

                                 <div className="flex items-center justify-between mb-4 relative z-10">
                                     <div className="flex flex-col">
                                          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm inline-flex items-center gap-1 w-max border ${tagClasses}`}>
                                                  <span>{val.type.replace('🔥 ', '').replace('✨ ', '').replace('🛡️ ', '').replace('🔬 ', '')}</span>
                                              </span>
                                              {pick.games_prediction?.is_grand_slam && (
                                                  <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm inline-flex w-max border border-yellow-500/30 bg-yellow-500/10 text-yellow-400">
                                                      🎾 Slam (Bo5)
                                                  </span>
                                              )}
                                          </div>
                                         <span className="text-xs font-black text-white truncate max-w-[180px] xs:max-w-[220px]" title={val.pickName}>
                                             {displayPickName(val.pickName)}
                                         </span>
                                     </div>
                                     
                                     <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${tagClasses}`}>
                                         <Wallet size={12} className={isMaxBomb ? 'text-black' : 'text-inherit'} />
                                         <span className={`text-sm font-mono font-black tracking-tight ${isMaxBomb ? 'text-black' : 'text-inherit'}`}>
                                             {val.stake.toFixed(1)}u
                                         </span>
                                     </div>
                                 </div>

                                 <div className="grid grid-cols-2 gap-2.5 relative z-10">
                                     <div className="bg-black/40 rounded-xl p-3 flex flex-col items-center justify-center border border-white/5">
                                         <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                                             <Target size={8} /> Play At
                                         </span>
                                         <span className="text-sm font-mono font-black text-white leading-none">
                                             @{val.marketOdds.toFixed(2)}
                                         </span>
                                     </div>
                                     <div className="bg-blue-500/10 rounded-xl p-3 flex flex-col items-center justify-center border border-blue-500/20">
                                         <span className="text-[8px] font-bold text-blue-400/70 uppercase tracking-widest mb-1 flex items-center gap-1">
                                             <Zap size={8} /> True Edge
                                         </span>
                                         <span className="text-sm font-mono font-black text-blue-400 leading-none">
                                             +{val.edge.toFixed(1)}%
                                         </span>
                                     </div>
                                 </div>

                                 <div className="mt-4 relative z-10 flex flex-col gap-1.5">
                                     <a 
                                         href={pick.games_prediction?.neo_betslip?.url 
                                             ? `${pick.games_prediction.neo_betslip.url}-picks-cta` 
                                             : `https://neo.bet/de/Sportwetten/Tennis?betslip=compact&se=${pick.neo_contest_id || pick.api_match_key || pick.id}!Set_MATCH_HC2W(0.0)!${pick.isPlayer1Target ? '1' : '2'}&affiliateId=backhandtl-picks-cta`
                                         }
                                         target="_blank" 
                                         rel="noopener noreferrer"
                                         className="w-full py-3 bg-white/[0.03] border border-white/10 text-gray-200 font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5"
                                     >
                                         <Zap size={10} className="fill-current shrink-0" />
                                         {t('picks.neobetCta', 'In den Wettschein')}
                                     </a>
                                     <div className="text-[7.5px] font-bold text-gray-500 tracking-wider text-center uppercase leading-none mt-0.5">
                                         {t('picks.whitelistDisclaimer', 'Offiziell lizenziert (Whitelist) | 18+ | Suchtrisiken | Hilfe unter buwei.de')}
                                     </div>
                                 </div>
                                 
                                 {analysisData && (
                                     <div className="mt-4 flex justify-center relative z-10">
                                         <button 
                                             onClick={() => setExpandedId(isExpanded ? null : pick.id)}
                                             className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors py-1 px-3 bg-white/5 rounded-full border border-white/10"
                                         >
                                             <Brain size={12} className="text-purple-400" />
                                             {isExpanded ? 'Hide Analysis' : 'Deep Dive Analysis'}
                                             {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                         </button>
                                     </div>
                                 )}
                             </div>
                             
                             {isExpanded && analysisData && (
                                 <div className="bg-black/50 border-t border-white/5 relative">
                                     <div className="p-5 flex flex-col gap-4">
                                         {analysisData.keyFactor && (
                                             <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
                                                 <div className="flex items-center gap-1.5 mb-1.5">
                                                     <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                                                     <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Key Factor</span>
                                                 </div>
                                                 <p className="text-xs font-medium text-purple-100 leading-snug">{analysisData.keyFactor}</p>
                                             </div>
                                         )}
                                         
                                         {analysisData.analysis && (
                                             <div>
                                                 <span className="flex items-center gap-1.5 text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
                                                     <AlignLeft size={10} /> Tactical Breakdown
                                                 </span>
                                                 <p className="text-xs text-gray-300 leading-relaxed text-justify">
                                                     {analysisData.analysis}
                                                 </p>
                                             </div>
                                         )}

                                         {analysisData.bullets.length > 0 && (
                                             <div>
                                                 <span className="flex items-center gap-1.5 text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 mt-2">
                                                     <Crosshair size={10} /> Edge Execution
                                                 </span>
                                                 <ul className="flex flex-col gap-1.5">
                                                     {analysisData.bullets.map((bullet, idx) => (
                                                         <li key={idx} className="flex items-start gap-2 text-[11px] text-gray-400">
                                                             <div className="w-1 h-1 rounded-full bg-tennis-lime mt-1.5 shrink-0"></div>
                                                             <span className="leading-snug">{bullet}</span>
                                                         </li>
                                                     ))}
                                                 </ul>
                                             </div>
                                         )}
                                     </div>
                                 </div>
                             )}
                         </div>
                     )
                 })}
             </div>
          ) : (
             <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6"
             >
                <AnimatePresence>
                    {displayedPicks.map((pick) => {
                        const val = pick.parsedVal;
                        const matchDate = new Date(pick.match_time);
                        const timeString = matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        
                        const isMaxBomb = val.stake >= 2.5;
                        const p1IsTarget = pick.isPlayer1Target; 
                        
                        const p1Data = getPlayerDetails(pick.player1_name);
                        const p2Data = getPlayerDetails(pick.player2_name);

                        // Nutzt exaktes Live-Timing für das "NEW" Badge
                        const diffInMinutes = Math.floor((new Date().getTime() - new Date(pick.relevantTime).getTime()) / 60000);
                        const isHotDrop = diffInMinutes <= 30;
                        
                        // Dynamisches Styling für die neuen Elite-Kategorien
                        const tagClasses = getLabelStyle(val.type, isMaxBomb);
                        
                        // 🚀 SOTA: Parse Gil Gross Analysis Text
                        const analysisData = parseAiAnalysis(pick.ai_analysis_text);
                        const isExpanded = expandedId === pick.id;

                        return (
                            <motion.div 
                                key={pick.id}
                                variants={itemVariants}
                                initial="hidden"
                                animate="show"
                                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                className={`relative flex flex-col bg-[#15171e] rounded-[2rem] border ${isMaxBomb ? 'border-tennis-lime/30 shadow-[0_0_30px_rgba(132,204,22,0.08)]' : 'border-white/5 shadow-xl'} overflow-hidden group`}
                            >
                                {/* Top Banner: Tournament & Time */}
                                <div className="px-5 py-3 border-b border-white/5 bg-black/20 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 overflow-hidden pr-2">
                                        <MapPin size={10} className="text-gray-500 shrink-0" />
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">
                                            {pick.tournament}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {isHotDrop && (
                                            <span className="flex items-center gap-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider animate-pulse">
                                                <Flame size={8} /> New
                                            </span>
                                        )}
                                        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-gray-500 bg-white/5 px-2 py-1 rounded-md">
                                            <Clock size={10} /> {timeString}
                                        </div>
                                    </div>
                                </div>

                                {/* Core Matchup (Avatars & Names) */}
                                <div className="p-5 flex-grow flex flex-col cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : pick.id)}>
                                    <div className="flex items-center justify-between mb-6">
                                        {/* Player 1 */}
                                        <div className={`flex flex-col items-center w-[40%] text-center gap-2 ${p1IsTarget ? 'opacity-100' : 'opacity-60'}`}>
                                            <PlayerAvatar player={p1Data} isTarget={p1IsTarget} />
                                            <span className={`text-xs font-black uppercase tracking-tight leading-tight ${p1IsTarget ? 'text-white' : 'text-gray-400'}`}>
                                                {pick.player1_name.split(' ').pop()}
                                            </span>
                                        </div>

                                        {/* VS Badge */}
                                        <div className="flex flex-col items-center justify-center w-[20%]">
                                            <div className="w-6 h-6 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-[8px] font-black text-gray-600 shadow-inner">
                                                VS
                                            </div>
                                        </div>

                                        {/* Player 2 */}
                                        <div className={`flex flex-col items-center w-[40%] text-center gap-2 ${!p1IsTarget ? 'opacity-100' : 'opacity-60'}`}>
                                            <PlayerAvatar player={p2Data} isTarget={!p1IsTarget} />
                                            <span className={`text-xs font-black uppercase tracking-tight leading-tight ${!p1IsTarget ? 'text-white' : 'text-gray-400'}`}>
                                                {pick.player2_name.split(' ').pop()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* SOTA Derivative Alert (Wong's Exploit) */}
                                    {pick.derivativeAlert && (
                                        <div className="mb-2 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-start gap-2.5">
                                            <Flame className="text-orange-500 shrink-0 mt-0.5" size={14} />
                                            <div>
                                                <div className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-0.5">Alt Market Edge</div>
                                                <div className="text-[10px] text-orange-100/80 font-medium leading-snug">
                                                    {pick.derivativeAlert.replace('🔥 MASSIVE OVER EDGE:', 'OVER').replace('🔥 MASSIVE UNDER EDGE:', 'UNDER').trim()}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {pick.games_prediction?.pattern_warning && (
                                         <div className="mb-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2.5">
                                             <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0 animate-pulse"></div>
                                             <div>
                                                 <div className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-0.5">Historical Pattern Risk</div>
                                                 <div className="text-[10px] text-red-100/80 font-medium leading-snug">
                                                     {pick.games_prediction.pattern_warning}
                                                 </div>
                                             </div>
                                         </div>
                                     )}

                                     {pick.games_prediction?.pattern_boost && (
                                         <div className="mb-2 bg-tennis-lime/10 border border-tennis-lime/20 rounded-xl p-3 flex items-start gap-2.5">
                                             <div className="w-1.5 h-1.5 rounded-full bg-tennis-lime mt-1.5 shrink-0"></div>
                                             <div>
                                                 <div className="text-[9px] font-black text-tennis-lime uppercase tracking-widest mb-0.5">Historical Pattern Edge</div>
                                                 <div className="text-[10px] text-tennis-lime/90 font-medium leading-snug">
                                                     {pick.games_prediction.pattern_boost}
                                                 </div>
                                             </div>
                                         </div>
                                     )}
                                    
                                    {/* Line Movement Alert */}
                                    {pick.movement.hasMovement && !pick.derivativeAlert && (
                                         <div className="mb-2 bg-black/30 border border-white/5 rounded-xl p-2.5 flex items-center justify-between">
                                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Line Move</span>
                                            <div className={`flex items-center gap-1 text-[10px] font-mono font-black ${pick.movement.isSharpDumping ? 'text-tennis-lime' : 'text-red-500'}`}>
                                                {pick.movement.isSharpDumping ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                                                {pick.movement.openOdds.toFixed(2)} ➔ {pick.movement.currentOdds.toFixed(2)}
                                            </div>
                                         </div>
                                    )}
                                </div>

                                {/* THE ACTION TRAY */}
                                <div className={`p-4 md:p-5 ${isMaxBomb ? 'bg-tennis-lime/5' : 'bg-[#1a1d26]'} border-t ${isMaxBomb ? 'border-tennis-lime/20' : 'border-white/5'} mt-auto relative overflow-hidden`}>
                                    
                                    {isMaxBomb && <div className="absolute inset-0 bg-gradient-to-t from-tennis-lime/10 to-transparent pointer-events-none"></div>}

                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                        <div className="flex flex-col">
                                             {/* Dynamic Type Tag */}
                                             <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                                 <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm inline-flex items-center gap-1 w-max border ${tagClasses}`}>
                                                     <span>{val.type.replace('🔥 ', '').replace('✨ ', '').replace('🛡️ ', '').replace('🔬 ', '')}</span>
                                                 </span>
                                                 {pick.games_prediction?.is_grand_slam && (
                                                     <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm inline-flex w-max border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.2)]">
                                                         🎾 Slam (Bo5)
                                                     </span>
                                                 )}
                                             </div>
                                            <span className="text-xs md:text-sm font-black text-white truncate max-w-[180px] xs:max-w-[220px] sm:max-w-[280px] md:max-w-none" title={val.pickName}>
                                                {displayPickName(val.pickName)}
                                            </span>
                                        </div>
                                        
                                        {/* THE KELLY STAKE BADGE */}
                                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${tagClasses}`}>
                                            <Wallet size={12} className={isMaxBomb ? 'text-black' : 'text-inherit'} />
                                            <span className={`text-sm font-mono font-black tracking-tight ${isMaxBomb ? 'text-black' : 'text-inherit'}`}>
                                                {val.stake.toFixed(1)}u
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2.5 relative z-10">
                                        <div className="bg-black/40 rounded-xl p-3 flex flex-col items-center justify-center border border-white/5">
                                            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                <Target size={8} /> Play At
                                            </span>
                                            <span className="text-sm md:text-base font-mono font-black text-white leading-none">
                                                @{val.marketOdds.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="bg-blue-500/10 rounded-xl p-3 flex flex-col items-center justify-center border border-blue-500/20">
                                            <span className="text-[8px] font-bold text-blue-400/70 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                <Zap size={8} /> True Edge
                                            </span>
                                            <span className="text-sm md:text-base font-mono font-black text-blue-400 leading-none">
                                                +{val.edge.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* 🚀 SOTA: NEO.bet 1-Click Wettschein CTA */}
                                    <div className="mt-4 relative z-10 flex flex-col gap-1.5">
                                        <a 
                                            href={pick.games_prediction?.neo_betslip?.url 
                                                ? `${pick.games_prediction.neo_betslip.url}-picks-cta` 
                                                : `https://neo.bet/de/Sportwetten/Tennis?betslip=compact&se=${pick.neo_contest_id || pick.api_match_key || pick.id}!Set_MATCH_HC2W(0.0)!${pick.isPlayer1Target ? '1' : '2'}&affiliateId=backhandtl-picks-cta`
                                            }
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="w-full py-3 bg-white/[0.03] border border-white/10 text-gray-200 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-tennis-lime hover:text-black hover:border-tennis-lime hover:shadow-[0_0_25px_rgba(132,204,22,0.4)] transition-all duration-300 flex items-center justify-center gap-1.5 transform-gpu"
                                        >
                                            <Zap size={10} className="fill-current shrink-0" />
                                            {t('picks.neobetCta', 'In den Wettschein')}
                                        </a>
                                        <div className="text-[7.5px] font-bold text-gray-500 tracking-wider text-center uppercase leading-none mt-0.5">
                                            {t('picks.whitelistDisclaimer', 'Offiziell lizenziert (Whitelist) | 18+ | Suchtrisiken | Hilfe unter buwei.de')}
                                        </div>
                                    </div>
                                    
                                    {/* 🚀 SOTA: EXPAND BUTTON FOR AI ANALYSIS */}
                                    {analysisData && (
                                        <div className="mt-4 flex justify-center relative z-10">
                                            <button 
                                                onClick={() => setExpandedId(isExpanded ? null : pick.id)}
                                                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors py-1 px-3 bg-white/5 rounded-full border border-white/10"
                                            >
                                                <Brain size={12} className="text-purple-400" />
                                                {isExpanded ? 'Hide Analysis' : 'Deep Dive Analysis'}
                                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                
                                {/* 🚀 SOTA: EXPANDABLE AI ANALYSIS PANEL (APPLE STYLE) */}
                                <AnimatePresence>
                                    {isExpanded && analysisData && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="bg-black/50 border-t border-white/5 relative"
                                        >
                                            <div className="p-5 flex flex-col gap-4">
                                                {/* Key Factor */}
                                                {analysisData.keyFactor && (
                                                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
                                                        <div className="flex items-center gap-1.5 mb-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                                                            <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Key Factor</span>
                                                        </div>
                                                        <p className="text-xs font-medium text-purple-100 leading-snug">{analysisData.keyFactor}</p>
                                                    </div>
                                                )}
                                                
                                                {/* Deep Dive Text */}
                                                {analysisData.analysis && (
                                                    <div>
                                                        <span className="flex items-center gap-1.5 text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
                                                            <AlignLeft size={10} /> Tactical Breakdown
                                                        </span>
                                                        <p className="text-xs text-gray-300 leading-relaxed text-justify">
                                                            {analysisData.analysis}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Bullets */}
                                                {analysisData.bullets.length > 0 && (
                                                    <div>
                                                        <span className="flex items-center gap-1.5 text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 mt-2">
                                                            <Crosshair size={10} /> Edge Execution
                                                        </span>
                                                        <ul className="flex flex-col gap-1.5">
                                                            {analysisData.bullets.map((bullet, idx) => (
                                                                <li key={idx} className="flex items-start gap-2 text-[11px] text-gray-400">
                                                                    <div className="w-1 h-1 rounded-full bg-tennis-lime mt-1.5 shrink-0"></div>
                                                                    <span className="leading-snug">{bullet}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                            </motion.div>
                        )
                    })}
                </AnimatePresence>
             </motion.div>
          )}
      </PremiumLock>

      {/* Germany Regulatory Whitelist Footer */}
      <div className="mt-16 pt-8 border-t border-white/5 text-center">
          <p className="text-[9px] uppercase tracking-[0.2em] font-black text-gray-600 max-w-xl mx-auto leading-relaxed">
              {t('picks.footerDisclaimer', 'Offiziell lizenziert (Whitelist) | 18+ | Suchtrisiken | Hilfe unter buwei.de')}
          </p>
      </div>

      {/* NeoBet Promo Modal */}
      <NeoBetPromoModal isOpen={isPromoOpen} onClose={() => setIsPromoOpen(false)} />
    </div>
  );
}