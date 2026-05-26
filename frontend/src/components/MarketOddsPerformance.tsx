import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  TrendingUp, TrendingDown, Target, ChevronDown, Filter, DollarSign, Activity, Calendar
} from 'lucide-react';
import { useAccess } from '../hooks/useAccess';
import { PremiumLock } from './PremiumLock'; 
import { useTranslation } from 'react-i18next'; 

// --- TYPES ---
type ViewMode = 'ROLE' | 'MY_ODDS' | 'OPP_ODDS' | 'SURFACE' | 'BSI_SPEED';
type TimeFrame = 'ALL' | '2026' | '2025' | '2024';

interface MarketMatch {
  myOdds: number;
  oppOdds: number;
  isWin: boolean;
  surface: string;
  tournament: string;
  bsi: number | null; // 🚀 SOTA: Proprietary Metric
  date: string;
}

interface BucketStat {
  label: string;
  wins: number;
  losses: number;
  total: number;
  profit: number; // in Units
  roi: number; // Percentage
  winRate: number;
}

export function MarketOddsPerformance({ playerName }: { playerName: string }) {
  const { t } = useTranslation(); 
  const { isElite, loading: accessLoading } = useAccess(); 
  
  const [rawMatches, setRawMatches] = useState<MarketMatch[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Controls
  const [viewMode, setViewMode] = useState<ViewMode>('ROLE');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('ALL');

  if (!playerName) return null;

  const isLocked = !isElite; 

  useEffect(() => {
    if (playerName) {
        fetchMarketHistory();
    }
  }, [playerName]);

  const fetchMarketHistory = async () => {
    try {
        setLoading(true);
        
        // 1. Holt die globale BSI-Turnierdatenbank (Dein proprietärer Edge)
        const { data: tournamentsData } = await supabase
            .from('tournaments')
            .select('name, bsi_rating');
            
        const bsiMap = new Map<string, number>();
        if (tournamentsData) {
            tournamentsData.forEach(t => {
                if (t.name && t.bsi_rating) {
                    bsiMap.set(t.name.toLowerCase().trim(), parseFloat(t.bsi_rating));
                }
            });
        }

        // 2. Holt die Match-Historie
        const { data: matches, error: matchError } = await supabase
          .from('market_odds')
          .select('player1_name, player2_name, odds1, odds2, actual_winner_name, tournament, ai_analysis_text, created_at')
          .or(`player1_name.ilike.%${playerName}%,player2_name.ilike.%${playerName}%`)
          .not('actual_winner_name', 'is', null)
          .order('created_at', { ascending: false })
          .limit(200); // Erhöht für besseres Filtering

        if (matchError) throw matchError;

        if (!matches || matches.length === 0) {
            setRawMatches([]);
            setLoading(false);
            return;
        }

        const formatted = matches.map((m: any) => {
            const isP1 = m.player1_name.toLowerCase().includes(playerName.toLowerCase().split(' ').pop() || '');
            const myOdds = isP1 ? (m.odds1 || 0) : (m.odds2 || 0);
            const oppOdds = isP1 ? (m.odds2 || 0) : (m.odds1 || 0);
            
            const winnerName = m.actual_winner_name ? m.actual_winner_name.toLowerCase() : '';
            const searchName = playerName.toLowerCase().split(' ').pop() || '';
            const isWin = winnerName.includes(searchName);

            // Simple Surface Extraction Fallback
            let surface = 'Hard';
            const textToSearch = `${m.tournament} ${m.ai_analysis_text || ''}`.toLowerCase();
            if (textToSearch.includes('clay') || textToSearch.includes('roland garros')) surface = 'Clay';
            else if (textToSearch.includes('grass') || textToSearch.includes('wimbledon')) surface = 'Grass';
            else if (textToSearch.includes('indoor')) surface = 'Indoor Hard';

            // 🚀 BSI Mapping
            const tourNameClean = (m.tournament || '').toLowerCase().trim();
            let matchBsi = bsiMap.get(tourNameClean) || null;
            
            // Fuzzy Matching falls exakter Name nicht passt
            if (matchBsi === null && tournamentsData) {
                const fuzzyMatch = tournamentsData.find(t => 
                    tourNameClean.includes((t.name || '').toLowerCase()) || 
                    (t.name || '').toLowerCase().includes(tourNameClean)
                );
                if (fuzzyMatch && fuzzyMatch.bsi_rating) {
                    matchBsi = parseFloat(fuzzyMatch.bsi_rating);
                }
            }

            return { 
                myOdds, 
                oppOdds, 
                isWin, 
                surface, 
                tournament: m.tournament, 
                bsi: matchBsi,
                date: m.created_at 
            };
        }).filter(m => m.myOdds > 1.01 && m.oppOdds > 1.01);

        setRawMatches(formatted);

    } catch (error) {
        console.error("Market Analysis Error:", error);
    } finally {
        setLoading(false);
    }
  };

  const performanceData = useMemo(() => {
    if (rawMatches.length === 0) return [];

    // Zeit-Filter anwenden
    const filteredByTime = rawMatches.filter(m => {
        if (timeFrame === 'ALL') return true;
        return m.date.startsWith(timeFrame);
    });

    const buckets: Record<string, { wins: number, losses: number, profit: number }> = {};

    // Helper to init bucket
    const initBucket = (key: string) => {
        if (!buckets[key]) buckets[key] = { wins: 0, losses: 0, profit: 0 };
    };

    filteredByTime.forEach(m => {
        let bucketKey = '';

        switch (viewMode) {
            case 'ROLE':
                bucketKey = m.myOdds < m.oppOdds ? 'Favorite' : 'Underdog';
                break;
            case 'MY_ODDS':
                if (m.myOdds < 1.40) bucketKey = 'Heavy Fav (<1.40)';
                else if (m.myOdds < 1.80) bucketKey = 'Solid Fav (1.40-1.80)';
                else if (m.myOdds < 2.50) bucketKey = 'Slight Dog (1.80-2.50)';
                else bucketKey = 'Heavy Dog (>2.50)';
                break;
            case 'OPP_ODDS':
                if (m.oppOdds < 1.40) bucketKey = 'vs Heavy Fav (<1.40)';
                else if (m.oppOdds < 1.80) bucketKey = 'vs Solid Fav (1.40-1.80)';
                else if (m.oppOdds < 2.50) bucketKey = 'vs Slight Dog (1.80-2.50)';
                else bucketKey = 'vs Heavy Dog (>2.50)';
                break;
            case 'SURFACE':
                bucketKey = m.surface;
                break;
            case 'BSI_SPEED':
                if (m.bsi === null) bucketKey = 'Unknown Speed';
                else if (m.bsi < 5.0) bucketKey = 'Slow Courts (BSI < 5.0)';
                else if (m.bsi <= 7.5) bucketKey = 'Medium Courts (BSI 5.0-7.5)';
                else bucketKey = 'Fast Courts (BSI > 7.5)';
                break;
        }

        initBucket(bucketKey);

        if (m.isWin) {
            buckets[bucketKey].wins += 1;
            buckets[bucketKey].profit += (m.myOdds - 1); // Won: Profit is Odds - Stake
        } else {
            buckets[bucketKey].losses += 1;
            buckets[bucketKey].profit -= 1; // Lost: Lost 1 Unit
        }
    });

    // Convert to array and calculate ROI
    return Object.entries(buckets).map(([label, data]): BucketStat => {
        const total = data.wins + data.losses;
        const winRate = total > 0 ? (data.wins / total) * 100 : 0;
        const roi = total > 0 ? (data.profit / total) * 100 : 0;
        
        return {
            label,
            wins: data.wins,
            losses: data.losses,
            total,
            profit: data.profit,
            roi,
            winRate
        };
    }).sort((a, b) => {
        // Sort logical based on view mode
        if (viewMode === 'ROLE') return a.label === 'Favorite' ? -1 : 1;
        if (viewMode === 'BSI_SPEED') {
            if (a.label.includes('Fast')) return -1;
            if (a.label.includes('Slow')) return 1;
            return 0;
        }
        return b.total - a.total; // Default sort by sample size
    });

  }, [rawMatches, viewMode, timeFrame]);

  // Overall ROI für den gefilterten Zeitraum
  const currentFilteredMatches = rawMatches.filter(m => {
      if (timeFrame === 'ALL') return true;
      return m.date.startsWith(timeFrame);
  });

  if (accessLoading || (loading && isElite)) return (
    <div className="h-[280px] flex flex-col items-center justify-center bg-[#1a1d26] rounded-3xl border border-white/5 animate-pulse">
        <div className="w-8 h-8 border-2 border-tennis-lime border-t-transparent rounded-full animate-spin mb-2"></div>
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Pricing Market Data...</span>
    </div>
  );

  return (
    <PremiumLock
        isLocked={isLocked}
        minTier="ELITE"
        title="Market Profile"
        description="See exactly where this player makes money. Analyze ROI as underdog, favorite, and specific odds tiers."
        blurAmount="blur-md"
    >
        <div className="bg-[#1a1d26] rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden flex flex-col min-h-[320px] md:min-h-[340px]">
        
        {/* --- HEADER (ULTRA COMPACT) --- */}
        <div className="p-4 border-b border-white/5 flex flex-col gap-3 relative z-10 bg-gradient-to-b from-white/[0.02] to-transparent">
            
            <div className="flex justify-between items-center">
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <Target size={10} className="text-tennis-lime" />
                        <span className="text-gray-500 text-[8px] font-black uppercase tracking-[0.2em]">Market Profitability</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl md:text-2xl font-black text-white uppercase leading-none tracking-tight">
                            {playerName.split(' ').pop()} 
                        </h2>
                    </div>
                </div>

                {/* COMPACT OVERALL ROI BADGE */}
                {currentFilteredMatches.length > 0 && (
                    <div className="text-right flex flex-col items-end">
                        <div className="flex items-center gap-1">
                            {currentFilteredMatches.reduce((acc, m) => acc + (m.isWin ? m.myOdds - 1 : -1), 0) > 0 ? (
                                <TrendingUp size={14} className="text-tennis-lime" />
                            ) : (
                                <TrendingDown size={14} className="text-red-500" />
                            )}
                            <div className={`text-[16px] md:text-[20px] font-black leading-none tracking-tighter ${currentFilteredMatches.reduce((acc, m) => acc + (m.isWin ? m.myOdds - 1 : -1), 0) > 0 ? 'text-tennis-lime' : 'text-red-500'}`}>
                                {((currentFilteredMatches.reduce((acc, m) => acc + (m.isWin ? m.myOdds - 1 : -1), 0) / currentFilteredMatches.length) * 100).toFixed(1)}%
                            </div>
                        </div>
                        <div className="text-[7px] font-bold text-gray-500 uppercase tracking-widest mt-1">Overall ROI</div>
                    </div>
                )}
            </div>

            {/* CONTROLS (View Mode + Year Filter) */}
            <div className="flex gap-2 w-full">
                <div className="relative flex-1">
                    <select 
                        value={viewMode} 
                        onChange={(e) => setViewMode(e.target.value as ViewMode)}
                        className="w-full appearance-none bg-black/40 text-tennis-lime font-black text-[10px] py-2.5 px-3 rounded-lg border border-tennis-lime/20 outline-none focus:ring-1 focus:ring-tennis-lime cursor-pointer uppercase tracking-wider transition-colors"
                    >
                        <option value="ROLE" className="bg-[#1a1d26] text-gray-300">Role: Fav vs Dog</option>
                        <option value="MY_ODDS" className="bg-[#1a1d26] text-gray-300">Odds: My Price Tiers</option>
                        <option value="OPP_ODDS" className="bg-[#1a1d26] text-gray-300">Odds: Opponent Tiers</option>
                        <option value="BSI_SPEED" className="bg-[#1a1d26] text-orange-400">🔥 Pro: BSI Court Speed</option>
                        <option value="SURFACE" className="bg-[#1a1d26] text-gray-300">Performance by Surface</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-tennis-lime pointer-events-none" />
                </div>

                <div className="relative w-[100px]">
                    <select 
                        value={timeFrame} 
                        onChange={(e) => setTimeFrame(e.target.value as TimeFrame)}
                        className="w-full appearance-none bg-black/40 text-white font-black text-[10px] py-2.5 pl-7 pr-3 rounded-lg border border-white/10 outline-none focus:border-white/30 cursor-pointer uppercase tracking-wider transition-colors"
                    >
                        <option value="ALL" className="bg-[#1a1d26] text-gray-300">ALL</option>
                        <option value="2026" className="bg-[#1a1d26] text-gray-300">2026</option>
                        <option value="2025" className="bg-[#1a1d26] text-gray-300">2025</option>
                        <option value="2024" className="bg-[#1a1d26] text-gray-300">2024</option>
                    </select>
                    <Calendar size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
            </div>
        </div>

        {/* --- LIST AREA --- */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-2 flex flex-col gap-2">
            {performanceData.length > 0 ? (
                performanceData.map((stat, idx) => (
                    <div key={idx} className="bg-black/20 border border-white/5 rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden group">
                        
                        {/* Background Edge Indicator */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${stat.roi > 0 ? 'bg-tennis-lime' : 'bg-red-500/50'}`}></div>

                        <div className="flex justify-between items-center pl-2">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${viewMode === 'BSI_SPEED' ? 'text-orange-400' : 'text-white'}`}>{stat.label}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-mono text-gray-500">{stat.wins}W - {stat.losses}L</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-end pl-2">
                            <div className="flex flex-col">
                                <span className="text-[7px] text-gray-500 uppercase font-black tracking-widest mb-0.5">Win Rate</span>
                                <span className="text-xs font-mono font-bold text-gray-300">{stat.winRate.toFixed(1)}%</span>
                            </div>

                            <div className="flex flex-col items-end">
                                <span className="text-[7px] text-gray-500 uppercase font-black tracking-widest mb-0.5">Yield (ROI)</span>
                                <div className={`flex items-center gap-1 text-xs font-mono font-black ${stat.roi > 0 ? 'text-tennis-lime' : 'text-red-500'}`}>
                                    {stat.roi > 0 ? '+' : ''}{stat.roi.toFixed(1)}%
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-20 min-h-[100px]">
                    <Filter size={24} className="mb-1" />
                    <span className="text-[8px] uppercase font-bold tracking-widest">No Market Data Found</span>
                </div>
            )}
        </div>

        {/* --- FOOTER --- */}
        <div className="px-4 py-3 bg-black/40 border-t border-white/5 flex justify-between items-center backdrop-blur-md">
            <span className="text-[8px] font-medium text-gray-500">Based on {currentFilteredMatches.length} tracked matches</span>
            <div className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-tennis-lime">
                <DollarSign size={10} /> Market Data
            </div>
        </div>
        
        </div>
    </PremiumLock>
  );
}