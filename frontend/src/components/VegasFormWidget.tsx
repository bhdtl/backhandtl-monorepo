import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeUpVariant } from './animationVariants';

interface MatchForm {
  id: string;
  opponent: string;
  isWin: boolean;
  date: string;
  tournament: string;
  score?: string;
  surface?: string;
  odds?: { myOdds: number; oppOdds: number };
}

interface VegasFormWidgetProps {
  playerName?: string;
  dbFormRating?: any;
  matches?: MatchForm[];
}

const getVegasVisuals = (rating: number) => {
  if (rating >= 9.5) return { bg: 'bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 animate-gradient-xy', text: 'text-white', label: 'MYTHICAL', glow: 'shadow-[0_0_20px_rgba(236,72,153,0.6)]' };
  if (rating >= 9.0) return { bg: 'bg-purple-900', text: 'text-white', label: 'GODLIKE', glow: 'shadow-[0_0_15px_rgba(128,0,128,0.5)]' };
  if (rating >= 8.5) return { bg: 'bg-blue-900', text: 'text-white', label: 'ELITE', glow: 'shadow-[0_0_15px_rgba(0,0,139,0.5)]' };
  if (rating >= 8.0) return { bg: 'bg-blue-700', text: 'text-white', label: 'COLD BLOODED', glow: 'shadow-[0_0_15px_rgba(0,0,255,0.4)]' };
  if (rating >= 7.5) return { bg: 'bg-emerald-900', text: 'text-white', label: 'PEAK', glow: 'shadow-[0_0_15px_rgba(0,100,0,0.4)]' };
  if (rating >= 7.0) return { bg: 'bg-emerald-700', text: 'text-white', label: 'SOLID', glow: 'shadow-[0_0_15px_rgba(0,128,0,0.4)]' };
  if (rating >= 6.0) return { bg: 'bg-yellow-500', text: 'text-black', label: 'AVERAGE', glow: 'shadow-[0_0_15px_rgba(255,255,0,0.3)]' };
  if (rating >= 5.0) return { bg: 'bg-red-600', text: 'text-white', label: 'STRUGGLING', glow: 'shadow-[0_0_15px_rgba(255,0,0,0.4)]' };
  return { bg: 'bg-red-900', text: 'text-white', label: 'DISASTER', glow: 'shadow-[0_0_15px_rgba(139,0,0,0.5)]' };
};

const parseScoreDetails = (scoreStr: string | null, playerWon: boolean): number => {
  if (!scoreStr || scoreStr.toLowerCase().includes('ret') || scoreStr.toLowerCase().includes('wo')) return 0.5;

  const matches = scoreStr.match(/(\d+)-(\d+)/g);
  if (!matches) return 0.5;

  let gamesWon = 0;
  let totalGames = 0;
  let setsLost = 0;
  let setsWon = 0;

  matches.forEach(m => {
    const parts = m.split('-');
    const l = parseInt(parts[0]);
    const r = parseInt(parts[1]);
    const pGames = playerWon ? l : r;
    const oGames = playerWon ? r : l;

    gamesWon += pGames;
    totalGames += (l + r);
    
    if (pGames < oGames) setsLost++;
    if (pGames > oGames) setsWon++;
  });

  if (totalGames === 0) return 0.5;

  let dominance = gamesWon / totalGames;
  if (playerWon && setsLost === 0) dominance += 0.10;
  if (!playerWon && setsWon > 0) dominance += 0.15;

  return Math.min(Math.max(dominance, 0.0), 1.0);
};

const calculateQuantumRating = (matchesList: MatchForm[], playerLastName: string) => {
  let currentRating = 6.5; 
  const historyLog: { res: 'W'|'L', odds: number, delta: number, tooltip: string }[] = [];
  const sortedMatches = [...matchesList].reverse();

  sortedMatches.forEach((m, idx) => {
    let odds = m.odds ? m.odds.myOdds : 1.01;
    if (odds <= 1.0) odds = 1.01;

    const won = m.isWin;
    const dominance = parseScoreDetails(m.score || null, won);
    let delta = 0.0;

    if (won) {
      if (odds < 1.20) delta = 0.1 + (dominance * 0.1);
      else if (odds <= 2.00) delta = 0.3 + (dominance * 0.2);
      else if (odds <= 3.00) delta = 0.8 + (dominance * 0.3);
      else {
        const logBoost = Math.log2(odds);
        delta = 1.0 + (logBoost * 0.3);
      }
    } else {
      if (odds < 1.20) delta = -1.5 - (1.0 - dominance);
      else if (odds <= 2.00) delta = -0.6 - (0.5 - dominance);
      else if (odds <= 3.00) {
        delta = -0.2;
      } else {
        if (dominance > 0.4) delta = +0.2; 
        else delta = 0.0;
      }
    }

    const weight = 0.5 + (idx * 0.2); 
    currentRating += (delta * weight);
    
    historyLog.push({
      res: won ? 'W' : 'L',
      odds: odds,
      delta: delta,
      tooltip: `${won ? 'WIN' : 'LOSS'} vs ${m.opponent} (@${odds})\nScore: ${m.score || 'N/A'}`
    });
  });

  const finalRating = Math.max(0.0, Math.min(10.0, currentRating));
  return { 
    rating: Number(finalRating.toFixed(1)), 
    history: historyLog.reverse()
  };
};

export const VegasFormWidget: React.FC<VegasFormWidgetProps> = ({ 
  playerName = '', 
  dbFormRating = null,
  matches = []
}) => {
  const [surfaceFilter, setSurfaceFilter] = useState<'all' | 'hard' | 'clay' | 'grass'>('all');
  const [resultFilter, setResultFilter] = useState<'all' | 'win' | 'loss'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const lastName = useMemo(() => {
    return (playerName || '').split(' ').pop() || playerName || '';
  }, [playerName]);

  const dbScore = useMemo(() => {
    if (!dbFormRating) return null;
    try {
      const parsed = typeof dbFormRating === 'string' ? JSON.parse(dbFormRating) : dbFormRating;
      return parsed && typeof parsed.score === 'number' ? parsed.score : null;
    } catch(e) {
      return null;
    }
  }, [dbFormRating]);

  // Extract top 5 market matches (with odds) for the Quantum Form Score calculation
  const marketMatchesOnly = useMemo(() => {
    return matches.filter(m => m.id.startsWith('market-')).slice(0, 5);
  }, [matches]);

  const stats = useMemo(() => {
    if (marketMatchesOnly.length > 0) {
      return calculateQuantumRating(marketMatchesOnly, lastName);
    }
    return { rating: 6.5, history: [] };
  }, [marketMatchesOnly, lastName]);

  // Apply filters and sorting to matches for the log list view
  const filteredMatches = useMemo(() => {
    let result = [...matches];

    // Apply surface filter
    if (surfaceFilter !== 'all') {
      result = result.filter(m => m.surface === surfaceFilter);
    }

    // Apply outcome filter
    if (resultFilter !== 'all') {
      const wantWin = resultFilter === 'win';
      result = result.filter(m => m.isWin === wantWin);
    }

    // Apply sorting
    result.sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [matches, surfaceFilter, resultFilter, sortOrder]);

  const { rating: calcRating, history } = stats || { rating: 6.5, history: [] };
  const displayRating = dbScore !== null ? Number(dbScore.toFixed(1)) : calcRating;
  const visuals = getVegasVisuals(displayRating);
  const trend = history.length >= 2 ? (history[0].delta > history[1].delta ? 'up' : 'down') : 'flat';

  const recentWins = matches.filter((m) => m.isWin).length;
  const recentLosses = matches.length - recentWins;

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={fadeUpVariant}
      className="space-y-6"
    >
      {/* Central Quantum Rating Card */}
      <div className="bg-[#151821]/80 backdrop-blur-md rounded-3xl p-6 border border-white/5 shadow-xl flex flex-col items-center justify-center text-center space-y-4">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">
          Quantum Form Engine
        </span>
        <div className="flex flex-col items-center gap-3">
          <div className={`relative w-24 h-24 ${visuals.bg} rounded-2xl ${visuals.glow} flex flex-col items-center justify-center border-[3px] border-[#0f1115] transform transition-all duration-300 hover:scale-105 overflow-hidden`}>
            {displayRating >= 9.5 && (
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-30 animate-shimmer" />
            )}
            <span className={`text-[10px] uppercase font-black ${visuals.text} opacity-90 tracking-tighter mb-[-2px]`}>
              FORM
            </span>
            <span className={`text-4xl font-black ${visuals.text} leading-none drop-shadow-md`}>
              {displayRating}
            </span>
            <div className="absolute top-1.5 right-1.5">
              {trend === 'up' && <TrendingUp size={14} className="text-white/80" />}
              {trend === 'down' && <TrendingDown size={14} className="text-white/80" />}
              {trend === 'flat' && <Minus size={14} className="text-white/80" />}
            </div>
          </div>
          <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full bg-black/60 border border-white/10 ${visuals.text} tracking-wider uppercase`}>
            {visuals.label}
          </div>
        </div>
      </div>

      {/* Form Dots & Summary Banner */}
      <div className="bg-[#151821]/80 border border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
            Recent Form (Last 5)
          </span>
          <div className="flex items-center space-x-2 mt-1">
            {marketMatchesOnly.length > 0 ? (
              marketMatchesOnly.map((m, idx) => (
                <div
                  key={idx}
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    m.isWin
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                  }`}
                >
                  {m.isWin ? 'W' : 'L'}
                </div>
              ))
            ) : (
              <span className="text-xs text-gray-400">No match records found.</span>
            )}
          </div>
        </div>
        <div className="text-center sm:text-right">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
            Overall Win / Loss Rate
          </span>
          <span className="text-2xl font-black text-white leading-none">
            {recentWins}W – {recentLosses}L
          </span>
        </div>
      </div>

      {/* Sofascore-style Filter & Sort Controls */}
      <div className="bg-[#151821]/80 border border-white/5 rounded-2xl p-4 space-y-3">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block text-left">
          Filter & Sort Matches
        </span>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Surface Filter */}
          <div className="flex bg-black/30 p-0.5 rounded-lg border border-white/5">
            {['all', 'hard', 'clay', 'grass'].map((surf) => (
              <button
                key={surf}
                onClick={() => setSurfaceFilter(surf as any)}
                className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-colors ${
                  surfaceFilter === surf ? 'bg-[#2a2d36] text-white border border-white/5 shadow-sm' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {surf}
              </button>
            ))}
          </div>

          {/* Outcome Filter */}
          <div className="flex bg-black/30 p-0.5 rounded-lg border border-white/5">
            {[
              { id: 'all', label: 'All' },
              { id: 'win', label: 'Wins' },
              { id: 'loss', label: 'Losses' }
            ].map((res) => (
              <button
                key={res.id}
                onClick={() => setResultFilter(res.id as any)}
                className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-colors ${
                  resultFilter === res.id ? 'bg-[#2a2d36] text-white border border-white/5 shadow-sm' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {res.label}
              </button>
            ))}
          </div>

          {/* Sorting */}
          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="ml-auto px-2.5 py-1 bg-black/30 hover:bg-[#2a2d36]/50 rounded-lg border border-white/5 text-[9px] font-black uppercase tracking-wider text-gray-400 hover:text-white transition-colors"
          >
            Sort: {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
          </button>
        </div>
      </div>

      {/* Vegas Match List */}
      <div className="space-y-3">
        <div className="flex justify-between items-center pl-2">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">
            Match Log & Betting Odds
          </h3>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider pr-2">
            Showing {filteredMatches.length} Matches
          </span>
        </div>

        {filteredMatches.length === 0 ? (
          <div className="bg-[#151821]/40 border border-white/5 rounded-2xl p-8 text-center text-gray-500 text-xs font-semibold">
            No matches found matching the selected filters.
          </div>
        ) : (
          filteredMatches.map((m) => {
            const oppLastName = (m.opponent || '').split(' ').pop() || 'Opponent';
            return (
              <div
                key={m.id}
                className="bg-[#151821]/60 border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-white/10 transition-colors shadow-md text-left"
              >
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-tennis-lime uppercase tracking-wider bg-tennis-lime/10 px-2 py-0.5 rounded-full border border-tennis-lime/10">
                    {m.tournament}
                  </span>
                  <h4 className="text-sm font-bold text-white flex items-center">
                    vs {m.opponent}
                  </h4>
                  <div className="flex items-center space-x-2 text-[10px] text-gray-500">
                    <span>{new Date(m.date).toLocaleDateString()}</span>
                    {m.score && <span>• Score: {m.score}</span>}
                  </div>
                </div>

                <div className="flex items-center space-x-4 self-end sm:self-center">
                  {m.odds && (
                    <div className="flex items-center space-x-2">
                      <div className="bg-[#242938] border border-white/5 px-3 py-1.5 rounded-xl text-center min-w-[70px]">
                        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider block truncate max-w-[65px]">
                          Quote {lastName}
                        </span>
                        <span className="text-xs font-black text-white">{m.odds.myOdds.toFixed(2)}</span>
                      </div>
                      <div className="bg-[#242938] border border-white/5 px-3 py-1.5 rounded-xl text-center min-w-[70px]">
                        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider block truncate max-w-[65px]">
                          Quote {oppLastName}
                        </span>
                        <span className="text-xs font-black text-white">{m.odds.oppOdds.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  <div
                    className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xl min-w-[60px] text-center ${
                      m.isWin
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {m.isWin ? 'Won' : 'Lost'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Interactive NEO.bet Betting Slip Placement */}
      <div className="bg-gradient-to-br from-[#1c1214]/60 to-[#0e1215]/80 p-5 rounded-2xl border border-rose-500/10 shadow-lg mt-6">
        <div className="flex justify-between items-start mb-3">
          <div className="space-y-0.5">
            <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider">
              Exclusive Partner Offer
            </span>
            <h4 className="text-sm font-black text-white uppercase tracking-wider">
              NEO.bet Live Betting Action
            </h4>
          </div>
          <span className="bg-rose-500 text-white font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full">
            Partnership
          </span>
        </div>
        <p className="text-[11px] text-gray-400 leading-normal mb-4">
          Open a bet directly inside NEO.bet for this player's next match. Lock in premium ATP/WTA 
          odds and leverage Backhand Tennis Line daily AI insights to maximize your edge.
        </p>
        <button
          onClick={() => window.open('https://neo.bet', '_blank')}
          className="w-full bg-[#fa1f4b] hover:bg-[#d91238] text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center space-x-1"
        >
          <span>Bet Live on NEO.bet</span>
          <ArrowUpRight size={14} />
        </button>
      </div>
    </motion.div>
  );
};

export default VegasFormWidget;
