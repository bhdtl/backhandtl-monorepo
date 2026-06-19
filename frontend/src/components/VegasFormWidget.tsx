import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, ArrowUpRight, Award, Plus, Swords } from 'lucide-react';
import { motion } from 'framer-motion';

interface VegasFormWidgetProps {
  playerName?: string;
}

interface MatchForm {
  id: string;
  opponent: string;
  isWin: boolean;
  date: string;
  tournament: string;
  odds?: { myOdds: number; oppOdds: number };
}

export const VegasFormWidget: React.FC<VegasFormWidgetProps> = ({ playerName = '' }) => {
  const [matches, setMatches] = useState<MatchForm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (playerName) {
      loadMatches();
    }
  }, [playerName]);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const lastName = playerName.split(' ').pop()?.toLowerCase() || playerName.toLowerCase();

      // Fetch from market_odds (has actual winner and odds)
      const { data: marketData } = await supabase
        .from('market_odds')
        .select('player1_name, player2_name, odds1, odds2, actual_winner_name, tournament, created_at')
        .or(`player1_name.ilike.%${lastName}%,player2_name.ilike.%${lastName}%`)
        .not('actual_winner_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch from historical_matches
      const { data: historyData } = await supabase
        .from('historical_matches')
        .select('match_date, winner_name, loser_name, tourney_name, surface')
        .or(`winner_name.ilike.%${lastName}%,loser_name.ilike.%${lastName}%`)
        .order('match_date', { ascending: false })
        .limit(10);

      const parsed: MatchForm[] = [];
      const seen = new Set<string>();

      // Process market data
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
              odds: m.odds1 && m.odds2 ? {
                myOdds: isP1 ? parseFloat(m.odds1) : parseFloat(m.odds2),
                oppOdds: isP1 ? parseFloat(m.odds2) : parseFloat(m.odds1)
              } : undefined
            });
          }
        });
      }

      // Process historical data
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

  // Calculate stats from loaded matches
  const recentWins = matches.filter((m) => m.isWin).length;
  const recentLosses = matches.length - recentWins;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
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
              <span className="text-[10px] text-gray-500 block">
                {new Date(m.date).toLocaleDateString()}
              </span>
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

