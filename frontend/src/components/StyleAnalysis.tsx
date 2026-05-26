import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  TrendingUp, CheckCircle2, XCircle, ChevronDown, Filter 
} from 'lucide-react';
import { useAccess } from '../hooks/useAccess';
import { PremiumLock } from './PremiumLock'; 
import { useTranslation } from 'react-i18next'; 

// --- TYPES ---
type TimeFrame = 'L10' | 'L20' | 'YTD' | 'ALL';

interface MatchData {
  opponent_name: string;
  opponent_styles: string[];
  winner: string;
  date: string;
  score?: string;
}

export function StyleAnalysis({ playerName }: { playerName: string }) {
  const { t } = useTranslation(); 
  const { isElite, loading: accessLoading } = useAccess(); 
  
  const [rawMatches, setRawMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Controls
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('L10');
  const [availableStyles, setAvailableStyles] = useState<string[]>([]);

  if (!playerName) return null;

  const isLocked = !isElite; 

  useEffect(() => {
    if (playerName) {
        fetchMatchHistory();
    }
  }, [playerName]);

  const fetchMatchHistory = async () => {
    try {
        setLoading(true);
        const playerLastName = playerName.split(' ').pop()?.toLowerCase() || playerName.toLowerCase();

        // 1. Parallel Fetch aus BEIDEN Datenbanken
        const [marketRes, historyRes] = await Promise.all([
            // Aktuelle Live-Scanner Matches
            supabase
                .from('market_odds')
                .select('created_at, player1_name, player2_name, actual_winner_name')
                .or(`player1_name.ilike.%${playerLastName}%,player2_name.ilike.%${playerLastName}%`)
                .not('actual_winner_name', 'is', null)
                .order('created_at', { ascending: false })
                .limit(50),
            // Historischer Jeff Sackmann Data Lake
            supabase
                .from('historical_matches')
                .select('match_date, winner_name, loser_name')
                .or(`winner_name.ilike.%${playerLastName}%,loser_name.ilike.%${playerLastName}%`)
                .order('match_date', { ascending: false })
                .limit(200) // Wir laden mehr, um ein tiefes Style-Profil zu erstellen
        ]);

        if (marketRes.error) console.error("Market Odds Fetch Error:", marketRes.error);
        if (historyRes.error) console.error("Historical Fetch Error:", historyRes.error);

        // 2. Standardisierung & Deduplikation (Verhindert doppelte Matches)
        const allMatches: { date: string; opponentName: string; winnerName: string }[] = [];
        const seenMatches = new Set<string>();

        // Verarbeite Market Odds
        if (marketRes.data) {
            marketRes.data.forEach((m: any) => {
                const isP1 = m.player1_name.toLowerCase().includes(playerLastName);
                const opponentName = isP1 ? m.player2_name : m.player1_name;
                const dateStr = new Date(m.created_at).toISOString().split('T')[0];
                
                // Composite Key für Deduplikation
                const key = `${dateStr}_${opponentName.split(' ').pop()?.toLowerCase()}`;
                
                if (!seenMatches.has(key)) {
                    seenMatches.add(key);
                    allMatches.push({
                        date: m.created_at,
                        opponentName: opponentName,
                        winnerName: m.actual_winner_name
                    });
                }
            });
        }

        // Verarbeite Historical Data Lake
        if (historyRes.data) {
            historyRes.data.forEach((m: any) => {
                const isWinner = m.winner_name.toLowerCase().includes(playerLastName);
                const opponentName = isWinner ? m.loser_name : m.winner_name;
                const dateStr = m.match_date; // Ist bereits YYYY-MM-DD
                
                const key = `${dateStr}_${opponentName.split(' ').pop()?.toLowerCase()}`;
                
                if (!seenMatches.has(key)) {
                    seenMatches.add(key);
                    allMatches.push({
                        date: m.match_date,
                        opponentName: opponentName,
                        winnerName: m.winner_name
                    });
                }
            });
        }

        if (allMatches.length === 0) {
            setRawMatches([]);
            setLoading(false);
            return;
        }

        // Chronologisch sortieren (neueste zuerst)
        allMatches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // 3. Opponent Styles aus der Player-Tabelle laden
        // Extrahiere alle Nachnamen der Gegner für den Lookup
        const opponentLastNames = [...new Set(allMatches.map(m => m.opponentName.split(' ').pop() || m.opponentName))];

        // Supabase Limit Bypass (Wir laden die Styles in Batches, falls es viele Gegner sind)
        const { data: opponents } = await supabase
            .from('players')
            .select('last_name, play_style')
            .in('last_name', opponentLastNames);

        const styleMap = new Map<string, string[]>();
        const allStylesSet = new Set<string>();

        opponents?.forEach(p => {
            if (p.play_style) {
                // Bereinigung von Styles (z.B. "Aggressive Baseliner (Power)")
                const styles = p.play_style.split(',').map((s: string) => s.split('(')[0].trim()).filter(Boolean);
                styleMap.set(p.last_name.toLowerCase(), styles);
                styles.forEach((s: string) => allStylesSet.add(s));
            }
        });

        // 4. Finale Formatierung der Matches für das UI
        const formatted = allMatches.map(m => {
            const oppLastName = m.opponentName.split(' ').pop()?.toLowerCase() || '';
            const styles = styleMap.get(oppLastName) || ['Unknown'];

            return {
                opponent_name: m.opponentName,
                opponent_styles: styles,
                winner: m.winnerName,
                date: m.date
            };
        });

        setRawMatches(formatted);
        
        const stylesArr = Array.from(allStylesSet).sort();
        setAvailableStyles(stylesArr);
        // Setze initial den Style, gegen den er am häufigsten gespielt hat, andernfalls alphabetisch den ersten
        if (stylesArr.length > 0) {
            setSelectedStyle(stylesArr.find(s => s !== 'Unknown') || stylesArr[0]);
        }

    } catch (error) {
        console.error("Analysis Error:", error);
    } finally {
        setLoading(false);
    }
  };

  const trendData = useMemo(() => {
    if (!selectedStyle || !playerName) return [];
    
    let relevantMatches = rawMatches.filter(m => m.opponent_styles.includes(selectedStyle));
    
    if (timeFrame === 'L10') relevantMatches = relevantMatches.slice(0, 10);
    if (timeFrame === 'L20') relevantMatches = relevantMatches.slice(0, 20);
    if (timeFrame === 'YTD') {
        const currentYear = new Date().getFullYear();
        relevantMatches = relevantMatches.filter(m => new Date(m.date).getFullYear() === currentYear);
    }
    
    return relevantMatches.map(m => {
        const winnerName = m.winner ? m.winner.toLowerCase() : '';
        const searchName = playerName.toLowerCase().split(' ').pop() || '';
        const isWin = winnerName.includes(searchName);
        
        return {
            ...m,
            isWin: !!isWin,
            displayDate: new Date(m.date).toLocaleDateString(undefined, {month:'short', year: '2-digit'})
        };
    }).reverse(); // Reverse für den Chart (älteste links, neueste rechts)
  }, [rawMatches, selectedStyle, timeFrame, playerName]);

  const stats = useMemo(() => {
      const total = trendData.length;
      if (total === 0) return { percentage: 0, wins: 0, losses: 0, total: 0 };
      const wins = trendData.filter(m => m.isWin).length;
      const losses = total - wins;
      return {
          percentage: Math.round((wins / total) * 100),
          wins,
          losses,
          total
      };
  }, [trendData]);


  if (accessLoading || (loading && isElite)) return (
    <div className="h-[280px] flex flex-col items-center justify-center bg-[#1a1d26] rounded-3xl border border-white/5 animate-pulse">
        <div className="w-8 h-8 border-2 border-tennis-lime border-t-transparent rounded-full animate-spin mb-2"></div>
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('styleAnalysis.loading')}</span>
    </div>
  );

  return (
    <PremiumLock
        isLocked={isLocked}
        minTier="ELITE"
        title="Style Edge Analysis"
        description={`Deep historical performance vs ${selectedStyle || 'specific archetypes'}.`}
        blurAmount="blur-md"
    >
        <div className="bg-[#1a1d26] rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden flex flex-col min-h-[320px] md:min-h-[340px]">
        
        {/* --- HEADER (ULTRA COMPACT) --- */}
        <div className="p-4 border-b border-white/5 flex flex-col gap-3 relative z-10 bg-gradient-to-b from-white/[0.02] to-transparent">
            
            <div className="flex justify-between items-center">
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <TrendingUp size={10} className="text-tennis-lime" />
                        <span className="text-gray-500 text-[8px] font-black uppercase tracking-[0.2em]">Historical Record</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl md:text-2xl font-black text-white uppercase leading-none tracking-tight">
                            {playerName.split(' ').pop()} 
                        </h2>
                        {/* W-L Record */}
                        <div className="bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                          <span className={`text-sm md:text-base font-black tabular-nums ${stats.percentage >= 60 ? 'text-tennis-lime' : (stats.percentage >= 40 ? 'text-yellow-500' : 'text-red-500')}`}>
                              {stats.wins}W - {stats.losses}L
                          </span>
                        </div>
                    </div>
                </div>

                {/* COMPACT EFFICIENCY BADGE */}
                <div className="text-right flex flex-col items-end">
                    <div className="text-[16px] md:text-[20px] font-black text-white leading-none tracking-tighter">
                        {stats.percentage}%
                    </div>
                    <div className="text-[7px] font-bold text-gray-500 uppercase tracking-widest">Efficiency</div>
                </div>
            </div>

            {/* STYLE SELECTOR */}
            <div className="relative w-full">
                <select 
                    value={selectedStyle} 
                    onChange={(e) => setSelectedStyle(e.target.value)}
                    className="w-full appearance-none bg-black/40 text-tennis-lime font-black text-[10px] md:text-xs py-2.5 px-3 rounded-lg border border-tennis-lime/20 outline-none focus:ring-1 focus:ring-tennis-lime cursor-pointer uppercase tracking-wider transition-colors"
                >
                    {availableStyles.length > 0 ? availableStyles.map(s => (
                        <option key={s} value={s} className="bg-[#1a1d26] text-gray-300">{s}</option>
                    )) : <option className="bg-[#1a1d26] text-gray-500 italic">{t('styleAnalysis.unknownStyles')}</option>}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-tennis-lime pointer-events-none" />
            </div>
        </div>

        {/* --- CHART AREA --- */}
        <div className="flex-1 px-4 py-4 flex flex-col justify-end relative h-full">
            
            {/* Minimalist Grid */}
            <div className="absolute inset-0 px-4 py-4 flex flex-col justify-between pointer-events-none opacity-[0.03]">
                <div className="border-t border-white w-full"></div>
                <div className="border-t border-white w-full"></div>
            </div>

            {trendData.length > 0 ? (
                <div className="flex items-end justify-between gap-1 h-24 md:h-32 w-full z-10 overflow-x-auto hide-scrollbar">
                    {trendData.map((match, i) => (
                        <div key={i} className="flex-1 min-w-[12px] flex flex-col items-center group/bar relative h-full justify-end">
                            
                            <div className="absolute bottom-full mb-2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-white text-black p-1.5 rounded-md shadow-xl pointer-events-none min-w-[80px] z-50 transform -translate-x-1/2 left-1/2">
                                <div className="text-[7px] font-bold text-gray-400 uppercase">{match.displayDate}</div>
                                <div className="text-[9px] font-black uppercase truncate">{match.opponent_name}</div>
                            </div>

                            <div 
                                className={`w-full rounded-t-[3px] transition-all duration-500 ease-out hover:brightness-110 relative
                                ${match.isWin 
                                    ? 'bg-gradient-to-t from-tennis-lime/60 to-tennis-lime shadow-[0_0_10px_rgba(132,204,22,0.2)]' 
                                    : 'bg-gradient-to-t from-red-900/80 to-red-600'}`}
                                style={{ 
                                    height: match.isWin ? '90%' : '35%', 
                                    opacity: 1 
                                }}
                            >
                                <div className="absolute top-1 left-1/2 -translate-x-1/2 opacity-30">
                                    {match.isWin ? <CheckCircle2 size={8} className="text-black" /> : <XCircle size={8} className="text-white" />}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-20 min-h-[100px]">
                    <Filter size={24} className="mb-1" />
                    <span className="text-[8px] uppercase font-bold tracking-widest">{t('styleAnalysis.noData')}</span>
                </div>
            )}
        </div>

        {/* --- FOOTER (ULTRA SLIM) --- */}
        <div className="px-4 py-3 bg-black/40 border-t border-white/5 flex justify-between items-center gap-2 backdrop-blur-md">
            <div className="flex gap-1 p-0.5 bg-black/40 rounded-md border border-white/5 overflow-x-auto no-scrollbar">
                {(['L10', 'L20', 'YTD', 'ALL'] as TimeFrame[]).map(tf => (
                    <button 
                        key={tf}
                        onClick={() => setTimeFrame(tf)}
                        className={`px-3 py-1.5 rounded text-[8px] font-black transition-all uppercase tracking-wider
                        ${timeFrame === tf ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                    >
                        {tf}
                    </button>
                ))}
            </div>
            
            <div className="flex items-center gap-2 text-[7px] font-bold text-gray-500 uppercase tracking-widest">
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-tennis-lime"></div> W</div>
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-600"></div> L</div>
            </div>
        </div>
        </div>
    </PremiumLock>
  );
}