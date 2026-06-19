import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, Swords } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeUpVariant } from './animationVariants';

interface VegasFormWidgetProps {
  playerName?: string;
  dbFormRating?: any;
}

interface MatchForm {
  id: string;
  opponent: string;
  isWin: boolean;
  date: string;
  tournament: string;
  score?: string;
  odds?: { myOdds: number; oppOdds: number };
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

const calculateQuantumRating = (matches: any[], playerName: string) => {
  let currentRating = 6.5; 
  const historyLog: { res: 'W'|'L', odds: number, delta: number, tooltip: string }[] = [];
  const sortedMatches = [...matches].reverse();

  sortedMatches.forEach((m, idx) => {
    const isP1 = m.player1_name.toLowerCase().includes(playerName.toLowerCase());
    let odds = isP1 ? m.odds1 : m.odds2;
    if (!odds || odds <= 1.0) odds = 1.01;

    const winner = m.actual_winner_name || "";
    const won = winner.toLowerCase().includes(playerName.toLowerCase());
    const dominance = parseScoreDetails(m.score, won);
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
        if (dominance > 0.45) delta = -0.2;
        else delta = -0.2;
      } else {
        if (dominance > 0.4) delta = +0.2; 
        else delta = 0.0;
      }
    }

    const weight = 0.5 + (idx * 0.2); 
    currentRating += (delta * weight);
    
    const opponent = isP1 ? m.player2_name : m.player1_name;
    historyLog.push({
      res: won ? 'W' : 'L',
      odds: odds,
      delta: delta,
      tooltip: `${won ? 'WIN' : 'LOSS'} vs ${opponent} (@${odds})\nScore: ${m.score || 'N/A'}`
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
  dbFormRating = null 
}) => {
  const [matches, setMatches] = useState<MatchForm[]>([]);
  const [stats, setStats] = useState<{ rating: number; history: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const lastName = useMemo(() => {
    return playerName.split(' ').pop()?.toLowerCase() || playerName.toLowerCase();
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

  useEffect(() => {
    if (playerName) {
      loadData();
    }
  }, [playerName]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch from market_odds for both Quantum calculation and logs
      const { data: marketData } = await supabase
        .from('market_odds')
        .select('player1_name, player2_name, odds1, odds2, actual_winner_name, score, tournament, created_at')
        .or(`player1_name.ilike.%${lastName}%,player2_name.ilike.%${lastName}%`)
        .not('actual_winner_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch from historical_matches
      const { data: historyData } = await supabase
        .from('historical_matches')
        .select('match_date, winner_name, loser_name, tourney_name, score, surface')
        .or(`winner_name.ilike.%${lastName}%,loser_name.ilike.%${lastName}%`)
        .order('match_date', { ascending: false })
        .limit(10);

      // Calculate Quantum rating using the 5 most recent market_odds matches
      if (marketData && marketData.length > 0) {
        const calculated = calculateQuantumRating(marketData.slice(0, 5), lastName);
        setStats(calculated);
      } else {
        setStats({ rating: 6.5, history: [] });
      }

      // Format combined matches for UI log list
      const parsed: MatchForm[] = [];
      const seen = new Set<string>();

      if (marketData) {
        marketData.forEach((m: any, idx) => {
          const isP1 = m.player1_name.toLowerCase().includes(lastName);
          const opponent = isP1 ? m.player2_name : m.player1_name;
          const isWin = m.actual_winner_name.toLowerCase().includes(lastName);
          const date = new Date(m.created_at).toISOString().split('T')[0];
          const key = `${date}-${opponent.toLowerCase()}`;

          if (!seen.has(key)) {
            seen.add(key);
            parsed.push({
              id: `market-${idx}`,
              opponent,
              isWin,
              date,
              tournament: m.tournament || 'ATP Event',
              score: m.score || undefined,
              odds: m.odds1 && m.odds2 ? {
                myOdds: isP1 ? parseFloat(m.odds1) : parseFloat(m.odds2),
                oppOdds: isP1 ? parseFloat(m.odds2) : parseFloat(m.odds1)
              } : undefined
            });
          }
        });
      }

      if (historyData) {
        historyData.forEach((h: any, idx) => {
          const isWinner = h.winner_name.toLowerCase().includes(lastName);
          const opponent = isWinner ? h.loser_name : h.winner_name;
          const key = `${h.match_date}-${opponent.toLowerCase()}`;

          if (!seen.has(key)) {
            seen.add(key);
            parsed.push({
              id: `hist-${idx}`,
              opponent,
              isWin: isWinner,
              date: h.match_date,
              score: h.score || undefined,
              tournament: h.tourney_name || 'ATP Match'
            });
          }
        });
      }

      // Sort combined matches by date
      parsed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMatches(parsed.slice(0, 5));
    } catch (e) {
      console.error('Error loading matches for Form:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-6 h-6 border-2 border-tennis-lime border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
            {matches.length > 0 ? (
              matches.map((m, idx) => (
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
            Win / Loss Rate
          </span>
          <span className="text-2xl font-black text-white leading-none">
            {recentWins}W – {recentLosses}L
          </span>
        </div>
      </div>

      {/* Vegas Match List */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider pl-2">
          Match Log & Betting Odds
        </h3>
        {matches.map((m) => (
          <div
            key={m.id}
            className="bg-[#151821]/60 border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-white/10 transition-colors shadow-md"
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
                  <div className="bg-[#242938] border border-white/5 px-3 py-1.5 rounded-xl text-center">
                    <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider block">Backhand</span>
                    <span className="text-xs font-black text-white">{m.odds.myOdds.toFixed(2)}</span>
                  </div>
                  <div className="bg-[#242938] border border-white/5 px-3 py-1.5 rounded-xl text-center">
                    <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider block">Opponent</span>
                    <span className="text-xs font-black text-white">{m.odds.oppOdds.toFixed(2)}</span>
                  </div>
                </div>
              )}
              <div
                className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xl ${
                  m.isWin
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {m.isWin ? 'Won' : 'Lost'}
              </div>
            </div>
          </div>
        ))}
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
