import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { ScrollToTop } from '../components/ScrollToTop';
import { 
  ArrowLeft, CheckCircle2, XCircle, TrendingUp, BarChart3, Target, Zap, History, ArrowUpRight, ArrowDownRight,
  ChevronLeft, ChevronRight, Percent, TrendingDown, Scale, Shield, Crown, Activity, Wallet, PieChart, Calendar, Swords,
  Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LoadingScreen } from '../components/LoadingScreen';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { motion } from 'framer-motion';

// --- CONFIGURATION ---
// 🚀 SOTA: "Line in the Sand" - Reset auf NEO.bet Integration Launch Date
const STATS_RESET_DATE = '2026-05-27T00:00:00.000Z'; 

// --- ROBUST HELPERS ---
const isPlayer1Target = (pickName: string, p1Name: string) => {
    const pick = pickName.toLowerCase().trim();
    const p1 = p1Name.toLowerCase().trim();
    if (pick.includes(p1) || p1.includes(pick)) return true;
    const pickLast = pick.split(' ').pop() || '';
    if (pickLast && p1.includes(pickLast)) return true;
    return false;
};

const checkWinnerResult = (pickName: string, actualWinner: string | null) => {
    if (!actualWinner || !pickName) return false;
    const p = pickName.toLowerCase().trim();
    const w = actualWinner.toLowerCase().trim();
    if (p.includes(w) || w.includes(p)) return true;
    const pLast = p.split(' ').pop() || '';
    if (pLast && w.includes(pLast)) return true;
    return false;
};

const parseValueFromText = (text: string | undefined) => {
    if (!text) {
        return { hasValue: false, pickName: '', edge: 0, fairOdds: 0, marketOdds: 0, type: '', stake: 0 };
    }

    // 🚀 SOTA: Parse Syndicate Labels and Fractional Kelly
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
                fairOdds: 0,
                edge: parseFloat(match[4]),
                stake: finalStake
            };
         }
    }
    
    return { hasValue: false, pickName: '', stake: 0, edge: 0, fairOdds: 0, marketOdds: 0, type: '' };
};

// --- BUCHDAHL MODEL: STATISTICAL SKILL SIGNIFICANCE ---
const calculateSkillSignificance = (totalBets: number, roiDecimal: number, avgOdds: number) => {
    if (totalBets < 5 || roiDecimal <= 0) {
        return { pValue: 0.5, skillCertainty: 50 };
    }
    const tStat = (roiDecimal * Math.sqrt(totalBets)) / Math.sqrt(Math.max(0.01, avgOdds - 1));
    const z = tStat;
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const sign = z < 0 ? -1 : 1;
    const absZ = Math.abs(z) / Math.sqrt(2);
    const t = 1.0 / (1.0 + p * absZ);
    const erf = sign * (1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absZ * absZ));
    const phi = 0.5 * (1.0 + erf);
    
    const pValue = 1.0 - phi;
    const skillCertainty = phi * 100;
    
    return {
        pValue: Math.max(0.0001, Math.min(0.5, pValue)),
        skillCertainty: Math.max(50, Math.min(99.99, skillCertainty))
    };
};

// --- ELITE ARCHITECT: LABEL STYLING ENGINE ---
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

// --- COMPONENT: STAT CARD ---
const StatCard = ({ title, value, subtext, trend, icon: Icon, colorClass, isUnit = false }: any) => (
  <div className="bg-[#1a1d26] border border-white/5 rounded-2xl p-5 relative overflow-hidden group min-w-[240px] md:min-w-0 flex-1 snap-center shadow-lg h-full shrink-0 transition-all hover:border-white/10">
    <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity ${colorClass}`}>
      <Icon size={80} />
    </div>
    <div className="relative z-10 flex flex-col h-full justify-between">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className={`p-2 rounded-lg bg-white/5 ${colorClass} bg-opacity-10`}>
            <Icon size={16} className={colorClass.replace('bg-', 'text-')} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{title}</span>
        </div>
        <div className={`text-3xl md:text-4xl font-black tracking-tight mb-1 ${colorClass}`}>
          {value}{isUnit ? <span className="text-xl ml-1 text-gray-500 font-bold uppercase tracking-widest">u</span> : ''}
        </div>
      </div>
        
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${trend > 0 ? 'bg-green-500/10 text-green-400' : (trend < 0 ? 'bg-red-500/10 text-red-400' : 'bg-gray-500/10 text-gray-400')}`}>
            {trend > 0 ? <ArrowUpRight size={12} /> : (trend < 0 ? <ArrowDownRight size={12} /> : null)}
            {Math.abs(trend)}{isUnit ? 'u' : '%'}
          </div>
        )}
        <span className="text-[10px] font-medium text-gray-500 truncate">{subtext}</span>
      </div>
    </div>
  </div>
);

// --- COMPONENT: MINI INSIGHT CARD (Apple-Style Swipeable) ---
const MiniInsightCard = ({ title, value1, label1, value2, label2, colorClass }: any) => (
  <motion.div 
    whileHover={{ y: -2 }}
    className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col justify-between shadow-inner relative overflow-hidden shrink-0 w-[75vw] sm:w-[240px] md:w-auto snap-center transition-colors hover:bg-white/[0.04]"
  >
    <div className={`absolute top-0 left-0 w-1 h-full ${colorClass.replace('text-', 'bg-')}`}></div>
    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 ml-2">{title}</span>
    <div className="flex justify-between items-end ml-2">
        <div className="flex flex-col">
            <span className={`text-xl md:text-lg lg:text-xl font-black leading-none mb-1 ${colorClass}`}>{value1}</span>
            <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">{label1}</span>
        </div>
        <div className="flex flex-col items-end text-right">
            <span className={`text-xl md:text-lg lg:text-xl font-black leading-none mb-1 text-white`}>{value2}</span>
            <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">{label2}</span>
        </div>
    </div>
  </motion.div>
);

// --- COMPONENT: CHART TOOLTIP ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#15171e]/95 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl">
        <p className="text-[10px] font-mono text-gray-400 mb-2">{label}</p>
        <div className="flex items-center justify-between gap-4 mb-1">
            <span className="text-xs font-bold text-white">Cumulative Profit:</span>
            <span className={`text-xs font-black ${data.units >= 0 ? 'text-tennis-lime' : 'text-red-500'}`}>
                {data.units > 0 ? '+' : ''}{data.units.toFixed(2)}u
            </span>
        </div>
        <div className="flex items-center justify-between gap-4">
            <span className="text-[10px] font-medium text-gray-500">{data.pickName === 'Period Start' ? 'Event:' : 'Pick:'}</span>
            <span className="text-[10px] font-bold text-gray-300">{data.pickName}</span>
        </div>
      </div>
    );
  }
  return null;
};

export function PerformancePage() {
  const { t, i18n } = useTranslation();
  
  const [processedBets, setProcessedBets] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [chartFilter, setChartFilter] = useState<'1W' | '1M' | '3M' | 'ALL'>('ALL');
  const categoryFilter = 'ALL';
  const [rawBets, setRawBets] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [stats, setStats] = useState({
    totalSignals: 0,
    avgEdge: 0,        
    avgClv: 0,
    totalUnits: 0,
    roi: 0,
    units10d: 0,
    units30d: 0,
    avgBrier: 0.25,
    pValue: 0.5,
    skillCertainty: 50,
    brackets: {
        fav: { clvSum: 0, units: 0, count: 0 },   
        core: { clvSum: 0, units: 0, count: 0 },  
        dog: { clvSum: 0, units: 0, count: 0 },   
        long: { clvSum: 0, units: 0, count: 0 }   
    },
    stakeBrackets: {
        low: { clvSum: 0, units: 0, count: 0 },   
        med: { clvSum: 0, units: 0, count: 0 },   
        high: { clvSum: 0, units: 0, count: 0 },  
        max: { clvSum: 0, units: 0, count: 0 }    
    }
  });

  useEffect(() => {
    fetchHistory();
    
    // 🚀 SOTA FIX: Realtime-Updates aktivieren, damit die Seite live bleibt
    const debouncedFetch = () => {
        if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = setTimeout(() => {
            fetchHistory();
        }, 2000);
    };

    const channel = supabase.channel('performance-history')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'market_odds' }, debouncedFetch)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'market_odds' }, debouncedFetch)
        .subscribe();

    return () => {
        if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
        supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (rawBets.length > 0) {
      processAndCalculate(rawBets);
      setCurrentPage(1); 
    }
  }, [rawBets]);

  // 🚀 SOTA FIX: PAGINATION - Umgeht das harte Supabase 1.000 Row Limit
  const fetchHistory = async () => {
    let allData: any[] = [];
    let offset = 0;
    const limit = 1000;
    let keepFetching = true;

    while (keepFetching) {
        const { data, error } = await supabase
            .from('market_odds')
            .select('*')
            .neq('actual_winner_name', null)
            .neq('actual_winner_name', '')
            .gte('created_at', STATS_RESET_DATE) 
            .order('created_at', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error("Error fetching history:", error);
            break;
        }

        if (data && data.length > 0) {
            allData = [...allData, ...data];
            offset += limit;
            
            // Wenn weniger als 1000 zurückkommen, haben wir alle erwischt.
            if (data.length < limit) {
                keepFetching = false;
            }
        } else {
            keepFetching = false;
        }
    }

    if (allData.length > 0) {
      setRawBets(allData);
      processAndCalculate(allData);
    } else {
       setStats({ 
           totalSignals: 0, avgEdge: 0, avgClv: 0, totalUnits: 0, roi: 0, 
           units10d: 0, units30d: 0, 
           brackets: { fav: {clvSum:0, units:0, count:0}, core: {clvSum:0, units:0, count:0}, dog: {clvSum:0, units:0, count:0}, long: {clvSum:0, units:0, count:0} },
           stakeBrackets: { low: {clvSum:0, units:0, count:0}, med: {clvSum:0, units:0, count:0}, high: {clvSum:0, units:0, count:0}, max: {clvSum:0, units:0, count:0} } 
       });
       setProcessedBets([]);
       setChartData([]);
    }
    setLoading(false);
  };

  const processAndCalculate = (data: any[]) => {
    let totalSignals = 0;
    let sumEdge = 0;
    let sumClv = 0; 
    let cumulativeUnits = 0;
    let totalUnitsStaked = 0;

    let units10d = 0;
    let units30d = 0;
    
    let sumBrier = 0;
    let brierCount = 0;
    let sumOdds = 0;

    const brackets = {
        fav: { clvSum: 0, units: 0, count: 0 },
        core: { clvSum: 0, units: 0, count: 0 },
        dog: { clvSum: 0, units: 0, count: 0 },
        long: { clvSum: 0, units: 0, count: 0 }
    };

    const stakeBrackets = {
        low: { clvSum: 0, units: 0, count: 0 },
        med: { clvSum: 0, units: 0, count: 0 },
        high: { clvSum: 0, units: 0, count: 0 },
        max: { clvSum: 0, units: 0, count: 0 }
    };

    const now = Date.now();
    const ms10Days = 10 * 24 * 60 * 60 * 1000;
    const ms30Days = 30 * 24 * 60 * 60 * 1000;
    
    const validSignals: any[] = [];
    const chartPoints: any[] = [];

    chartPoints.push({ 
        date: 'Start', 
        units: 0, 
        timestamp: new Date(STATS_RESET_DATE).getTime(), 
        pickName: 'V211.00 System Init' 
    });

    data.forEach(match => {
      let valInfo = parseValueFromText(match.ai_analysis_text);
      
      if (!valInfo.hasValue && match.ai_fair_odds1 && match.ai_fair_odds2) {
          const op1 = match.opening_odds1 || match.odds1;
          const op2 = match.opening_odds2 || match.odds2;
          
          if (op1 && op2) {
              const edge1 = ((op1 / match.ai_fair_odds1) - 1) * 100;
              const edge2 = ((op2 / match.ai_fair_odds2) - 1) * 100;
              
              if (edge1 > 1.0) {
                  valInfo = { hasValue: true, pickName: match.player1_name, edge: edge1, marketOdds: op1, fairOdds: match.ai_fair_odds1, type: 'INFO', stake: 1 };
              } else if (edge2 > 1.0) {
                  valInfo = { hasValue: true, pickName: match.player2_name, edge: edge2, marketOdds: op2, fairOdds: match.ai_fair_odds2, type: 'INFO', stake: 1 };
              }
          }
      }

      // 🛑 SOTA: Fractional Kelly Gatekeeper
      if (!valInfo.hasValue) return; 

      // Filter out absolute Noise and Vetoes completely
      if (valInfo.stake <= 0 || valInfo.type.includes('VETO') || valInfo.type.includes('NO EDGE') || valInfo.type.includes('NOISE')) return;

      const { pickName, marketOdds, edge, stake, type, fairOdds } = valInfo;

      // 🚀 Absolute Safety Check: Skip any live/in-play signals
      const isLive = type.toLowerCase().includes('live');
      if (isLive) return;

      const isWin = checkWinnerResult(pickName, match.actual_winner_name);
      
      if (fairOdds > 0) {
          const predProb = 1 / fairOdds;
          const actualOutcome = isWin ? 1 : 0;
          sumBrier += Math.pow(predProb - actualOutcome, 2);
          brierCount++;
      }
      sumOdds += marketOdds;
      
      const actualStake = stake;
      let unitProfit = isWin ? (actualStake * (marketOdds - 1)) : -actualStake;
      
      cumulativeUnits += unitProfit;
      totalUnitsStaked += actualStake;

      const matchTime = new Date(match.created_at).getTime();
      const age = now - matchTime;
      if (age <= ms10Days) units10d += unitProfit;
      if (age <= ms30Days) units30d += unitProfit;

      const p1IsPick = isPlayer1Target(pickName, match.player1_name);
      const closingOdds = p1IsPick ? match.odds1 : match.odds2;
      let clv = 0;
      if (closingOdds > 0 && marketOdds > 0) {
          clv = ((marketOdds / closingOdds) - 1) * 100;
      }

      let bKey: 'fav' | 'core' | 'dog' | 'long' = 'fav';
      if (marketOdds < 1.50) bKey = 'fav';
      else if (marketOdds < 2.00) bKey = 'core';
      else if (marketOdds < 3.00) bKey = 'dog';
      else bKey = 'long';

      brackets[bKey].count++;
      brackets[bKey].clvSum += clv;
      brackets[bKey].units += unitProfit;

      let sKey: 'low' | 'med' | 'high' | 'max' = 'low';
      if (actualStake < 1.0) sKey = 'low';
      else if (actualStake < 2.0) sKey = 'med';
      else if (actualStake < 3.0) sKey = 'high';
      else sKey = 'max';

      stakeBrackets[sKey].count++;
      stakeBrackets[sKey].clvSum += clv;
      stakeBrackets[sKey].units += unitProfit;

      totalSignals++;
      sumEdge += edge;
      sumClv += clv;

      const formattedDate = new Date(match.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      chartPoints.push({
          date: formattedDate,
          timestamp: matchTime,
          units: cumulativeUnits,
          pickName: pickName
      });

      validSignals.push({
        ...match,
        calculated: { 
            pickName, 
            type: type, 
            entryOdds: marketOdds, 
            closingOdds: closingOdds, 
            clv,
            edge,
            isWin,
            stake: actualStake,
            unitProfit
        }
      });
    });

    const activeSignalsCount = validSignals.length;
    
    if (activeSignalsCount > 0) {
        const avgEdgeVal = sumEdge / activeSignalsCount;
        const avgClvVal = sumClv / activeSignalsCount;
        const roiVal = totalUnitsStaked > 0 ? (cumulativeUnits / totalUnitsStaked) * 100 : 0;
        
        const avgBrier = brierCount > 0 ? sumBrier / brierCount : 0.25;
        const avgOdds = activeSignalsCount > 0 ? sumOdds / activeSignalsCount : 1.90;
        const sig = calculateSkillSignificance(activeSignalsCount, roiVal / 100, avgOdds);

        setStats({
            totalSignals: activeSignalsCount,
            avgEdge: parseFloat(avgEdgeVal.toFixed(1)),
            avgClv: parseFloat(avgClvVal.toFixed(2)),
            totalUnits: parseFloat(cumulativeUnits.toFixed(2)),
            roi: parseFloat(roiVal.toFixed(2)),
            units10d: parseFloat(units10d.toFixed(2)),
            units30d: parseFloat(units30d.toFixed(2)),
            avgBrier,
            pValue: sig.pValue,
            skillCertainty: sig.skillCertainty,
            brackets,
            stakeBrackets
        });
    } else {
        setStats({ 
            totalSignals: 0, avgEdge: 0, avgClv: 0, totalUnits: 0, roi: 0, 
            units10d: 0, units30d: 0, avgBrier: 0.25, pValue: 0.5, skillCertainty: 50, brackets, stakeBrackets 
        });
    }

    // 🚀 SOTA FIX: Exakte chronologische Tabellen-Sortierung (neueste gespielte Matches zuerst)
    const sortedForTable = [...validSignals].sort((a, b) => {
        const timeA = new Date(a.match_time || a.created_at).getTime();
        const timeB = new Date(b.match_time || b.created_at).getTime();
        return timeB - timeA;
    });

    setProcessedBets(sortedForTable);
    setChartData(chartPoints);
  };

  const exportToMarkdown = () => {
    let md = `# BackhandTL Syndicate Performance Export\n\n`;
    md += `*Generated on: ${new Date().toLocaleString()}*\n`;
    md += `*Filter Mode: ${categoryFilter}*\n\n`;
    
    md += `## Key Metrics\n`;
    md += `| Metric | Value |\n`;
    md += `| :--- | :--- |\n`;
    md += `| **Net Profit** | ${stats.totalUnits > 0 ? '+' : ''}${stats.totalUnits}u |\n`;
    md += `| **Return on Investment (ROI)** | ${stats.roi > 0 ? '+' : ''}${stats.roi}% |\n`;
    md += `| **Total Signals** | ${stats.totalSignals} |\n`;
    md += `| **Average Edge** | +${stats.avgEdge}% |\n`;
    md += `| **Average CLV** | ${stats.avgClv > 0 ? '+' : ''}${stats.avgClv}% |\n`;
    md += `| **Brier Score (Forecasting Calibration)** | ${stats.avgBrier.toFixed(4)} |\n`;
    md += `| **t-Test p-Value (Luck vs Skill)** | p = ${stats.pValue.toFixed(4)} |\n`;
    md += `| **Skill Certainty** | ${stats.skillCertainty.toFixed(2)}% |\n\n`;

    md += `## Forecasting Calibration & Statistical Significance\n`;
    md += `*   **Brier Score:** ${stats.avgBrier.toFixed(4)} (${stats.avgBrier < 0.21 ? 'Excellent Calibration' : 'Standard Calibration'})\n`;
    md += `*   **t-Test p-Value:** p = ${stats.pValue.toFixed(4)} (Threshold for significance: p < 0.05)\n`;
    md += `*   **Statistical Skill Certainty:** ${stats.skillCertainty.toFixed(2)}%\n\n`;

    md += `## Deep Portfolio Insights\n\n`;
    md += `### Model Efficiency by Odds Bracket\n`;
    md += `| Bracket | Bets | Avg CLV | Cumulative Profit |\n`;
    md += `| :--- | :---: | :---: | :---: |\n`;
    md += `| Favorites (< 1.50) | ${stats.brackets.fav.count} | ${(stats.brackets.fav.count > 0 ? stats.brackets.fav.clvSum / stats.brackets.fav.count : 0).toFixed(1)}% | ${stats.brackets.fav.units > 0 ? '+' : ''}${stats.brackets.fav.units.toFixed(1)}u |\n`;
    md += `| Core (1.50 - 1.99) | ${stats.brackets.core.count} | ${(stats.brackets.core.count > 0 ? stats.brackets.core.clvSum / stats.brackets.core.count : 0).toFixed(1)}% | ${stats.brackets.core.units > 0 ? '+' : ''}${stats.brackets.core.units.toFixed(1)}u |\n`;
    md += `| Underdogs (2.00 - 2.99) | ${stats.brackets.dog.count} | ${(stats.brackets.dog.count > 0 ? stats.brackets.dog.clvSum / stats.brackets.dog.count : 0).toFixed(1)}% | ${stats.brackets.dog.units > 0 ? '+' : ''}${stats.brackets.dog.units.toFixed(1)}u |\n`;
    md += `| Longshots (3.00+) | ${stats.brackets.long.count} | ${(stats.brackets.long.count > 0 ? stats.brackets.long.clvSum / stats.brackets.long.count : 0).toFixed(1)}% | ${stats.brackets.long.units > 0 ? '+' : ''}${stats.brackets.long.units.toFixed(1)}u |\n\n`;

    md += `### Model Efficiency by Stake Size\n`;
    md += `| Stake Bracket | Bets | Avg CLV | Cumulative Profit |\n`;
    md += `| :--- | :---: | :---: | :---: |\n`;
    md += `| Micro (< 1.0u) | ${stats.stakeBrackets.low.count} | ${(stats.stakeBrackets.low.count > 0 ? stats.stakeBrackets.low.clvSum / stats.stakeBrackets.low.count : 0).toFixed(1)}% | ${stats.stakeBrackets.low.units > 0 ? '+' : ''}${stats.stakeBrackets.low.units.toFixed(1)}u |\n`;
    md += `| Med (1.0 - 1.9u) | ${stats.stakeBrackets.med.count} | ${(stats.stakeBrackets.med.count > 0 ? stats.stakeBrackets.med.clvSum / stats.stakeBrackets.med.count : 0).toFixed(1)}% | ${stats.stakeBrackets.med.units > 0 ? '+' : ''}${stats.stakeBrackets.med.units.toFixed(1)}u |\n`;
    md += `| High (2.0 - 2.9u) | ${stats.stakeBrackets.high.count} | ${(stats.stakeBrackets.high.count > 0 ? stats.stakeBrackets.high.clvSum / stats.stakeBrackets.high.count : 0).toFixed(1)}% | ${stats.stakeBrackets.high.units > 0 ? '+' : ''}${stats.stakeBrackets.high.units.toFixed(1)}u |\n`;
    md += `| Max Bomb (3.0u+) | ${stats.stakeBrackets.max.count} | ${(stats.stakeBrackets.max.count > 0 ? stats.stakeBrackets.max.clvSum / stats.stakeBrackets.max.count : 0).toFixed(1)}% | ${stats.stakeBrackets.max.units > 0 ? '+' : ''}${stats.stakeBrackets.max.units.toFixed(1)}u |\n\n`;

    md += `## Settled Betting Records\n`;
    md += `| Date | Tournament | Matchup | Selection | Odds | Stake | Edge | CLV | Outcome | Profit/Loss |\n`;
    md += `| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;
    
    processedBets.forEach(match => {
      const { pickName, entryOdds, closingOdds, clv, isWin, edge, stake, unitProfit } = match.calculated;
      const formattedDate = new Date(match.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      const matchup = `${match.player1_name} vs ${match.player2_name}`;
      const outcomeStr = isWin ? 'WON' : 'LOST';
      const profitStr = `${unitProfit > 0 ? '+' : ''}${unitProfit.toFixed(2)}u`;
      md += `| ${formattedDate} | ${match.tournament || 'N/A'} | ${matchup} | ${pickName} | @${entryOdds.toFixed(2)} | ${stake.toFixed(1)}u | +${edge.toFixed(1)}% | ${closingOdds > 0 ? clv.toFixed(1) + '%' : 'N/A'} | ${outcomeStr} | ${profitStr} |\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `backhandtl_performance_${categoryFilter.toLowerCase()}_${new Date().toISOString().split('T')[0]}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredChartData = useMemo(() => {
      if (chartFilter === 'ALL' || chartData.length === 0) return chartData;

      const now = Date.now();
      let cutoff = 0;
      if (chartFilter === '1W') cutoff = now - 7 * 24 * 60 * 60 * 1000;
      if (chartFilter === '1M') cutoff = now - 30 * 24 * 60 * 60 * 1000;
      if (chartFilter === '3M') cutoff = now - 90 * 24 * 60 * 60 * 1000;

      let startPoint = chartData[0]; 
      for (let i = chartData.length - 1; i >= 0; i--) {
          if (chartData[i].timestamp < cutoff) {
              startPoint = chartData[i];
              break;
          }
      }

      const visiblePoints = chartData.filter(d => d.timestamp >= cutoff);
      
      const newStart = { 
          ...startPoint, 
          date: 'Start', 
          timestamp: cutoff - 1, 
          pickName: 'Period Start' 
      };

      return [newStart, ...visiblePoints];
  }, [chartData, chartFilter]);

  const totalPages = Math.ceil(processedBets.length / ITEMS_PER_PAGE);
  const currentTableData = useMemo(() => {
    const firstPageIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedBets.slice(firstPageIndex, firstPageIndex + ITEMS_PER_PAGE);
  }, [currentPage, processedBets]);

  const goToNextPage = () => currentPage < totalPages && (setCurrentPage(p => p + 1), window.scrollTo({top:0, behavior:'smooth'}));
  const goToPrevPage = () => currentPage > 1 && (setCurrentPage(p => p - 1), window.scrollTo({top:0, behavior:'smooth'}));

  if (loading) return <LoadingScreen message={t('performance.loading')} />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
      <ScrollToTop />
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-tennis-lime/10 rounded-xl">
              <Activity size={24} className="text-tennis-lime" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">
              {t('performance.title')}
            </h1>
          </div>
          <p className="text-gray-400 text-sm font-medium max-w-2xl leading-relaxed pl-1">
            {t('performance.subtitle')}
          </p>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1d26] border border-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 self-start md:self-auto shadow-lg">
          <div className="w-2 h-2 bg-tennis-lime rounded-full animate-pulse shadow-[0_0_10px_#84cc16]"></div>
          {t('performance.liveStatus')}
        </div>
      </div>

      {/* KPI GRID (MODEL METRICS) */}
      <div className="flex overflow-x-auto pb-6 gap-4 mb-4 -mx-4 px-4 snap-x snap-mandatory hide-scrollbar md:grid md:grid-cols-2 xl:grid-cols-4 md:pb-0 md:mx-0 md:px-0">
        
        <StatCard 
          title={t('performance.kpis.netProfit.title')} 
          value={`${stats.totalUnits > 0 ? '+' : ''}${stats.totalUnits}`} 
          subtext={t('performance.kpis.netProfit.subtext')}
          icon={Wallet} 
          colorClass={stats.totalUnits >= 0 ? "text-tennis-lime" : "text-red-500"} 
          isUnit={true}
        />

        <StatCard 
          title={t('performance.kpis.winRate.title')} 
          value={`${stats.roi > 0 ? '+' : ''}${stats.roi}%`} 
          subtext={i18n.language.startsWith('de') ? "Return on Investment" : "Return on Investment"}
          icon={PieChart} 
          colorClass={stats.roi >= 0 ? "text-blue-400" : "text-red-500"} 
        />

        <StatCard 
          title="CLOSING LINE VALUE" 
          value={`${stats.avgClv > 0 ? '+' : ''}${stats.avgClv}%`} 
          subtext={
            i18n.language.startsWith('de') 
              ? "Durchschnittliche CLV-Stärke" 
              : (i18n.language.startsWith('es') 
                ? "Magnitud media del CLV" 
                : (i18n.language.startsWith('fr') 
                  ? "Magnitude moyenne du CLV" 
                  : (i18n.language.startsWith('it') 
                    ? "Magnitudo media del CLV" 
                    : "Average CLV Magnitude")))
          }
          icon={Zap} 
          colorClass={stats.avgClv >= 0 ? "text-emerald-400" : "text-gray-400"} 
        />

        <StatCard 
          title={t('performance.kpis.signals.title')} 
          value={stats.totalSignals} 
          subtext={t('performance.kpis.signals.subtext')}
          icon={BarChart3} 
          colorClass="text-fuchsia-400" 
        />
      </div>

      {stats.totalSignals > 0 && (
          <div className="mb-8 bg-gradient-to-br from-[#1a1d26] to-[#13151c] rounded-3xl border border-white/5 overflow-hidden shadow-2xl p-6 relative">
              <div className="absolute top-0 right-0 p-6 text-tennis-lime opacity-5 pointer-events-none">
                  <Crown size={120} />
              </div>
              <h3 className="text-white font-black text-lg uppercase tracking-tighter mb-1 flex items-center gap-2 relative z-10">
                  <Shield size={18} className="text-tennis-lime animate-pulse" /> {
                    i18n.language.startsWith('de') 
                      ? 'Syndikat-Analytik (Buchdahl-Modell)' 
                      : 'Syndicate Analytics (Buchdahl Model)'
                  }
              </h3>
              <p className="text-[10px] text-gray-500 font-medium mb-6 uppercase tracking-wider relative z-10">
                  {i18n.language.startsWith('de') 
                    ? 'Wissenschaftliche Validierung unserer Vorhersagegenauigkeit und Marktüberlegenheit' 
                    : 'Scientific validation of our forecasting accuracy and market beat'}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Brier Score Calibration Card */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
                      <div>
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2 block">Forecasting Calibration</span>
                          <h4 className="text-white font-black text-xl mb-1 uppercase tracking-tight">Brier Score</h4>
                          <p className="text-[10px] text-gray-400 font-medium leading-relaxed mb-4">
                              {i18n.language.startsWith('de') 
                                ? 'Misst die absolute Kalibrierung unserer Fair-Odds-Wahrscheinlichkeiten. Ein Wert von 0.00 entspricht perfektem mathematischem Wissen, während 0.25 reinem Zufallsraten gleicht.' 
                                : 'Measures the absolute calibration of our fair probability forecasts. A score of 0.00 represents perfect mathematical knowledge, whereas 0.25 represents pure random noise.'}
                          </p>
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                          <div className="flex flex-col">
                              <span className="text-3xl font-black text-tennis-lime font-mono">{stats.avgBrier.toFixed(4)}</span>
                              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                                  {stats.avgBrier < 0.21 ? (i18n.language.startsWith('de') ? '🔥 Exzellent Kalibriert' : '🔥 Highly Calibrated') : (i18n.language.startsWith('de') ? '⚖️ Stabil' : '⚖️ Standard Calibration')}
                              </span>
                          </div>
                          
                          <div className="text-right">
                              <div className="text-xs font-bold text-white">{i18n.language.startsWith('de') ? 'Zufall-Baseline:' : 'Noise Baseline:'}</div>
                              <div className="text-xs text-gray-500 font-mono">0.2500</div>
                          </div>
                      </div>
                  </div>
                  
                  {/* p-Value Skill Certainty Card */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
                      <div>
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2 block">Statistical Significance</span>
                          <h4 className="text-white font-black text-xl mb-1 uppercase tracking-tight">{i18n.language.startsWith('de') ? 'Können-Nachweis (p-Wert)' : 'Proof of Skill (p-Value)'}</h4>
                          <p className="text-[10px] text-gray-400 font-medium leading-relaxed mb-4">
                              {i18n.language.startsWith('de') 
                                ? 'Führt einen wissenschaftlichen t-Test gegen 10.000 simulierte Zufallswetten mit gleicher Quotenverteilung aus. Ein p-Wert unter 0.05 (5%) schließt reines Glück statistisch aus.' 
                                : 'Executes a scientific t-test comparing our ROI against 10,000 simulated random-noise tipping records. A p-value below 0.05 mathematically excludes pure luck.'}
                          </p>
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                          <div className="flex flex-col">
                              <span className="text-3xl font-black text-blue-400 font-mono">p = {stats.pValue.toFixed(4)}</span>
                              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                                  {stats.skillCertainty.toFixed(2)}% {i18n.language.startsWith('de') ? 'Skill-Sicherheit' : 'Skill Certainty'}
                              </span>
                          </div>
                          
                          <div className="text-right">
                              <div className="text-xs font-bold text-white">{i18n.language.startsWith('de') ? 'Signifikanz-Schwelle:' : 'Significance Bound:'}</div>
                              <div className="text-xs text-red-400 font-mono">p &lt; 0.0500</div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {stats.totalSignals > 0 && (
          <div className="mb-8 bg-[#1a1d26] rounded-3xl border border-white/5 overflow-hidden shadow-2xl p-6">
              <h3 className="text-white font-black text-lg uppercase tracking-tighter mb-4 flex items-center gap-2">
                  <Swords size={18} className="text-tennis-lime" /> {
                    i18n.language.startsWith('de') 
                      ? 'Portfolio-Insights' 
                      : (i18n.language.startsWith('es') 
                        ? 'Insights de Portafolio' 
                        : (i18n.language.startsWith('fr') 
                          ? 'Analyses de Portefeuille' 
                          : (i18n.language.startsWith('it') 
                            ? 'Insight di Portafoglio' 
                            : 'Deep Portfolio Insights')))
                  }
              </h3>
              
              <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-3 md:grid md:grid-cols-3 md:gap-6 mb-6 -mx-6 px-6 md:mx-0 md:px-0">
                  <div className="shrink-0 w-[45vw] sm:w-[200px] md:w-auto snap-center bg-black/20 rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center text-center">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 flex items-center gap-1"><Calendar size={10}/> {i18n.language.startsWith('de') ? '10-Tage Verlauf' : '10-Day Run'}</span>
                      <span className={`text-2xl font-black ${stats.units10d >= 0 ? 'text-tennis-lime' : 'text-red-500'}`}>
                          {stats.units10d > 0 ? '+' : ''}{stats.units10d}u
                      </span>
                  </div>
                  <div className="shrink-0 w-[45vw] sm:w-[200px] md:w-auto snap-center bg-black/20 rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center text-center">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 flex items-center gap-1"><Calendar size={10}/> {i18n.language.startsWith('de') ? '30-Tage Verlauf' : '30-Day Run'}</span>
                      <span className={`text-2xl font-black ${stats.units30d >= 0 ? 'text-tennis-lime' : 'text-red-500'}`}>
                          {stats.units30d > 0 ? '+' : ''}{stats.units30d}u
                      </span>
                  </div>
                  <div className="shrink-0 w-[45vw] sm:w-[200px] md:w-auto snap-center bg-black/20 rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center text-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-tennis-lime/5 to-transparent pointer-events-none"></div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 flex items-center gap-1 relative z-10"><Target size={10}/> {i18n.language.startsWith('de') ? 'Gesamtzeit' : 'All-Time'}</span>
                      <span className={`text-2xl font-black ${stats.totalUnits >= 0 ? 'text-tennis-lime' : 'text-red-500'} relative z-10`}>
                          {stats.totalUnits > 0 ? '+' : ''}{stats.totalUnits}u
                      </span>
                  </div>
              </div>

              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-3">{
                i18n.language.startsWith('de') 
                  ? 'Modell-Effizienz nach Überzeugung (Einsatzhöhe)' 
                  : 'Model Efficiency by Conviction (Stake Size)'
              }</h4>
              <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-4 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-4 mb-6">
                  <MiniInsightCard 
                      title="Micro/Small (< 1.0U)" colorClass="text-blue-400"
                      value1={`${stats.brackets.fav.count > 0 ? '+' : ''}${(stats.brackets.fav.count > 0 ? stats.brackets.fav.clvSum / stats.brackets.fav.count : 0).toFixed(1)}%`} label1="AVG CLV"
                      value2={`${stats.brackets.fav.units > 0 ? '+' : ''}${stats.brackets.fav.units.toFixed(1)}u`} label2={`${stats.brackets.fav.count} Bets`}
                  />
                  <MiniInsightCard 
                      title="Core (1.0 - 1.4U)" colorClass="text-emerald-400"
                      value1={`${stats.brackets.core.count > 0 ? '+' : ''}${(stats.brackets.core.count > 0 ? stats.brackets.core.clvSum / stats.brackets.core.count : 0).toFixed(1)}%`} label1="AVG CLV"
                      value2={`${stats.brackets.core.units > 0 ? '+' : ''}${stats.brackets.core.units.toFixed(1)}u`} label2={`${stats.brackets.core.count} Bets`}
                  />
                  <MiniInsightCard 
                      title="High (1.5 - 2.4U)" colorClass="text-yellow-400"
                      value1={`${stats.brackets.dog.count > 0 ? '+' : ''}${(stats.brackets.dog.count > 0 ? stats.brackets.dog.clvSum / stats.brackets.dog.count : 0).toFixed(1)}%`} label1="AVG CLV"
                      value2={`${stats.brackets.dog.units > 0 ? '+' : ''}${stats.brackets.dog.units.toFixed(1)}u`} label2={`${stats.brackets.dog.count} Bets`}
                  />
                  <MiniInsightCard 
                      title="Max Bomb (2.5U+)" colorClass="text-purple-400"
                      value1={`${stats.brackets.long.count > 0 ? '+' : ''}${(stats.brackets.long.count > 0 ? stats.brackets.long.clvSum / stats.brackets.long.count : 0).toFixed(1)}%`} label1="AVG CLV"
                      value2={`${stats.brackets.long.units > 0 ? '+' : ''}${stats.brackets.long.units.toFixed(1)}u`} label2={`${stats.brackets.long.count} Bets`}
                  />
              </div>

              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-3">{
                i18n.language.startsWith('de') 
                  ? 'Modell-Effizienz nach Überzeugung (Einsatzhöhe)' 
                  : 'Model Efficiency by Conviction (Stake Size)'
              }</h4>
              <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-4 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-4">
                  <MiniInsightCard 
                      title="Micro/Small (< 1.0u)" colorClass="text-blue-400"
                      value1={`${stats.stakeBrackets.low.count > 0 ? '+' : ''}${(stats.stakeBrackets.low.count > 0 ? stats.stakeBrackets.low.clvSum / stats.stakeBrackets.low.count : 0).toFixed(1)}%`} label1="AVG CLV"
                      value2={`${stats.stakeBrackets.low.units > 0 ? '+' : ''}${stats.stakeBrackets.low.units.toFixed(1)}u`} label2={`${stats.stakeBrackets.low.count} Bets`}
                  />
                  <MiniInsightCard 
                      title="Core (1.0 - 1.9u)" colorClass="text-emerald-400"
                      value1={`${stats.stakeBrackets.med.count > 0 ? '+' : ''}${(stats.stakeBrackets.med.count > 0 ? stats.stakeBrackets.med.clvSum / stats.stakeBrackets.med.count : 0).toFixed(1)}%`} label1="AVG CLV"
                      value2={`${stats.stakeBrackets.med.units > 0 ? '+' : ''}${stats.stakeBrackets.med.units.toFixed(1)}u`} label2={`${stats.stakeBrackets.med.count} Bets`}
                  />
                  <MiniInsightCard 
                      title="High (2.0 - 2.9u)" colorClass="text-yellow-400"
                      value1={`${stats.stakeBrackets.high.count > 0 ? '+' : ''}${(stats.stakeBrackets.high.count > 0 ? stats.stakeBrackets.high.clvSum / stats.stakeBrackets.high.count : 0).toFixed(1)}%`} label1="AVG CLV"
                      value2={`${stats.stakeBrackets.high.units > 0 ? '+' : ''}${stats.stakeBrackets.high.units.toFixed(1)}u`} label2={`${stats.stakeBrackets.high.count} Bets`}
                  />
                  <MiniInsightCard 
                      title="Max Bomb (3.0u+)" colorClass="text-tennis-lime"
                      value1={`${stats.stakeBrackets.max.count > 0 ? '+' : ''}${(stats.stakeBrackets.max.count > 0 ? stats.stakeBrackets.max.clvSum / stats.stakeBrackets.max.count : 0).toFixed(1)}%`} label1="AVG CLV"
                      value2={`${stats.stakeBrackets.max.units > 0 ? '+' : ''}${stats.stakeBrackets.max.units.toFixed(1)}u`} label2={`${stats.stakeBrackets.max.count} Bets`}
                  />
              </div>
          </div>
      )}

      <div className="bg-[#1a1d26] rounded-3xl border border-white/5 overflow-hidden shadow-2xl mb-8 pt-6">
          <div className="px-6 mb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                  <h3 className="text-white font-black text-lg uppercase tracking-tighter">{
                    i18n.language.startsWith('de') 
                      ? 'Kontostand-Entwicklung' 
                      : (i18n.language.startsWith('es') 
                        ? 'Trayectoria de Bankroll' 
                        : (i18n.language.startsWith('fr') 
                          ? 'Trajectoire du Capital' 
                          : (i18n.language.startsWith('it') 
                            ? 'Traiettoria del Bankroll' 
                            : 'Bankroll Trajectory')))
                  }</h3>
                  <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-gray-500 font-medium">{
                        i18n.language.startsWith('de') 
                          ? 'Kumuliertes Unit-Wachstum' 
                          : (i18n.language.startsWith('es') 
                            ? 'Crecimiento acumulado de unidades' 
                            : (i18n.language.startsWith('fr') 
                              ? 'Croissance cumulative des unités' 
                              : (i18n.language.startsWith('it') 
                                ? 'Crescita cumulativa delle unità' 
                                : 'Cumulative Unit Growth')))
                      }</p>
                      <div className="flex items-center gap-1.5 bg-tennis-lime/10 px-2 py-0.5 rounded-md border border-tennis-lime/20">
                          <div className="w-1.5 h-1.5 rounded-full bg-tennis-lime shadow-[0_0_8px_#84cc16] animate-pulse"></div>
                          <span className="text-[8px] font-black text-tennis-lime uppercase tracking-widest">Model Alpha</span>
                      </div>
                  </div>
              </div>
              
              <div className="flex items-center bg-[#15171e] p-1 rounded-xl border border-white/5 w-full md:w-auto shadow-inner">
                  {['1W', '1M', '3M', 'ALL'].map(filter => (
                      <button
                          key={filter}
                          onClick={() => setChartFilter(filter as any)}
                          className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${chartFilter === filter ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                          {filter}
                      </button>
                  ))}
              </div>
          </div>
          
          <div className="h-[300px] w-full p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ccff00" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ccff00" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    stroke="#4b5563" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    minTickGap={30}
                  />
                  <YAxis 
                    stroke="#4b5563" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `${value > 0 ? '+' : ''}${value}u`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="#ffffff" strokeOpacity={0.2} strokeDasharray="3 3" />
                  <Area 
                    type="monotone" 
                    dataKey="units" 
                    stroke="#ccff00" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorUnits)" 
                    animationDuration={1000}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
          </div>
      </div>

      <div className="bg-[#1a1d26] rounded-3xl border border-white/5 overflow-hidden shadow-2xl flex flex-col min-h-[600px]">
        <div className="px-6 py-5 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center justify-between md:justify-start gap-4">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              <History size={16} className="text-gray-500" /> {t('performance.table.title')}
            </h3>
            <span className="text-[10px] font-mono text-gray-500">
              {i18n.language.startsWith('de') ? 'SEITE' : (i18n.language.startsWith('es') ? 'PÁGINA' : (i18n.language.startsWith('fr') ? 'PAGE' : (i18n.language.startsWith('it') ? 'PAGINA' : 'PAGE')))} {currentPage}/{totalPages || 1}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">


            {/* Markdown Export Button */}
            <button
              onClick={exportToMarkdown}
              disabled={processedBets.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 hover:border-tennis-lime/30 bg-white/[0.02] hover:bg-tennis-lime/10 text-gray-300 hover:text-tennis-lime transition-all duration-300 text-[9px] font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] shadow-lg border-white/5"
            >
              <Download size={12} className="text-gray-400 group-hover:text-tennis-lime" />
              <span>Export .MD</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto flex-grow">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 text-gray-500 text-[9px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                <th className="px-4 md:px-6 py-4">{t('performance.table.cols.date')}</th>
                <th className="px-4 md:px-6 py-4">{t('performance.table.cols.event')}</th>
                <th className="px-4 md:px-6 py-4 hidden md:table-cell">{t('performance.table.cols.selection')}</th>
                <th className="px-4 md:px-6 py-4 text-center hidden md:table-cell">{t('performance.table.cols.stake')}</th>
                <th className="px-4 md:px-6 py-4 text-center hidden md:table-cell">METRICS</th>
                <th className="px-4 md:px-6 py-4 text-right">{t('performance.table.cols.outcome')}</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-white/5">
              {currentTableData.map((match) => {
                const { pickName, type, entryOdds, closingOdds, clv, isWin, edge, stake, unitProfit } = match.calculated;
                
                const isMaxBomb = stake >= 3.0;
                const tagClasses = getLabelStyle(type, isMaxBomb);
                // SOTA FIX: Emojis sauber entfernen, damit das Badge absolut seriös aussieht
                const cleanType = type.replace(/(🔥|✨|🛡️|🔬|🛑|📈|❄️|💎|⚖️|💰|⚡)/g, '').trim();

                return (
                  <tr key={match.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-4 md:px-6 py-4 text-gray-500 font-mono text-[10px] md:text-xs whitespace-nowrap align-top md:align-middle">
                      {new Date(match.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </td>
                    
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-white font-bold text-xs md:text-sm mb-0.5">
                          {match.player1_name} <span className="text-gray-600 font-normal mx-1">vs</span> {match.player2_name}
                        </span>
                        
                        <div className="flex flex-col gap-1.5 mt-1.5 md:hidden">
                           <div className="flex items-center gap-2">
                               <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${tagClasses}`}>
                                 <span>{cleanType} {pickName.split(' ').pop()} @{entryOdds?.toFixed(2)}</span>
                               </span>
                               {stake > 0 && (
                                   <span className="text-[10px] font-mono text-tennis-lime bg-tennis-lime/10 px-1.5 py-0.5 rounded border border-tennis-lime/20">
                                       {stake.toFixed(1)}u
                                   </span>
                               )}
                           </div>

                           <div className="flex items-center gap-2 text-[10px] font-mono">
                                <span className={`font-bold ${edge > 5 ? 'text-tennis-lime' : 'text-blue-400'}`}>
                                    Edge: +{edge.toFixed(1)}%
                                </span>
                                {closingOdds > 0 && Math.abs(clv) > 0.5 && (
                                    <>
                                        <span className="text-gray-600">|</span>
                                        <span className={`font-bold ${clv > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            CLV {clv > 0 ? '+' : ''}{clv.toFixed(1)}%
                                        </span>
                                    </>
                                )}
                           </div>
                        </div>

                        <span className="text-[9px] md:text-[10px] text-gray-500 font-medium uppercase tracking-wider truncate max-w-[120px] md:max-w-[180px] hidden md:block">
                          {match.tournament}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 hidden md:table-cell align-middle">
                      <div className="flex flex-col gap-1">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm inline-flex items-center gap-1 w-max border ${tagClasses}`}>
                            <span>{cleanType}</span>
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-200">{pickName}</span>
                            <span className="text-[9px] font-mono text-gray-500">@{entryOdds.toFixed(2)}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center hidden md:table-cell align-middle">
                        <div className={`inline-flex items-center justify-center border px-2 py-1 rounded ${isMaxBomb ? 'bg-tennis-lime/20 border-tennis-lime/50 shadow-[0_0_10px_rgba(132,204,22,0.2)]' : 'bg-white/5 border-white/10'}`}>
                            <span className={`font-mono text-xs font-black ${isMaxBomb ? 'text-tennis-lime' : 'text-gray-300'}`}>{stake.toFixed(1)}u</span>
                        </div>
                    </td>

                    <td className="px-6 py-4 text-center hidden md:table-cell align-middle">
                        <div className="flex flex-col items-center">
                            <span className={`font-mono font-bold text-[11px] ${edge > 5 ? 'text-tennis-lime' : 'text-blue-400'}`}>
                                +{edge.toFixed(1)}% EDGE
                            </span>
                            {closingOdds > 0 && Math.abs(clv) > 0.5 && (
                                <span className={`text-[9px] font-bold mt-0.5 ${clv > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    CLV {clv > 0 ? '+' : ''}{clv.toFixed(1)}%
                                </span>
                            )}
                        </div>
                    </td>

                    <td className="px-4 md:px-6 py-4 text-right align-top md:align-middle">
                      <div className="flex flex-col items-end gap-1">
                        {isWin ? (
                          <>
                            <div className="inline-flex items-center gap-1 text-tennis-lime bg-tennis-lime/10 px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-black tracking-wide border border-tennis-lime/20 shadow-[0_0_10px_rgba(132,204,22,0.1)]">
                              +{unitProfit.toFixed(2)}u
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="inline-flex items-center gap-1 text-red-500 bg-red-500/10 px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-black tracking-wide border border-red-500/20">
                              {unitProfit.toFixed(2)}u
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {processedBets.length > 0 && (
            <div className="border-t border-white/5 p-4 bg-black/10 flex items-center justify-between">
                <button 
                    onClick={goToPrevPage}
                    disabled={currentPage === 1}
                    className="flex items-center gap-2 px-4 py-3 md:py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                >
                    <ChevronLeft size={16} />
                    <span className="hidden md:inline">{
                      i18n.language.startsWith('de') 
                        ? 'ZURÜCK' 
                        : (i18n.language.startsWith('es') 
                          ? 'ANTERIOR' 
                          : (i18n.language.startsWith('fr') 
                            ? 'PRÉCÉDENT' 
                            : (i18n.language.startsWith('it') 
                              ? 'PRECEDENTE' 
                              : 'PREV')))
                    }</span>
                </button>

                <div className="hidden md:flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                        let p = i + 1;
                        if (totalPages > 5 && currentPage > 3) {
                            p = currentPage - 2 + i;
                            if (p > totalPages) p = i + (totalPages - 4);
                        }
                        return (
                            <button
                                key={p}
                                onClick={() => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${
                                    currentPage === p 
                                    ? 'bg-tennis-lime text-black shadow-[0_0_10px_rgba(132,204,22,0.4)] scale-110' 
                                    : 'bg-white/5 text-gray-500 hover:bg-white/10'
                                }`}
                            >
                                {p}
                            </button>
                        )
                    })}
                </div>

                <button 
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-2 px-4 py-3 md:py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                >
                    <span className="hidden md:inline">{
                      i18n.language.startsWith('de') 
                        ? 'WEITER' 
                        : (i18n.language.startsWith('es') 
                          ? 'SIGUIENTE' 
                          : (i18n.language.startsWith('fr') 
                            ? 'SUIVANT' 
                            : (i18n.language.startsWith('it') 
                              ? 'SUCCESSIVO' 
                              : 'NEXT')))
                    }</span>
                    <ChevronRight size={16} />
                </button>
            </div>
        )}

        {processedBets.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-gray-600">
              <History size={32} />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">{t('performance.noData.title')}</h3>
            <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
              {t('performance.noData.message')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}