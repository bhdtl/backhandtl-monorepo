import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { ScrollToTop } from '../components/ScrollToTop';
import { 
  Hash, Activity, Flame, Snowflake, Target, Shield, ArrowRight, Zap, MapPin, Clock, Scale, Calendar, AlertTriangle
} from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { PremiumLock } from '../components/PremiumLock';
import { useAccess } from '../hooks/useAccess';
import { useNavigate } from 'react-router-dom';

// --- STYLES ---
const style = document.createElement('style');
style.textContent = `
  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  
  @keyframes scanline {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100%); }
  }
  .animate-scanline {
    animation: scanline 3s linear infinite;
  }
`;
document.head.appendChild(style);

// --- HELPER FUNCTIONS ---
const calculateTotalGames = (scoreStr: string | null) => {
    if (!scoreStr) return null;
    const cleanScore = scoreStr.toLowerCase().replace(/ret\.?/g, '').replace(/w\.o\.?/g, '').replace(/walkover/g, '');
    if (cleanScore.length < 3) return null; 
    
    const unifiedScore = cleanScore.replace(/:/g, '-').replace(/\(\d+\)/g, ''); 
    const sets = unifiedScore.match(/\b(\d+)\s*-\s*(\d+)\b/g);
    if (!sets) return null;

    let total = 0;
    sets.forEach(s => {
        const parts = s.split('-');
        total += parseInt(parts[0]) + parseInt(parts[1]);
    });
    
    return total > 0 ? total : null;
};

const guessSurfaceFromTournament = (tourName: string) => {
    if (!tourName) return 'Hard';
    const t = tourName.toLowerCase();
    if (t.includes('clay') || t.includes('roland garros') || t.includes('monte carlo') || t.includes('madrid') || t.includes('rome')) return 'Clay';
    if (t.includes('grass') || t.includes('wimbledon') || t.includes('halle') || t.includes('queens') || t.includes('stuttgart')) return 'Grass';
    return 'Hard'; 
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

export function TotalsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isElite, loading: accessLoading } = useAccess();
  
  const [activeMatches, setActiveMatches] = useState<any[]>([]);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering: ALL | OVERS (Proj > 22.5) | UNDERS (Proj < 20.5)
  const [marketFilter, setMarketFilter] = useState<'ALL' | 'OVERS' | 'UNDERS'>('ALL');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
        setLoading(true);
        const today = new Date();
        today.setHours(0,0,0,0);

        // 1. Fetch Active Upcoming Matches (From Scanner/Market Odds)
        const { data: activeData, error: activeError } = await supabase
            .from('market_odds')
            .select('*')
            .is('actual_winner_name', null)
            .gte('match_time', today.toISOString())
            .order('match_time', { ascending: true });

        if (activeError) throw activeError;

        // 2. Fetch Historical Matches (Data Lake for Averages) - Massive Pull
        const { data: histData, error: histError } = await supabase
            .from('market_odds')
            .select('player1_name, player2_name, score, tournament')
            .not('actual_winner_name', 'is', null)
            .order('created_at', { ascending: false })
            .limit(3000);

        if (histError) throw histError;

        setHistoricalData(histData || []);
        
        // 3. Process Projections instantly
        const processedMatches = (activeData || []).map(match => {
            const surface = guessSurfaceFromTournament(match.tournament);
            
            const getPlayerAvg = (playerName: string) => {
                if (!playerName) return null;
                const searchName = playerName.toLowerCase().split(' ').pop() || playerName.toLowerCase();
                
                const matches = (histData || []).filter(m => {
                    if (!m.player1_name || !m.player2_name) return false;
                    const isPlayer = m.player1_name.toLowerCase().includes(searchName) || m.player2_name.toLowerCase().includes(searchName);
                    const matchSurface = guessSurfaceFromTournament(m.tournament);
                    return isPlayer && matchSurface === surface;
                }).slice(0, 10); // L10 on this surface

                let totalGames = 0;
                let validCount = 0;

                matches.forEach(m => {
                    const games = calculateTotalGames(m.score);
                    if (games) {
                        totalGames += games;
                        validCount++;
                    }
                });

                return validCount > 0 ? { avg: totalGames / validCount, sampleSize: validCount } : null;
            };

            const p1Stats = getPlayerAvg(match.player1_name);
            const p2Stats = getPlayerAvg(match.player2_name);

            const avg1 = p1Stats ? p1Stats.avg : null;
            const avg2 = p2Stats ? p2Stats.avg : null;
            
            // Core Projection Logic
            let projection = null;
            if (avg1 && avg2) {
                projection = (avg1 + avg2) / 2;
            } else if (avg1) {
                projection = avg1;
            } else if (avg2) {
                projection = avg2;
            }

            // Bookie Line Check (if parsed via JSON in db)
            let bookieLine = match.actual_ou_line || null;
            let edge = null;
            
            if (bookieLine && projection) {
                edge = projection - bookieLine;
            }

            return {
                ...match,
                surface,
                p1Stats,
                p2Stats,
                projection,
                bookieLine,
                edge
            };
        }).filter(m => m.projection !== null); // Only keep matches where we have data

        // Sort by highest projection first (default)
        processedMatches.sort((a, b) => b.projection - a.projection);
        
        setActiveMatches(processedMatches);

    } catch (err) {
        console.error("Error fetching O/U data:", err);
    } finally {
        setLoading(false);
    }
  };

  const displayedMatches = useMemo(() => {
      let filtered = [...activeMatches];
      
      if (marketFilter === 'OVERS') {
          // Focus on long matches
          filtered = filtered.filter(m => m.projection >= 22.5);
          filtered.sort((a, b) => b.projection - a.projection);
      } else if (marketFilter === 'UNDERS') {
          // Focus on short matches (blowouts)
          filtered = filtered.filter(m => m.projection <= 20.5);
          filtered.sort((a, b) => a.projection - b.projection); // Ascending (lowest first)
      }
      
      return isElite ? filtered : filtered.slice(0, 3);
  }, [activeMatches, marketFilter, isElite]);

  const hiddenCount = isElite ? 0 : Math.max(0, activeMatches.length - 3);

  // KPIs
  const kpis = useMemo(() => {
      const topOver = activeMatches.length > 0 ? Math.max(...activeMatches.map(m => m.projection)) : 0;
      const topUnder = activeMatches.length > 0 ? Math.min(...activeMatches.map(m => m.projection)) : 0;
      return {
          total: activeMatches.length,
          topOver: topOver.toFixed(1),
          topUnder: topUnder.toFixed(1)
      };
  }, [activeMatches]);

  if (loading || accessLoading) return <LoadingScreen message="Calculating Surface Velocities..." />;

  return (
    <div className="min-h-screen bg-[#0f1115] w-full overflow-x-hidden relative selection:bg-tennis-lime/30 selection:text-tennis-lime pb-32 font-sans tracking-tight">
      <ScrollToTop />
      
      {/* Subtle Ambient Background */}
      <div className="absolute top-0 right-0 w-[80vw] h-[80vh] bg-blue-500/5 blur-[200px] rounded-full -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        
        {/* HEADER */}
        <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500/10 rounded-xl ring-1 ring-blue-500/20">
              <Hash size={24} className="text-blue-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter">Quantum Totals</h1>
          </div>
          <p className="text-gray-400 text-sm md:text-base font-medium max-w-2xl leading-relaxed pl-1">
            Analyzing historical surface velocity and player fatigue to project the exact number of games in upcoming matches. 
          </p>
        </div>

        {/* KPI STRIP */}
        <div className="flex md:grid md:grid-cols-3 gap-4 mb-8 -mx-4 px-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar md:mx-0 md:px-0">
            <div className="min-w-[200px] md:min-w-0 snap-center bg-[#1a1d26]/80 backdrop-blur-xl border border-white/5 rounded-[1.5rem] p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Activity size={80} className="text-gray-400" /></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2 text-gray-400">
                        <Activity size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Active Projections</span>
                    </div>
                    <span className="text-4xl font-black text-white tracking-tight">{kpis.total}</span>
                </div>
            </div>

            <div className="min-w-[200px] md:min-w-0 snap-center bg-[#1a1d26]/80 backdrop-blur-xl border border-orange-500/20 rounded-[1.5rem] p-5 flex flex-col justify-between shadow-[0_0_20px_rgba(249,115,22,0.05)] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Flame size={80} className="text-orange-500" /></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2 text-orange-400">
                        <Flame size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Highest Over</span>
                    </div>
                    <div className="flex items-end gap-1">
                        <span className="text-4xl font-black text-orange-400 tracking-tight">{kpis.topOver}</span>
                        <span className="text-lg font-bold text-orange-400/60 mb-1 tracking-widest">G</span>
                    </div>
                </div>
            </div>

            <div className="min-w-[200px] md:min-w-0 snap-center bg-[#1a1d26]/80 backdrop-blur-xl border border-cyan-500/20 rounded-[1.5rem] p-5 flex flex-col justify-between shadow-[0_0_20px_rgba(6,182,212,0.05)] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Snowflake size={80} className="text-cyan-400" /></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2 text-cyan-400">
                        <Snowflake size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Lowest Under</span>
                    </div>
                    <div className="flex items-end gap-1">
                        <span className="text-4xl font-black text-cyan-400 tracking-tight">{kpis.topUnder}</span>
                        <span className="text-lg font-bold text-cyan-400/60 mb-1 tracking-widest">G</span>
                    </div>
                </div>
            </div>
        </div>

        <PremiumLock
          isLocked={!isElite}
          minTier="ELITE"
          title="Elite Totals Engine"
          description="The Quantum Totals engine analyzes thousands of historical sets to find edges in the Over/Under markets."
          blurAmount="blur-xl"
        >
            {/* FILTER CONTROLS */}
            <div className="flex items-center bg-[#15171e] p-1 rounded-xl border border-white/5 shadow-inner mb-8 w-full md:w-fit">
                <button
                    onClick={() => setMarketFilter('ALL')}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${marketFilter === 'ALL' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    All Projections
                </button>
                <button
                    onClick={() => setMarketFilter('OVERS')}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 ${marketFilter === 'OVERS' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.15)]' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}
                >
                    <Flame size={12} /> Top Overs
                </button>
                <button
                    onClick={() => setMarketFilter('UNDERS')}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 ${marketFilter === 'UNDERS' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}
                >
                    <Snowflake size={12} /> Top Unders
                </button>
            </div>

            {/* MATCH GRID */}
            {displayedMatches.length === 0 ? (
                <div className="text-center py-20 bg-[#1a1d26]/50 rounded-[2rem] border border-dashed border-white/10 text-white font-black uppercase tracking-widest">
                    No active projections match this filter.
                </div>
            ) : (
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    <AnimatePresence>
                        {displayedMatches.map((match) => {
                            const isOver = match.projection >= 22.5;
                            const isUnder = match.projection <= 20.5;
                            
                            // Styling logic based on projection
                            let glowClass = "shadow-lg border-white/5 hover:border-white/20";
                            let textClass = "text-white";
                            let bgIcon = <Hash className="text-white/10" size={100} />;

                            if (isOver) {
                                glowClass = "border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.08)] hover:border-orange-500/50";
                                textClass = "text-orange-400";
                                bgIcon = <Flame className="text-orange-500/5" size={100} />;
                            } else if (isUnder) {
                                glowClass = "border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.08)] hover:border-cyan-500/50";
                                textClass = "text-cyan-400";
                                bgIcon = <Snowflake className="text-cyan-500/5" size={100} />;
                            }

                            return (
                                <motion.div 
                                    key={match.id}
                                    variants={itemVariants}
                                    className={`relative bg-[#15171e] rounded-[2rem] border ${glowClass} overflow-hidden group flex flex-col`}
                                >
                                    <div className="absolute -right-8 -top-8 z-0 pointer-events-none transform group-hover:scale-110 transition-transform duration-700">
                                        {bgIcon}
                                    </div>

                                    {/* Header */}
                                    <div className="px-5 py-3 border-b border-white/5 bg-black/20 flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                            <MapPin size={10} className="text-gray-500 shrink-0" />
                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">
                                                {match.tournament}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{match.surface}</span>
                                        </div>
                                    </div>

                                    {/* Matchup */}
                                    <div className="p-5 relative z-10 flex-grow">
                                        <div className="flex flex-col gap-3 mb-6">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-black text-white">{match.player1_name}</span>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">L10 Avg</span>
                                                    <span className="text-xs font-mono font-bold text-gray-300">
                                                        {match.p1Stats ? match.p1Stats.avg.toFixed(1) : '-'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-full h-px bg-white/5"></div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-black text-white">{match.player2_name}</span>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">L10 Avg</span>
                                                    <span className="text-xs font-mono font-bold text-gray-300">
                                                        {match.p2Stats ? match.p2Stats.avg.toFixed(1) : '-'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* The Edge / Output */}
                                        <div className="bg-black/40 rounded-2xl p-4 border border-white/5 flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">True Projection</span>
                                                <span className={`text-3xl font-black font-mono tracking-tighter ${textClass}`}>
                                                    {match.projection.toFixed(1)}
                                                </span>
                                            </div>
                                            
                                            {match.bookieLine ? (
                                                <div className="flex flex-col items-end text-right">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 flex items-center gap-1">
                                                        <Scale size={10} /> Bookie Line
                                                    </span>
                                                    <span className="text-lg font-black text-white font-mono">{match.bookieLine.toFixed(1)}</span>
                                                    {match.edge !== null && Math.abs(match.edge) >= 1.0 && (
                                                        <span className="text-[9px] font-black text-tennis-lime bg-tennis-lime/10 px-1.5 py-0.5 rounded mt-1">
                                                            {match.edge > 0 ? '+' : ''}{match.edge.toFixed(1)} EDGE
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center w-12 h-12 bg-white/5 rounded-full border border-white/10">
                                                    <Target size={20} className="text-gray-600" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </motion.div>
            )}

            {hiddenCount > 0 && (
                <div className="mt-8 text-center bg-[#1a1d26]/50 rounded-[2rem] border border-dashed border-white/10 p-8">
                    <Lock className="mx-auto text-gray-600 mb-3" size={32} />
                    <h3 className="text-white font-black uppercase tracking-widest mb-2">+{hiddenCount} Projections Locked</h3>
                    <p className="text-gray-500 text-sm mb-4">Upgrade to Elite to view the full Over/Under board.</p>
                    <button onClick={() => navigate('/pricing')} className="px-6 py-2 bg-white text-black font-bold text-xs uppercase tracking-widest rounded-full hover:bg-tennis-lime transition-colors shadow-lg">
                        Unlock Now
                    </button>
                </div>
            )}
        </PremiumLock>

        <div className="mt-16 pt-8 border-t border-white/5 text-center">
            <p className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-gray-600">
                <AlertTriangle size={12} /> Projections are based on historical surface medians.
            </p>
        </div>
      </div>
    </div>
  );
}

export default TotalsPage;