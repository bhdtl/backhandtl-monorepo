import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { ScrollToTop } from '../components/ScrollToTop';
import { 
  Target, Zap, Clock, Shield, Flame, Wallet, ArrowRight, Layers, Activity, CheckCircle2, TrendingUp, TrendingDown, MapPin,
  Brain, ChevronDown, ChevronUp, AlignLeft, Crosshair
} from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { PremiumLock } from '../components/PremiumLock';
import { useAccess } from '../hooks/useAccess';

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
            let finalStake = Math.max(0, Math.min(3, rawStake));
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
            let finalStake = Math.max(0, Math.min(3, rawStake));
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
            {/* Flag Overlay */}
            {player.country && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 md:w-6 md:h-6 rounded-full overflow-hidden border border-[#1a1d26] bg-[#1a1d26]">
                    <img 
                        src={`https://flagcdn.com/w40/${getCountryCode(player.country).toLowerCase()}.png`}
                        alt={player.country}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                </div>
            )}
        </div>
    );
};

export function AIPicksPage() {
  const { t } = useTranslation();
  const { isElite, loading: accessLoading } = useAccess();
  
  const [activePicks, setActivePicks] = useState<any[]>([]);
  const [playerMap, setPlayerMap] = useState<Map<string, Player>>(new Map());
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'ALL' | '30MIN'>('ALL');
  
  // 🚀 SOTA: State für das Expandieren der KI Analyse
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Realtime Debounce Ref
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
            .select('*')
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
      if (timeFilter === 'ALL') return activePicks;
      
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).getTime();
      return activePicks.filter(pick => {
          // Nutze das neu definierte relevantTime für exaktes Fire-Tracking
          const pickTime = new Date(pick.relevantTime).getTime();
          return pickTime >= thirtyMinsAgo;
      });
  }, [activePicks, timeFilter]);

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
              <h2 className="text-lg font-black text-white uppercase tracking-wider pl-1">Live Stream</h2>
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

          {displayedPicks.length === 0 ? (
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="flex flex-col items-center justify-center py-24 bg-[#1a1d26]/50 rounded-[2rem] border border-dashed border-white/10 text-center px-6 shadow-inner"
             >
               <Shield className="text-gray-600 mb-4" size={40} />
               <div className="text-white font-black uppercase tracking-widest mb-2">
                 {timeFilter === '30MIN' ? 'No Recent Drops' : 'No Active Plays'}
               </div>
               <p className="text-gray-500 text-xs max-w-sm leading-relaxed">
                 {timeFilter === '30MIN' 
                    ? 'The AI has not detected any new edges in the last 30 minutes. Switch back to "All Plays" to view the full active portfolio.' 
                    : 'The AI has not detected any high-conviction mathematical edges at this moment. The scanner runs 24/7.'}
               </p>
             </motion.div>
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
                                layout
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
                                            <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm inline-flex w-max mb-1.5 border ${tagClasses}`}>
                                                {val.type.replace('🔥 ', '').replace('✨ ', '').replace('🛡️ ', '').replace('🔬 ', '')}
                                            </span>
                                            <span className={`text-sm md:text-base font-black text-white truncate max-w-[140px]`}>
                                                {val.pickName.split(' ').pop()}
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
                                            className="w-full py-3 bg-gradient-to-r from-tennis-lime to-emerald-500 text-black font-black text-[9px] uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(132,204,22,0.15)] hover:shadow-[0_0_25px_rgba(132,204,22,0.3)] transform-gpu"
                                        >
                                            <Zap size={10} className="fill-black" />
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
    </div>
  );
}