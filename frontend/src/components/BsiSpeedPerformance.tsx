import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  TrendingUp, TrendingDown, ChevronDown, Filter, Gauge, Calendar, Zap, Wind
} from 'lucide-react';
import { useAccess } from '../hooks/useAccess';
import { PremiumLock } from './PremiumLock'; 
import { useTranslation } from 'react-i18next'; 

// --- TYPES ---
type TimeFrame = 'ALL' | '2026' | '2025' | '2024';

interface BsiMatch {
  myOdds: number | null;
  oppOdds: number | null;
  isWin: boolean;
  surface: string;
  tournament: string;
  bsi: number | null;
  date: string;
  source: 'MARKET' | 'HISTORY';
}

interface BsiBucketStat {
  label: string;
  wins: number;
  losses: number;
  total: number;
  profit: number; // in Units
  roi: number; // Percentage
  roiCount: number; // How many matches had odds
  winRate: number;
  color: string;
  icon: any;
}

export function BsiSpeedPerformance({ playerName }: { playerName: string }) {
  const { t } = useTranslation(); 
  const { isElite, loading: accessLoading } = useAccess(); 
  
  const [rawMatches, setRawMatches] = useState<BsiMatch[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Controls
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('ALL');

  if (!playerName) return null;

  const isLocked = !isElite; 

  useEffect(() => {
    if (playerName) {
        fetchBsiHistory();
    }
  }, [playerName]);

  const fetchBsiHistory = async () => {
    try {
        setLoading(true);
        
        // 1. Holt die globale BSI-Turnierdatenbank
        const { data: tournamentsData } = await supabase
            .from('tournaments')
            .select('name, bsi_rating, surface');
            
        const tourMap = new Map<string, { bsi: number | null, surface: string | null }>();
        if (tournamentsData) {
            tournamentsData.forEach(t => {
                if (t.name) {
                    tourMap.set(t.name.toLowerCase().trim(), {
                        bsi: t.bsi_rating ? parseFloat(t.bsi_rating) : null,
                        surface: t.surface || null
                    });
                }
            });
        }

        const playerLastName = playerName.split(' ').pop()?.toLowerCase() || playerName.toLowerCase();

        // 2. Parallel Fetch aus Market Odds & Historical Data Lake
        const [marketRes, historyRes] = await Promise.all([
            supabase
                .from('market_odds')
                .select('player1_name, player2_name, odds1, odds2, actual_winner_name, tournament, ai_analysis_text, created_at')
                .or(`player1_name.ilike.%${playerLastName}%,player2_name.ilike.%${playerLastName}%`)
                .not('actual_winner_name', 'is', null)
                .order('created_at', { ascending: false })
                .limit(300),
            supabase
                .from('historical_matches')
                .select('match_date, winner_name, loser_name, tourney_name, surface')
                .or(`winner_name.ilike.%${playerLastName}%,loser_name.ilike.%${playerLastName}%`)
                .order('match_date', { ascending: false })
                .limit(500)
        ]);

        const allMatches: BsiMatch[] = [];
        const seenMatches = new Set<string>();

        // 3. Process Market Odds (mit Quoten für ROI)
        if (marketRes.data) {
            marketRes.data.forEach((m: any) => {
                const isP1 = m.player1_name.toLowerCase().includes(playerLastName);
                const opponentName = isP1 ? m.player2_name : m.player1_name;
                const myOdds = isP1 ? (m.odds1 || null) : (m.odds2 || null);
                const oppOdds = isP1 ? (m.odds2 || null) : (m.odds1 || null);
                
                const winnerName = m.actual_winner_name ? m.actual_winner_name.toLowerCase() : '';
                const isWin = winnerName.includes(playerLastName);

                const dateStr = new Date(m.created_at).toISOString().split('T')[0];
                const key = `${dateStr}_${opponentName.split(' ').pop()?.toLowerCase()}`;

                if (!seenMatches.has(key)) {
                    seenMatches.add(key);

                    const tourNameClean = (m.tournament || '').toLowerCase().trim();
                    let matchData = tourMap.get(tourNameClean);
                    
                    if (!matchData && tournamentsData) {
                        const fuzzyMatch = tournamentsData.find(t => 
                            tourNameClean.includes((t.name || '').toLowerCase()) || 
                            (t.name || '').toLowerCase().includes(tourNameClean)
                        );
                        if (fuzzyMatch) {
                            matchData = {
                                bsi: fuzzyMatch.bsi_rating ? parseFloat(fuzzyMatch.bsi_rating) : null,
                                surface: fuzzyMatch.surface || null
                            };
                        }
                    }

                    let bsi = matchData?.bsi || null;
                    let surface = matchData?.surface || 'Hard';

                    if (!matchData?.surface) {
                        const textToSearch = `${m.tournament} ${m.ai_analysis_text || ''}`.toLowerCase();
                        if (textToSearch.includes('clay') || textToSearch.includes('roland garros')) surface = 'Clay';
                        else if (textToSearch.includes('grass') || textToSearch.includes('wimbledon')) surface = 'Grass';
                        else if (textToSearch.includes('indoor') || textToSearch.includes('carpet')) surface = 'Indoor Hard';
                    }

                    allMatches.push({
                        myOdds, oppOdds, isWin, surface,
                        tournament: m.tournament, bsi,
                        date: m.created_at, source: 'MARKET'
                    });
                }
            });
        }

        // 4. Process Historical Matches (Keine Quoten, aber extrem wichtig für Win-Rate)
        if (historyRes.data) {
            historyRes.data.forEach((m: any) => {
                const isWin = m.winner_name.toLowerCase().includes(playerLastName);
                const opponentName = isWin ? m.loser_name : m.winner_name;
                const dateStr = m.match_date;
                
                const key = `${dateStr}_${opponentName.split(' ').pop()?.toLowerCase()}`;

                if (!seenMatches.has(key)) {
                    seenMatches.add(key);

                    const tourNameClean = (m.tourney_name || '').toLowerCase().trim();
                    let matchData = tourMap.get(tourNameClean);
                    
                    if (!matchData && tournamentsData) {
                        const fuzzyMatch = tournamentsData.find(t => 
                            tourNameClean.includes((t.name || '').toLowerCase()) || 
                            (t.name || '').toLowerCase().includes(tourNameClean)
                        );
                        if (fuzzyMatch) {
                            matchData = {
                                bsi: fuzzyMatch.bsi_rating ? parseFloat(fuzzyMatch.bsi_rating) : null,
                                surface: fuzzyMatch.surface || null
                            };
                        }
                    }

                    let bsi = matchData?.bsi || null;
                    let surface = m.surface || matchData?.surface || 'Hard';

                    allMatches.push({
                        myOdds: null, oppOdds: null, isWin, surface,
                        tournament: m.tourney_name, bsi,
                        date: m.match_date, source: 'HISTORY'
                    });
                }
            });
        }

        setRawMatches(allMatches);

    } catch (error) {
        console.error("BSI Analysis Error:", error);
    } finally {
        setLoading(false);
    }
  };

  const performanceData = useMemo(() => {
    if (rawMatches.length === 0) return [];

    const filteredByTime = rawMatches.filter(m => {
        if (timeFrame === 'ALL') return true;
        return m.date.startsWith(timeFrame);
    });

    const buckets: Record<string, { wins: number, losses: number, profit: number, roiCount: number, color: string, icon: any }> = {};

    const initBucket = (key: string, color: string, icon: any) => {
        if (!buckets[key]) buckets[key] = { wins: 0, losses: 0, profit: 0, roiCount: 0, color, icon };
    };

    filteredByTime.forEach(m => {
        let bucketKey = '';
        let color = 'text-gray-400';
        let icon = Gauge;

        const surf = (m.surface || 'hard').toLowerCase();

        // 🚀 SOTA: The Physics Profiler Matrix
        if (surf.includes('indoor') || surf.includes('carpet')) {
            bucketKey = 'Indoor Hard';
            color = 'text-purple-400';
            icon = Zap;
        } else if (surf.includes('grass')) {
            bucketKey = 'Grass';
            color = 'text-green-500';
            icon = Wind;
        } else if (surf.includes('clay') || surf.includes('sand')) {
            if (m.bsi !== null && m.bsi > 4.0) {
                bucketKey = 'Fast Clay (Altitude/Dry)';
                color = 'text-orange-400';
                icon = Zap;
            } else {
                bucketKey = 'Slow Clay (Heavy)';
                color = 'text-orange-600';
                icon = Gauge;
            }
        } else {
            // Default Hardcourt Split
            if (m.bsi !== null && m.bsi > 7.0) {
                bucketKey = 'Fast Hardcourt (> 7.0)';
                color = 'text-blue-400';
                icon = Zap;
            } else if (m.bsi !== null && m.bsi < 5.0) {
                bucketKey = 'Slow Hardcourt (< 5.0)';
                color = 'text-blue-600';
                icon = Gauge;
            } else {
                bucketKey = 'Medium Hardcourt';
                color = 'text-blue-500';
                icon = Gauge;
            }
        }

        initBucket(bucketKey, color, icon);

        if (m.isWin) {
            buckets[bucketKey].wins += 1;
            if (m.myOdds && m.myOdds > 1.01) {
                buckets[bucketKey].profit += (m.myOdds - 1);
                buckets[bucketKey].roiCount += 1;
            }
        } else {
            buckets[bucketKey].losses += 1;
            if (m.myOdds && m.myOdds > 1.01) {
                buckets[bucketKey].profit -= 1;
                buckets[bucketKey].roiCount += 1;
            }
        }
    });

    return Object.entries(buckets).map(([label, data]): BsiBucketStat => {
        const total = data.wins + data.losses;
        const winRate = total > 0 ? (data.wins / total) * 100 : 0;
        const roi = data.roiCount > 0 ? (data.profit / data.roiCount) * 100 : 0;
        
        return {
            label,
            wins: data.wins,
            losses: data.losses,
            total,
            profit: data.profit,
            roi,
            roiCount: data.roiCount,
            winRate,
            color: data.color,
            icon: data.icon
        };
    }).sort((a, b) => b.total - a.total); // Sort by sample size

  }, [rawMatches, timeFrame]);

  const currentFilteredMatches = rawMatches.filter(m => {
      if (timeFrame === 'ALL') return true;
      return m.date.startsWith(timeFrame);
  });

  const totalRoiCount = currentFilteredMatches.filter(m => m.myOdds && m.myOdds > 1.01).length;
  const totalProfit = currentFilteredMatches.reduce((acc, m) => {
      if (!m.myOdds || m.myOdds <= 1.01) return acc;
      return acc + (m.isWin ? m.myOdds - 1 : -1);
  }, 0);
  const totalRoiPercentage = totalRoiCount > 0 ? (totalProfit / totalRoiCount) * 100 : 0;

  if (accessLoading || (loading && isElite)) return (
    <div className="h-[280px] flex flex-col items-center justify-center bg-[#1a1d26] rounded-3xl border border-white/5 animate-pulse">
        <div className="w-8 h-8 border-2 border-tennis-lime border-t-transparent rounded-full animate-spin mb-2"></div>
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Processing BSI Physics...</span>
    </div>
  );

  return (
    <PremiumLock
        isLocked={isLocked}
        minTier="ELITE"
        title="Court Speed Physics"
        description="Discover hidden Alpha. See how this player's true win-rate & ROI shifts dynamically based on exact BSI court speeds."
        blurAmount="blur-md"
    >
        <div className="bg-[#1a1d26] rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden flex flex-col min-h-[320px] md:min-h-[340px]">
        
        {/* --- HEADER --- */}
        <div className="p-4 border-b border-white/5 flex flex-col gap-3 relative z-10 bg-gradient-to-b from-white/[0.02] to-transparent">
            
            <div className="flex justify-between items-center">
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <Gauge size={10} className="text-tennis-lime" />
                        <span className="text-gray-500 text-[8px] font-black uppercase tracking-[0.2em]">BSI Speed Profiler</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl md:text-2xl font-black text-white uppercase leading-none tracking-tight">
                            {playerName.split(' ').pop()} 
                        </h2>
                    </div>
                </div>

                {totalRoiCount > 0 && (
                    <div className="text-right flex flex-col items-end">
                        <div className="flex items-center gap-1">
                            {totalProfit > 0 ? (
                                <TrendingUp size={14} className="text-tennis-lime" />
                            ) : (
                                <TrendingDown size={14} className="text-red-500" />
                            )}
                            <div className={`text-[16px] md:text-[20px] font-black leading-none tracking-tighter ${totalProfit > 0 ? 'text-tennis-lime' : 'text-red-500'}`}>
                                {totalRoiPercentage.toFixed(1)}%
                            </div>
                        </div>
                        <div className="text-[7px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                            BSI Filtered ROI ({totalRoiCount} Bets)
                        </div>
                    </div>
                )}
            </div>

            {/* CONTROLS */}
            <div className="flex gap-2 w-full">
                <div className="relative w-full">
                    <select 
                        value={timeFrame} 
                        onChange={(e) => setTimeFrame(e.target.value as TimeFrame)}
                        className="w-full appearance-none bg-black/40 text-white font-black text-[10px] py-2.5 pl-8 pr-3 rounded-lg border border-white/10 outline-none focus:border-white/30 cursor-pointer uppercase tracking-wider transition-colors"
                    >
                        <option value="ALL" className="bg-[#1a1d26] text-gray-300">All Time History</option>
                        <option value="2026" className="bg-[#1a1d26] text-gray-300">2026 Season</option>
                        <option value="2025" className="bg-[#1a1d26] text-gray-300">2025 Season</option>
                        <option value="2024" className="bg-[#1a1d26] text-gray-300">2024 Season</option>
                    </select>
                    <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
            </div>
        </div>

        {/* --- LIST AREA --- */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-2 flex flex-col gap-2">
            {performanceData.length > 0 ? (
                performanceData.map((stat, idx) => {
                    const IconComp = stat.icon;
                    return (
                        <div key={idx} className="bg-black/20 border border-white/5 rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden group hover:bg-white/[0.02] transition-colors">
                            
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${stat.winRate >= 50 ? 'bg-tennis-lime' : 'bg-red-500/50'}`}></div>

                            <div className="flex justify-between items-center pl-2">
                                <div className="flex items-center gap-1.5">
                                    <IconComp size={10} className={stat.color} />
                                    <span className={`text-[10px] font-black uppercase tracking-wider ${stat.color}`}>{stat.label}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                    <span className={`text-[9px] font-black ${stat.winRate >= 50 ? 'text-tennis-lime' : 'text-gray-400'}`}>
                                        {stat.wins}W - {stat.losses}L
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-between items-end pl-2 mt-1">
                                <div className="flex flex-col">
                                    <span className="text-[7px] text-gray-500 uppercase font-black tracking-widest mb-0.5">True Win Rate</span>
                                    <span className="text-xs font-mono font-bold text-white">{stat.winRate.toFixed(1)}%</span>
                                </div>

                                <div className="flex flex-col items-end">
                                    <span className="text-[7px] text-gray-500 uppercase font-black tracking-widest mb-0.5">
                                        Yield (ROI) {stat.roiCount > 0 ? `| ${stat.roiCount} Bets` : ''}
                                    </span>
                                    {stat.roiCount > 0 ? (
                                        <div className={`flex items-center gap-1 text-xs font-mono font-black ${stat.roi > 0 ? 'text-tennis-lime' : 'text-red-500'}`}>
                                            {stat.roi > 0 ? '+' : ''}{stat.roi.toFixed(1)}%
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-gray-600 font-mono italic">No Odds Data</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-20 min-h-[100px]">
                    <Filter size={24} className="mb-1" />
                    <span className="text-[8px] uppercase font-bold tracking-widest">No BSI Data Found</span>
                </div>
            )}
        </div>

        {/* --- FOOTER --- */}
        <div className="px-4 py-3 bg-black/40 border-t border-white/5 flex justify-between items-center backdrop-blur-md">
            <span className="text-[8px] font-medium text-gray-500">Analyzed {currentFilteredMatches.length} historical matches</span>
            <div className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-tennis-lime">
                <Gauge size={10} /> Neural BSI Map
            </div>
        </div>
        
        </div>
    </PremiumLock>
  );
}