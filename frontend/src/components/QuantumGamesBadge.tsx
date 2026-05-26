import { useState } from 'react';
import { Cpu, ChevronDown, Crosshair, TrendingUp, AlertCircle, Activity } from 'lucide-react';
import { GamesPrediction } from '../types/tennis';

// CSS für die Animationen (Scoped)
const styles = `
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); max-height: 0; }
    to { opacity: 1; transform: translateY(0); max-height: 300px; }
  }
  @keyframes growBar {
    from { width: 0; }
    to { width: var(--target-width); }
  }
  .animate-slide-down {
    animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }
  .animate-grow {
    animation: growBar 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }
`;

export function QuantumGamesBadge({ prediction }: { prediction: GamesPrediction }) {
  const [isOpen, setIsOpen] = useState(false);

  // CRASH PROTECTION: Wenn keine Daten da sind, rendern wir nichts
  if (!prediction || !prediction.probabilities || !prediction.sim_details) return null;

  // 🚀 SOTA: Dynamic Line Parsing & Sorting
  const probEntries = Object.entries(prediction.probabilities)
    .filter(([k]) => k.startsWith('over_'))
    .map(([k, v]) => {
       const lineStr = k.replace('over_', '').replace('_', '.');
       return { 
           label: `Over ${lineStr}`, 
           val: v as number, 
           num: parseFloat(lineStr),
           fairOdds: 1 / (v as number)
       };
    })
    .sort((a, b) => a.num - b.num);

  const threshold = 0.58; // 58% is where we see solid edge
  let bestLineLabel = `~${prediction.median_games} Games`;
  let bestLineProb = 0;
  let isConfident = false;

  // Find the most aggressive line that still holds value (>58%)
  // We reverse the array to check the highest lines first.
  const bestEntry = [...probEntries].reverse().find(e => e.val >= threshold);
  
  if (bestEntry) {
      bestLineLabel = bestEntry.label;
      bestLineProb = bestEntry.val;
      isConfident = true;
  } else if (probEntries.length > 0) {
      // Fallback to the lowest line if nothing is confident
      bestLineLabel = probEntries[0].label;
      bestLineProb = probEntries[0].val;
  }

  // 🚀 REVOLUTIONÄR: "AI Game Script" Logik (Basierend auf Hold %)
  const p1Hold = prediction.sim_details.p1_est_hold_pct;
  const p2Hold = prediction.sim_details.p2_est_hold_pct;
  const avgHold = (p1Hold + p2Hold) / 2;
  
  let gameScript = "Balanced Baseline Battle";
  let scriptColor = "text-gray-400";
  
  if (avgHold > 82) {
      gameScript = "Serve Dominance (Tiebreak Alert 🚨)";
      scriptColor = "text-tennis-lime";
  } else if (avgHold < 74) {
      gameScript = "Return Heavy (Break Fest ⚔️)";
      scriptColor = "text-orange-400";
  }

  return (
    <div className="mt-3 mb-1 w-full">
      <style>{styles}</style>
      
      {/* --- TRIGGER BUTTON --- */}
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`group relative w-full rounded-xl p-0.5 transition-all duration-300 outline-none ${isOpen ? 'bg-white/5' : 'bg-transparent'}`}
      >
        <div className={`relative flex items-center bg-[#13151a] border rounded-[10px] p-2.5 z-10 transition-all shadow-lg w-full
            ${isConfident 
                ? 'border-tennis-lime/30 hover:border-tennis-lime/60 shadow-tennis-lime/5' 
                : 'border-white/10 hover:border-white/20'
            }`}
        >
          
          {/* ICON BOX */}
          <div className={`shrink-0 p-2 rounded-lg border transition-colors mr-2 md:mr-3
              ${isConfident 
                  ? 'bg-tennis-lime/10 border-tennis-lime/20 text-tennis-lime' 
                  : 'bg-[#1a1d26] border-white/5 text-gray-500'
              }`}>
            {isConfident ? <Crosshair size={16} className="md:w-[18px] md:h-[18px]" /> : <Cpu size={16} className="md:w-[18px] md:h-[18px]" />}
          </div>
          
          {/* MAIN CONTENT */}
          <div className="flex flex-col items-start min-w-0 flex-1">
            <span className="text-[8px] md:text-[9px] uppercase tracking-[0.1em] text-gray-500 font-bold mb-0.5 flex items-center gap-1.5 whitespace-nowrap">
              Dynamic Total Projection
              {isConfident && <span className="w-1.5 h-1.5 rounded-full bg-tennis-lime animate-pulse shrink-0"></span>}
            </span>
            
            <div className="flex items-center gap-2 w-full">
              <span className={`font-black font-mono leading-none tracking-tight truncate
                  ${isConfident ? 'text-base md:text-xl text-white' : 'text-sm md:text-base text-gray-400'}
              `}>
                {bestLineLabel}
              </span>
              
              {/* 🚀 SOTA APPLE-STYLE INLINE ODDS PILL (Fixes Mobile Squish) */}
              {isConfident && (
                  <div className="flex items-center gap-1.5 bg-tennis-lime/10 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md border border-tennis-lime/20 shrink-0">
                    <span className="text-[9px] md:text-[10px] font-mono text-tennis-lime font-bold">
                      {(bestLineProb * 100).toFixed(0)}%
                    </span>
                    <div className="w-px h-2 md:h-2.5 bg-tennis-lime/30"></div>
                    <span className="text-[9px] md:text-[10px] font-mono text-tennis-lime font-black">
                      @{(1 / bestLineProb).toFixed(2)}
                    </span>
                  </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE: CHEVRON ONLY (Saves space) */}
          <div className="ml-auto flex items-center pl-2 border-l border-white/5 shrink-0">
             <ChevronDown 
               size={16} 
               className={`text-gray-500 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-white' : ''}`} 
             />
          </div>
        </div>
      </button>

      {/* --- EXPANDABLE INTEL (PURE CSS ANIMATION) --- */}
      {isOpen && (
        <div className="overflow-hidden animate-slide-down">
            <div className="bg-[#0f1115] mx-1 border-x border-b border-white/5 rounded-b-xl p-3 space-y-4 shadow-inner relative mt-[-2px] pt-4">
              
              {/* REVOLUTIONARY: GAME SCRIPT */}
              <div className="bg-black/40 border border-white/5 rounded-lg p-2.5 flex flex-col gap-1 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                  <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest flex items-center gap-1">
                      <Activity size={10} /> Expected Game Script
                  </span>
                  <div className={`text-[11px] font-bold tracking-wide ${scriptColor}`}>
                      {gameScript}
                  </div>
              </div>

              {/* HOLD STRENGTH METRIC */}
              <div className="space-y-1.5">
                 <div className="flex justify-between items-end text-[9px] font-bold uppercase tracking-widest text-gray-500">
                    <span className="flex items-center gap-1"><TrendingUp size={10} /> Player Hold Probability</span>
                 </div>
                 
                 <div className="flex items-center gap-1 h-1.5 w-full">
                    {/* P1 BAR */}
                    <div className="h-full bg-white/5 rounded-l-sm flex-1 relative overflow-hidden">
                       <div 
                          className="absolute top-0 left-0 h-full bg-blue-500/80 animate-grow"
                          style={{ '--target-width': `${prediction.sim_details.p1_est_hold_pct}%` } as any}
                       />
                    </div>
                    {/* P2 BAR */}
                    <div className="h-full bg-white/5 rounded-r-sm flex-1 relative overflow-hidden">
                       <div 
                          className="absolute top-0 right-0 h-full bg-red-500/80 animate-grow"
                          style={{ '--target-width': `${prediction.sim_details.p2_est_hold_pct}%` } as any}
                       />
                    </div>
                 </div>
                 <div className="flex justify-between text-[9px] font-mono font-bold">
                    <span className="text-blue-400">P1: {prediction.sim_details.p1_est_hold_pct}%</span>
                    <span className="text-red-400">P2: {prediction.sim_details.p2_est_hold_pct}%</span>
                 </div>
              </div>

              {/* DYNAMIC PROBABILITY MATRIX */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                {probEntries.map((item, idx) => {
                  const isBestLine = item.val === bestLineProb && item.val >= threshold;
                  const isSafe = item.val >= 0.55;
                  
                  return (
                    <div key={item.label} className="relative group">
                      <div className="flex justify-between text-[10px] mb-1 items-center">
                        <span className={`font-bold tracking-wide ${isBestLine ? 'text-white' : 'text-gray-500'}`}>
                          {item.label}
                        </span>
                        
                        <div className="flex items-center gap-3">
                            <span className="text-[9px] text-gray-600 font-mono">
                                Fair: {item.fairOdds.toFixed(2)}
                            </span>
                            <span className={`font-mono ${isSafe ? 'text-tennis-lime' : 'text-gray-600'}`}>
                                {(item.val * 100).toFixed(1)}%
                            </span>
                        </div>
                      </div>
                      
                      {/* BAR */}
                      <div className="w-full h-1.5 bg-[#1a1d26] rounded-sm overflow-hidden border border-white/5">
                        <div 
                          className={`h-full relative animate-grow ${isSafe ? 'bg-tennis-lime' : 'bg-gray-700'}`}
                          style={{ 
                              '--target-width': `${item.val * 100}%`,
                              animationDelay: `${idx * 0.1}s`
                          } as any}
                        >
                           {isBestLine && <div className="absolute top-0 bottom-0 right-0 w-4 bg-white/40 blur-[4px]"></div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t border-white/5 mt-2">
                 <div className="text-[8px] text-gray-600 font-mono tracking-tighter flex items-center gap-1">
                    <AlertCircle size={8} /> 2,500 NEURAL SIMULATIONS
                 </div>
                 <div className="text-[8px] text-tennis-lime font-mono border border-tennis-lime/20 bg-tennis-lime/5 px-2 py-0.5 rounded">
                    MEDIAN PEAK: {prediction.median_games} GAMES
                 </div>
              </div>

            </div>
        </div>
      )}
    </div>
  );
}