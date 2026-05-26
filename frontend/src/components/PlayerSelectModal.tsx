import React, { useState, useMemo } from 'react';
import { Search, X, Filter, Lock, Zap, ShieldAlert, ArrowDownUp } from 'lucide-react';
import { NeuralGameCard, GameCardPlayer } from './NeuralGameCard'; // Pfad anpassen
import { motion, AnimatePresence } from 'framer-motion';

interface PlayerSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (player: GameCardPlayer) => void;
  players: GameCardPlayer[];
  currentLineup: (GameCardPlayer | null)[];
  activeSlotIndex: number | null;
  budgetCap: number;
}

export function PlayerSelectModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  players, 
  currentLineup, 
  activeSlotIndex, 
  budgetCap 
}: PlayerSelectModalProps) {
  
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'ELITE' | 'PRO' | 'CHALLENGER' | 'PROSPECT'>('ALL');
  const [sortBy, setSortBy] = useState<'RATING_DESC' | 'RATING_ASC'>('RATING_DESC');

  // --- DYNAMIC BUDGET MATH ---
  // Wir müssen das Budget berechnen, OHNE den Spieler, der gerade ersetzt werden soll
  const { budgetUsed, eliteCount } = useMemo(() => {
    let used = 0;
    let elites = 0;
    currentLineup.forEach((p, idx) => {
      if (p && idx !== activeSlotIndex) {
        used += p.form_rating;
        if (p.form_rating >= 8.0) elites += 1;
      }
    });
    return { budgetUsed: used, eliteCount: elites };
  }, [currentLineup, activeSlotIndex]);

  const remainingBudget = budgetCap - budgetUsed;

  // --- FILTER & SORT ENGINE ---
  const filteredPlayers = useMemo(() => {
    return players
      .filter(p => {
        // Search Filter
        const matchesSearch = `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase());
        if (!matchesSearch) return false;

        // Tier Filter (Basierend auf 0-10 Rating)
        if (tierFilter === 'ELITE' && p.form_rating < 8.0) return false;
        if (tierFilter === 'PRO' && (p.form_rating < 7.0 || p.form_rating >= 8.0)) return false;
        if (tierFilter === 'CHALLENGER' && (p.form_rating < 6.0 || p.form_rating >= 7.0)) return false;
        if (tierFilter === 'PROSPECT' && p.form_rating >= 6.0) return false;

        // Bereits im Lineup? (Außer er ist im aktuellen Slot)
        const isAlreadyInOtherSlot = currentLineup.some((lineupPlayer, idx) => 
          lineupPlayer?.id === p.id && idx !== activeSlotIndex
        );
        if (isAlreadyInOtherSlot) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'RATING_DESC') return b.form_rating - a.form_rating;
        return a.form_rating - b.form_rating;
      });
  }, [players, search, tierFilter, sortBy, currentLineup, activeSlotIndex]);

  if (!isOpen || activeSlotIndex === null) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/90 backdrop-blur-xl" 
          onClick={onClose} 
        />
        
        {/* Modal Container */}
        <motion.div 
          initial={{ y: "100%", opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="relative bg-[#0a0c10] w-full md:max-w-6xl h-[90vh] md:h-[85vh] rounded-t-[2.5rem] md:rounded-[2.5rem] border-t md:border border-white/10 shadow-2xl flex flex-col overflow-hidden"
        >
          {/* HEADER SECTION */}
          <div className="bg-[#15171e] border-b border-white/5 p-4 md:p-6 shrink-0 z-20 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-white font-black uppercase tracking-widest text-lg md:text-xl flex items-center gap-2">
                  <Zap className="text-tennis-lime" size={20} /> Assign Asset
                </h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">
                  Remaining Budget: <span className="text-white">{remainingBudget.toFixed(1)}</span>
                </p>
              </div>
              <button onClick={onClose} className="p-3 bg-white/5 rounded-full hover:bg-red-500/20 hover:text-red-500 text-gray-400 transition-all border border-white/5">
                <X size={20} />
              </button>
            </div>

            {/* CONTROLS (Search & Filters) */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-tennis-lime transition-colors" size={18} />
                <input 
                  autoFocus 
                  type="text" 
                  placeholder="Search Neural Database..." 
                  className="w-full bg-black/40 text-white pl-12 pr-4 py-4 rounded-xl border border-white/10 outline-none focus:border-tennis-lime transition-all font-black text-sm uppercase tracking-wider"
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0 shrink-0">
                {['ALL', 'ELITE', 'PRO', 'CHALLENGER', 'PROSPECT'].map(tier => (
                  <button 
                    key={tier}
                    onClick={() => setTierFilter(tier as any)}
                    className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                      tierFilter === tier 
                        ? 'bg-tennis-lime text-black border-tennis-lime shadow-[0_0_15px_rgba(204,255,0,0.2)]' 
                        : 'bg-black/40 text-gray-500 border-white/10 hover:border-white/30 hover:text-white'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
                <button 
                  onClick={() => setSortBy(prev => prev === 'RATING_DESC' ? 'RATING_ASC' : 'RATING_DESC')}
                  className="px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-gray-400 hover:text-white transition-all flex items-center gap-2"
                >
                  <ArrowDownUp size={14} className={sortBy === 'RATING_DESC' ? 'text-tennis-lime' : ''} />
                </button>
              </div>
            </div>
          </div>

          {/* GRID SECTION */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0a0c10]">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {filteredPlayers.map(player => {
                // VALIDATION LOGIC FOR THIS SPECIFIC CARD
                const wouldExceedBudget = player.form_rating > remainingBudget;
                const wouldExceedEliteLimit = eliteCount >= 1 && player.form_rating >= 8.0;
                const isLocked = wouldExceedBudget || wouldExceedEliteLimit;

                let lockReason = "";
                if (wouldExceedBudget) lockReason = "Budget Exceeded";
                else if (wouldExceedEliteLimit) lockReason = "Max 1 Elite Asset";

                return (
                  <div key={player.id} className="relative group">
                    <div className={`transition-all duration-300 ${isLocked ? 'opacity-40 grayscale-[0.8] scale-95' : 'hover:scale-105'}`}>
                      {/* Wiederverwendung deiner Apple-Style Komponente */}
                      <NeuralGameCard 
                        player={player} 
                        onClick={() => {
                          if (!isLocked) {
                            onSelect(player);
                            onClose();
                          }
                        }}
                      />
                    </div>

                    {/* LOCK OVERLAY */}
                    {isLocked && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center z-30 cursor-not-allowed">
                        <div className="bg-red-500/10 backdrop-blur-md border border-red-500/50 rounded-2xl p-3 flex flex-col items-center shadow-2xl">
                          <Lock size={20} className="text-red-500 mb-1" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-red-100 text-center leading-tight max-w-[80px]">
                            {lockReason}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Empty State */}
            {filteredPlayers.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full opacity-50 mt-20">
                <ShieldAlert size={48} className="text-gray-600 mb-4" />
                <p className="text-sm font-black text-gray-500 uppercase tracking-widest">No assets match criteria</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}