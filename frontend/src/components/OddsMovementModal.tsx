import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import {
  X, Users, TrendingDown, TrendingUp, Loader2, Activity, LineChart, User
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, ReferenceDot
} from 'recharts';

// 🚀 SOTA: Import the new Match Center Widgets
import { StyleAnalysis } from './StyleAnalysis';
import { MarketOddsPerformance } from './MarketOddsPerformance';
import { BsiSpeedPerformance } from './BsiSpeedPerformance';

// --- TYPES ---
export interface RawMatchRow {
  id: string;
  player1_name?: string;
  player2_name?: string;
  odds1?: number;
  odds2?: number;
  opening_odds1?: number;
  opening_odds2?: number;
  playerA?: { last_name: string };
  playerB?: { last_name: string };
  marketOddsA?: number;
  marketOddsB?: number;
  betInfo?: { pickName: string };
}

interface NormalizedMatch {
  id: string;
  p1Name: string;
  p2Name: string;
  liveOdds1: number;
  liveOdds2: number;
  openOdds1: number | null;
  openOdds2: number | null;
  pickName: string | null;
  neobet_spreads?: any[];
  neobet_over_unders?: any[];
}

interface OddsHistoryRow {
  match_id: string;
  odds1: number;
  odds2: number;
  fair_odds1: number;
  fair_odds2: number;
  recorded_at: string;
  is_hunter_pick: boolean;
}

interface GraphPoint {
  timeLabel: string;
  fullDate: string;
  timestamp: number;
  odds: number;
  fairOdds: number;
  isExecutionPoint: boolean;
  isLiveNode?: boolean;
  isAnchor?: boolean; 
}

// --- UTILS ---
const isPlayer1Target = (pickName: string, p1Name: string) => {
    if (!pickName || !p1Name) return false;
    const pick = pickName.toLowerCase().trim();
    const p1 = p1Name.toLowerCase().trim();
    if (pick.includes(p1) || p1.includes(pick)) return true;
    
    // Clean punctuation from pick to make word matching robust
    const cleanPick = pick.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');
    const pickWords = cleanPick.split(/\s+/);
    
    const p1Words = p1.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ').split(/\s+/);
    const p1Last = p1Words[p1Words.length - 1];
    const p1First = p1Words[0];
    
    if (p1Last && p1Last.length >= 2 && pickWords.includes(p1Last)) return true;
    if (p1First && p1First.length >= 2 && pickWords.includes(p1First)) return true;
    
    return false;
};

const getClosingOddsForPlay = (pickName: string, match: any): number => {
    if (!pickName || !match) return 0;
    const pick = pickName.trim();
    const lowerPick = pick.toLowerCase();
    const p1 = match.player1_name || match.p1Name || "";
    
    // 1. OVER / UNDER GAMES
    if (lowerPick.includes("over") || lowerPick.includes("under")) {
        const boundaryMatch = pick.match(/[\d.]+/);
        if (!boundaryMatch) return 0;
        const boundary = parseFloat(boundaryMatch[0]);
        const ouList = match.neobet_over_unders;
        if (Array.isArray(ouList)) {
            const ouObj = ouList.find(ou => ou && Math.abs((parseFloat(ou.boundary) || 0) - boundary) < 0.01);
            if (ouObj) {
                if (lowerPick.includes("over")) {
                    return parseFloat(ouObj.over) || 0;
                } else if (lowerPick.includes("under")) {
                    return parseFloat(ouObj.under) || 0;
                }
            }
        }
        return 0;
    }
    
    // 2. HANDICAP GAMES
    else if (pick.match(/[+-]\s*\d+(?:\.\d+)?/)) {
        const signNumMatch = pick.match(/([+-]\s*\d+(?:\.\d+)?)/);
        if (!signNumMatch) return 0;
        const handicap = parseFloat(signNumMatch[1].replace(/\s+/g, ''));
        const isP1 = isPlayer1Target(pick, p1);
        const spList = match.neobet_spreads;
        if (Array.isArray(spList)) {
            const targetHandicap = isP1 ? handicap : -handicap;
            const spObj = spList.find(sp => sp && Math.abs((parseFloat(sp.handicap) || 0) - targetHandicap) < 0.01);
            if (spObj) {
                if (isP1) {
                    return parseFloat(spObj.odds1) || 0;
                } else {
                    return parseFloat(spObj.odds2) || 0;
                }
            }
        }
        return 0;
    }
    
    // 3. MONEYLINE / MATCH WINNER
    else {
        const isP1 = isPlayer1Target(pick, p1);
        return isP1 ? parseFloat(match.odds1 || match.liveOdds1) || 0 : parseFloat(match.odds2 || match.liveOdds2) || 0;
    }
};

const parseDateSafe = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const safeStr = dateStr.replace(' ', 'T'); 
  const d = new Date(safeStr);
  return isNaN(d.getTime()) ? new Date() : d;
};

const normalizeMatchData = (raw: any | null): NormalizedMatch | null => {
  if (!raw) return null;
  return {
      id: String(raw.id).trim(), 
      p1Name: raw.player1_name || raw.playerA?.last_name || 'Player 1',
      p2Name: raw.player2_name || raw.playerB?.last_name || 'Player 2',
      liveOdds1: Number(raw.odds1 ?? raw.marketOddsA ?? 0),
      liveOdds2: Number(raw.odds2 ?? raw.marketOddsB ?? 0),
      openOdds1: (raw.opening_odds1 && !isNaN(Number(raw.opening_odds1))) ? Number(raw.opening_odds1) : null,
      openOdds2: (raw.opening_odds2 && !isNaN(Number(raw.opening_odds2))) ? Number(raw.opening_odds2) : null,
      pickName: raw.betInfo?.pickName || null,
      neobet_spreads: raw.neobet_spreads || null,
      neobet_over_unders: raw.neobet_over_unders || null
  };
};

// --- COMPONENT: RESPONSIVE TIMEFRAME ---
const TimeFrameSelector = ({ active, onChange }: { active: string, onChange: (v: string) => void }) => {
  const options = [
      { label: '7H', value: '7h' },
      { label: '24H', value: '24h' },
      { label: '3D', value: '3d' },
      { label: 'ALL', value: 'all' },
  ];

  return (
      <div className="flex bg-zinc-900/90 backdrop-blur-md rounded-lg p-1 border border-white/5 shadow-2xl pointer-events-auto">
          {options.map((opt) => (
              <button
                  key={opt.value}
                  onClick={(e) => { e.stopPropagation(); onChange(opt.value); }}
                  className={`
                      relative px-2.5 py-1.5 text-[10px] font-black tracking-wider rounded-md transition-all duration-300
                      ${active === opt.value 
                          ? 'bg-zinc-700 text-white shadow-inner' 
                          : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}
                  `}
              >
                  {opt.label}
              </button>
          ))}
      </div>
  );
};

export function OddsMovementModal({ 
  match: rawMatch, 
  isOpen, 
  onClose 
}: { 
  match: any | null; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  // --- STATE ---
  const [rawHistory, setRawHistory] = useState<OddsHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 🚀 SOTA: Match Center Tab Navigation
  const [activeTab, setActiveTab] = useState<'ODDS' | 'P1' | 'P2'>('ODDS');

  const [viewMode, setViewMode] = useState<'PLAY' | 'A' | 'B'>('PLAY');
  const [timeFrame, setTimeFrame] = useState('24h'); 
  
  const [activePoint, setActivePoint] = useState<GraphPoint | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number>(0);

  const match = useMemo(() => normalizeMatchData(rawMatch), [rawMatch]);

  // --- INITIALIZE & FETCH ---
  useEffect(() => {
      if (!isOpen || !match) return;

      setDragY(0); 
      setIsDragging(false);
      setActivePoint(null);
      setRawHistory([]);
      setTimeFrame('24h');
      setActiveTab('ODDS'); // Reset to default tab

      if (match.pickName) {
          setViewMode('PLAY');
      } else {
          const pick = (match.pickName || '').toLowerCase().trim();
          const p2 = (match.p2Name || '').toLowerCase().trim();
          
          let isP2 = false;
          if (pick && p2) {
              if (pick.includes(p2) || p2.includes(pick)) {
                  isP2 = true;
              } else {
                  const cleanPick = pick.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');
                  const pickWords = cleanPick.split(/\s+/);
                  
                  const p2Words = p2.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ').split(/\s+/);
                  const p2Last = p2Words[p2Words.length - 1];
                  const p2First = p2Words[0];
                  
                  if (p2Last && p2Last.length >= 2 && pickWords.includes(p2Last)) isP2 = true;
                  else if (p2First && p2First.length >= 2 && pickWords.includes(p2First)) isP2 = true;
              }
          }
          
          if (isP2) {
              setViewMode('B');
          } else {
              setViewMode('A');
          }
      }

      const fetchHistory = async () => {
          if (!match?.id) {
              console.warn("Invalid Match ID");
              return;
          }

          setLoading(true);
          try {
              const { data, error } = await supabase
                  .from('odds_history')
                  .select('*')
                  .eq('match_id', match.id) 
                  .order('recorded_at', { ascending: true });

              if (error) throw error;
              setRawHistory(data || []);
          } catch (err: any) {
              console.error("❌ [OddsModal] FATAL:", err);
          } finally {
              setLoading(false);
          }
      };

      fetchHistory();
  }, [isOpen, match?.id]);

  // Desktop ESC & Body Scroll Lock
  useEffect(() => {
      if (isOpen) {
          document.body.style.overflow = 'hidden';
      } else {
          document.body.style.overflow = 'unset';
      }

      const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
      window.addEventListener('keydown', handleEsc);

      return () => {
          window.removeEventListener('keydown', handleEsc);
          document.body.style.overflow = 'unset';
      };
  }, [isOpen, onClose]);

  // --- CORE LOGIC FOR CHART ---
  const { 
      graphData, currentOdds, entryOdds, playerColor, yDomain
  } = useMemo(() => {
      const safeDefault = { 
          graphData: [], currentOdds: 0, entryOdds: 0, 
          playerColor: '#888', playerName: '', isPositiveTrend: false, yDomain: [0, 1], percentChange: 0 
      };

      if (!match) return safeDefault;

      const isPlayMode = viewMode === 'PLAY';
      const isViewA = viewMode === 'A';
      
      const isP1Target = match.pickName ? isPlayer1Target(match.pickName, match.p1Name) : true;
      const baseIsP1 = isPlayMode ? isP1Target : isViewA;
      
      const rawName = isViewA ? match.p1Name : match.p2Name;
      let playerName = isPlayMode 
          ? (match.pickName || 'Played Line') 
          : (rawName || (isViewA ? 'Player 1' : 'Player 2'));
      
      let liveVal = baseIsP1 ? match.liveOdds1 : match.liveOdds2;
      let openVal = baseIsP1 ? match.openOdds1 : match.openOdds2;

      let plOpen = match.pickName ? (rawMatch?.betInfo?.marketOdds || rawMatch?.betInfo?.fairOdds || 0) : 0;
      let plLive = match.pickName ? getClosingOddsForPlay(match.pickName, rawMatch) : 0;

      if (rawHistory.length > 0) {
          const lastRow = rawHistory[rawHistory.length - 1];
          liveVal = baseIsP1 ? (lastRow.odds1 || liveVal) : (lastRow.odds2 || liveVal);
          if (!openVal) {
              const firstRow = rawHistory[0];
              openVal = baseIsP1 ? firstRow.odds1 : firstRow.odds2;
          }
      }

      // played line odds fallbacks
      if (isPlayMode) {
          plLive = plLive || plOpen || liveVal;
          plOpen = plOpen || plLive || openVal;
      }

      const finalLive = isPlayMode 
          ? plLive 
          : ((Number(liveVal) && !isNaN(Number(liveVal))) ? Number(liveVal) : 0);
      const finalOpen = isPlayMode 
          ? plOpen 
          : ((Number(openVal) && !isNaN(Number(openVal))) ? Number(openVal) : finalLive);

      // --- SCALING HELPERS ---
      let mlFirst: number = Number(openVal) || 1;
      let mlLast: number = Number(liveVal) || 1;
      if (rawHistory.length > 0) {
          const firstRow = rawHistory[0];
          const lastRow = rawHistory[rawHistory.length - 1];
          mlFirst = Number(baseIsP1 ? firstRow.odds1 : firstRow.odds2) || 1;
          mlLast = Number(baseIsP1 ? lastRow.odds1 : lastRow.odds2) || 1;
      }

      const scaleOdds = (mlVal: number) => {
          if (!isPlayMode) return mlVal;
          if (Math.abs(mlLast - mlFirst) < 0.005) {
              return plOpen;
          }
          const progress = (mlVal - mlFirst) / (mlLast - mlFirst);
          const scaled = plOpen + progress * (plLive - plOpen);
          return Math.max(1.01, scaled);
      };

      const scaleFairOdds = (mlFairVal: number) => {
          if (!isPlayMode) return mlFairVal;
          if (Math.abs(mlLast - mlFirst) < 0.005) {
              return rawMatch?.betInfo?.fairOdds || mlFairVal;
          }
          const progress = (mlFairVal - mlFirst) / (mlLast - mlFirst);
          const plFairOpen = rawMatch?.betInfo?.fairOdds || plOpen;
          const scaled = plFairOpen + progress * (plLive - plOpen);
          return Math.max(1.01, scaled);
      };

      // --- SANITIZER & FILTER ---
      let allPoints: GraphPoint[] = [];
      
      if (rawHistory.length > 0) {
          rawHistory.forEach((row) => {
              const date = parseDateSafe(row.recorded_at);
              const val = Number(baseIsP1 ? row.odds1 : row.odds2);
              
              if (val < 1.01 || val > 100) return; 

              // Spike Filter
              if (allPoints.length > 0) {
                  const prev = allPoints[allPoints.length - 1];
                  const dropRatio = val / prev.odds;
                  const spikeRatio = prev.odds / val;
                  if (dropRatio < 0.6 && val < 1.20) return; 
                  if (spikeRatio < 0.3) return;
              }

              const scaledVal = scaleOdds(val);
              const rawFair = baseIsP1 ? row.fair_odds1 : row.fair_odds2;
              const scaledFair = scaleFairOdds(rawFair);

              allPoints.push({
                  timeLabel: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  fullDate: row.recorded_at,
                  timestamp: date.getTime(),
                  odds: scaledVal,
                  fairOdds: scaledFair,
                  isExecutionPoint: row.is_hunter_pick, 
                  isLiveNode: false,
                  isAnchor: false
              });
          });
      }

      const now = new Date();
      const nowTs = now.getTime();
      let cutoffTs = 0;

      if (timeFrame === '7h') cutoffTs = nowTs - (7 * 60 * 60 * 1000);
      else if (timeFrame === '24h') cutoffTs = nowTs - (24 * 60 * 60 * 1000);
      else if (timeFrame === '3d') cutoffTs = nowTs - (3 * 24 * 60 * 60 * 1000);
      else cutoffTs = 0; // ALL

      let filteredPoints = allPoints.filter(p => p.timestamp >= cutoffTs);

      const hasPoints = filteredPoints.length > 0;
      if (!hasPoints || (hasPoints && Math.abs(filteredPoints[0].odds - finalOpen) > 0.001 && timeFrame === 'all')) {
          const startTs = hasPoints ? filteredPoints[0].timestamp : (nowTs - 3600000);
          filteredPoints.unshift({
              timeLabel: 'Open',
              fullDate: new Date(startTs).toISOString(),
              timestamp: startTs - 3600000, 
              odds: finalOpen,
              fairOdds: 0, isExecutionPoint: false, isLiveNode: false, isAnchor: true
          });
      }

      const lastP = filteredPoints[filteredPoints.length - 1];
      if (!lastP || (Math.abs(lastP.odds - finalLive) > 0.001 && !lastP.isAnchor)) {
           filteredPoints.push({
              timeLabel: 'Now',
              fullDate: now.toISOString(),
              timestamp: nowTs,
              odds: finalLive,
              fairOdds: 0, isExecutionPoint: false, isLiveNode: true, isAnchor: true
          });
      }

      filteredPoints.sort((a, b) => a.timestamp - b.timestamp);
      
      const validOdds = filteredPoints.map(p => p.odds).filter(o => o > 1.0);
      let min = validOdds.length ? Math.min(...validOdds) : 1.0;
      let max = validOdds.length ? Math.max(...validOdds) : 2.0;

      const range = max - min;
      if (range < 0.10) {
          const center = (min + max) / 2;
          min = center - 0.15; max = center + 0.15;
      } else {
          const padding = range * 0.25; 
          min -= padding; max += padding;
      }

      const yDomain = [Math.max(1.01, min), max];

      const startPointOdds = filteredPoints.length > 0 ? filteredPoints[0].odds : finalOpen;
      const currentChange = startPointOdds > 0 ? ((finalLive - startPointOdds) / startPointOdds) * 100 : 0;
      
      const trendIsPositive = finalLive <= startPointOdds;
      const playerColor = trendIsPositive ? '#34d399' : '#f43f5e'; 

      return { 
          graphData: filteredPoints, currentOdds: finalLive, entryOdds: finalOpen, 
          playerColor, playerName, isPositiveTrend: trendIsPositive, yDomain, percentChange: currentChange
      };

  }, [match, rawHistory, viewMode, timeFrame, rawMatch]);

  const handleMouseMove = useCallback((state: any) => {
      if (state.activePayload && state.activePayload.length > 0) {
          setActivePoint(state.activePayload[0].payload);
      }
  }, []);

  const handleMouseLeave = useCallback(() => {
      setActivePoint(null);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
      setIsDragging(true);
      startY.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
      if (!isDragging) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0) setDragY(delta * 0.65);
  };
  const handleTouchEnd = () => {
      setIsDragging(false);
      if (dragY > 150) onClose(); else setDragY(0);
  };

  const displayOdds = activePoint ? activePoint.odds : currentOdds;
  const isHovering = !!activePoint;
  const startOdds = graphData.length > 0 ? graphData[0].odds : entryOdds;
  const activePercent = startOdds > 0 ? ((displayOdds - startOdds) / startOdds) * 100 : 0;
  const isGoodChange = activePercent <= 0;
  const formattedPercent = Math.abs(activePercent).toFixed(2);

  if (!isOpen || !match) return null;

  const modalContent = (
      <div
          className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center animate-in fade-in duration-300"
          role="dialog"
          aria-modal="true"
          aria-labelledby="odds-modal-title"
          style={{ pointerEvents: 'auto' }}
      >

          <div
              className="absolute inset-0 bg-black/90 backdrop-blur-xl cursor-pointer"
              onClick={onClose}
              style={{ opacity: Math.max(0, 1 - (dragY / 500)), pointerEvents: 'auto' }}
              aria-hidden="true"
          ></div>

          <div
              className={`
                  relative bg-black w-full
                  md:w-[600px] md:max-w-2xl md:rounded-[2.5rem] md:border md:border-zinc-800
                  h-[93dvh] md:h-[700px]
                  rounded-t-[2.5rem]
                  overflow-hidden flex flex-col
                  shadow-[0_0_80px_-20px_rgba(255,255,255,0.05)]
                  animate-in slide-in-from-bottom-8 md:zoom-in-95 duration-500
                  ${!isDragging ? 'transition-transform cubic-bezier(0.16, 1, 0.3, 1)' : ''}
              `}
              style={{ transform: `translateY(${dragY}px)` }}
              onClick={(e) => e.stopPropagation()}
          >
              
              {/* --- UNIVERSAL HEADER --- */}
              <div className="relative shrink-0 pt-8 px-6 md:px-8 pb-4 z-20 border-b border-zinc-900 bg-black">

                  <div
                      className="md:hidden absolute top-3 left-0 right-0 flex justify-center cursor-grab touch-none py-4"
                      onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
                  >
                      <div className="w-12 h-1.5 bg-zinc-800 rounded-full active:bg-zinc-700 transition-colors"></div>
                  </div>

                  {/* Top Bar: Title & Close Button */}
                  <div className="flex justify-between items-center mb-4 mt-2">
                      <div className="flex items-center gap-2">
                          <Users size={14} className="text-zinc-500" />
                          <span className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] truncate max-w-[250px]">
                              {match.p1Name} <span className="text-zinc-700 mx-1">vs</span> {match.p2Name}
                          </span>
                          {loading && <Loader2 size={10} className="animate-spin text-zinc-600"/>}
                      </div>
                      
                      <button 
                          onClick={onClose} 
                          className="shrink-0 p-2 bg-zinc-900/80 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border border-white/5 backdrop-blur-md -mr-2 md:mr-0"
                      >
                          <X size={16} />
                      </button>
                  </div>

                  {/* 🚀 SOTA: MATCH CENTER TABS */}
                  <div className="flex bg-zinc-900/50 p-1 rounded-xl overflow-x-auto no-scrollbar">
                      <button 
                          onClick={() => setActiveTab('ODDS')}
                          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all
                          ${activeTab === 'ODDS' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                          <LineChart size={12} className={activeTab === 'ODDS' ? 'text-tennis-lime' : ''} />
                          Line Movement
                      </button>
                      <button 
                          onClick={() => setActiveTab('P1')}
                          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all truncate
                          ${activeTab === 'P1' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                          <User size={12} className={activeTab === 'P1' ? 'text-blue-400' : ''} />
                          <span className="truncate">{match.p1Name.split(' ').pop()}</span>
                      </button>
                      <button 
                          onClick={() => setActiveTab('P2')}
                          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all truncate
                          ${activeTab === 'P2' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                          <User size={12} className={activeTab === 'P2' ? 'text-purple-400' : ''} />
                          <span className="truncate">{match.p2Name.split(' ').pop()}</span>
                      </button>
                  </div>
              </div>

              {/* --- DYNAMIC BODY --- */}
              <div className="flex-1 w-full relative overflow-y-auto overflow-x-hidden no-scrollbar bg-black">
                  
                  {/* TAB 1: LINE MOVEMENT (The Original Modal Body) */}
                  {activeTab === 'ODDS' && (
                      <div className="flex flex-col h-full w-full">
                          
                          {/* Big Numbers Header */}
                          <div className="px-6 md:px-8 pt-4 pb-2 shrink-0">
                              <span 
                                  className="text-[3.5rem] md:text-[5rem] font-black tracking-tighter tabular-nums leading-[0.9] text-white transition-colors duration-150 block"
                                  style={{ textShadow: `0 0 40px ${playerColor}30` }}
                              >
                                  {displayOdds.toFixed(2)}
                              </span>
                              
                              <div className="flex items-center gap-3 mt-4">
                                  <div className={`
                                      flex items-center px-2.5 py-1 rounded-md text-[11px] font-black tabular-nums tracking-wide
                                      ${isGoodChange 
                                          ? 'bg-emerald-500/10 text-emerald-400' 
                                          : 'bg-rose-500/10 text-rose-400'}
                                  `}>
                                      {isGoodChange ? <TrendingDown size={14} className="mr-1.5" strokeWidth={3}/> : <TrendingUp size={14} className="mr-1.5" strokeWidth={3}/>}
                                      {formattedPercent}%
                                  </div>
                                  <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-widest">
                                      {isHovering ? 'Active' : 'Period'}
                                  </span>
                              </div>
                          </div>

                          {/* Chart Area */}
                          <div className="flex-1 w-full relative min-h-[250px] touch-none z-10 px-2 mt-2">
                              <div className="absolute top-0 right-6 z-20">
                                  <TimeFrameSelector active={timeFrame} onChange={setTimeFrame} />
                              </div>

                              {graphData.length > 0 ? (
                                  <ResponsiveContainer width="100%" height="100%" debounce={50}>
                                      <AreaChart 
                                          data={graphData} 
                                          onMouseMove={handleMouseMove}
                                          onMouseLeave={handleMouseLeave}
                                          margin={{ top: 20, right: 10, left: 10, bottom: 0 }}
                                      >
                                          <defs>
                                              <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
                                                  <stop offset="0%" stopColor={playerColor} stopOpacity={0.4}/>
                                                  <stop offset="90%" stopColor={playerColor} stopOpacity={0}/>
                                              </linearGradient>
                                              
                                              <filter id="neonGlow" height="300%" width="300%" x="-100%" y="-100%">
                                                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                                                  <feMerge>
                                                      <feMergeNode in="coloredBlur" />
                                                      <feMergeNode in="SourceGraphic" />
                                                  </feMerge>
                                              </filter>
                                          </defs>

                                          <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} hide />
                                          <YAxis domain={yDomain as any} type="number" hide />
                                          
                                          <Tooltip content={<></>} isAnimationActive={false} />

                                          {entryOdds > 0 && (
                                              <ReferenceLine 
                                                  y={entryOdds} 
                                                  stroke="#ffffff" 
                                                  strokeOpacity={0.1}
                                                  strokeDasharray="4 4" 
                                                  strokeWidth={1} 
                                              />
                                          )}

                                          <Area 
                                              type="monotone" 
                                              dataKey="odds" 
                                              stroke={playerColor} 
                                              strokeWidth={4} 
                                              strokeLinecap="round"
                                              fill="url(#fillGradient)" 
                                              filter="url(#neonGlow)" 
                                              isAnimationActive={true} 
                                              animationDuration={1000} 
                                              connectNulls
                                          />
                                          
                                          {activePoint && (
                                              <>
                                                  <ReferenceLine 
                                                      x={activePoint.timestamp} 
                                                      stroke="white" 
                                                      strokeOpacity={0.2} 
                                                      strokeDasharray="2 2"
                                                      strokeWidth={1}
                                                  />
                                                  <ReferenceDot 
                                                      x={activePoint.timestamp} 
                                                      y={activePoint.odds} 
                                                      r={6} 
                                                      fill="#fff" 
                                                      stroke={playerColor}
                                                      strokeWidth={3}
                                                      isFront={true}
                                                  />
                                              </>
                                          )}

                                      </AreaChart>
                                  </ResponsiveContainer>
                              ) : (
                                  !loading && (
                                      <div className="flex flex-col items-center justify-center h-full text-zinc-800">
                                          <Activity size={40} className="mb-4 opacity-20 animate-pulse"/>
                                          <span className="text-[10px] uppercase font-black tracking-[0.3em] opacity-30">No Data Available</span>
                                      </div>
                                  )
                              )}
                          </div>
                                                  {/* Footer Segmented Control for Chart */}
                           <div className="p-6 pb-10 shrink-0">
                               <div className="flex p-1 bg-zinc-900 rounded-xl relative overflow-hidden border border-zinc-800">
                                   <div 
                                       className="absolute top-1 bottom-1 bg-zinc-800 rounded-lg shadow-md transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
                                       style={{ 
                                           width: match.pickName ? 'calc(33.33% - 4px)' : 'calc(50% - 4px)',
                                           transform: match.pickName 
                                               ? `translateX(${viewMode === 'PLAY' ? '4px' : viewMode === 'A' ? 'calc(100% + 4px)' : 'calc(200% + 4px)'})` 
                                               : `translateX(${viewMode === 'A' ? '4px' : 'calc(100% + 4px)'})`
                                       }}
                                   >
                                       <div className="absolute inset-0 bg-white/5 rounded-lg"></div>
                                   </div>
                                   
                                   {match.pickName && (
                                       <button 
                                           onClick={() => setViewMode('PLAY')}
                                           className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest text-center relative z-10 transition-colors duration-200 truncate px-2
                                           ${viewMode === 'PLAY' ? 'text-white' : 'text-zinc-600 hover:text-zinc-500'}`}
                                       >
                                           {match.pickName}
                                       </button>
                                   )}
                                   
                                   <button 
                                       onClick={() => setViewMode('A')}
                                       className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest text-center relative z-10 transition-colors duration-200 truncate px-2
                                       ${viewMode === 'A' ? 'text-white' : 'text-zinc-600 hover:text-zinc-500'}`}
                                   >
                                       {match.p1Name}
                                   </button>
                                   
                                   <button 
                                       onClick={() => setViewMode('B')}
                                       className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest text-center relative z-10 transition-colors duration-200 truncate px-2
                                       ${viewMode === 'B' ? 'text-white' : 'text-zinc-600 hover:text-zinc-500'}`}
                                   >
                                       {match.p2Name}
                                   </button>
                               </div>
                           </div>
                      </div>
                  )}

                  {/* TAB 2: PLAYER 1 PROFILE */}
                  {activeTab === 'P1' && (
                      <div className="p-4 md:p-6 pb-12 flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                          <MarketOddsPerformance playerName={match.p1Name} />
                          <BsiSpeedPerformance playerName={match.p1Name} />
                          <StyleAnalysis playerName={match.p1Name} />
                      </div>
                  )}

                  {/* TAB 3: PLAYER 2 PROFILE */}
                  {activeTab === 'P2' && (
                      <div className="p-4 md:p-6 pb-12 flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                          <MarketOddsPerformance playerName={match.p2Name} />
                          <BsiSpeedPerformance playerName={match.p2Name} />
                          <StyleAnalysis playerName={match.p2Name} />
                      </div>
                  )}

              </div>
          </div>
      </div>
  );

  return createPortal(modalContent, document.body);
}