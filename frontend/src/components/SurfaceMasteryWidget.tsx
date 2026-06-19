import React, { useMemo } from 'react';
import { Trophy, Flame, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface SurfaceMasteryWidgetProps {
  surfacePreference?: string;
  surfaceRatings?: any;
  eloMetrics?: any;
}

export const SurfaceMasteryWidget: React.FC<SurfaceMasteryWidgetProps> = ({
  surfacePreference = 'All Court',
  surfaceRatings = null,
  eloMetrics = null,
}) => {
  const normPref = (surfacePreference || '').toLowerCase().trim();

  const parsedElo = useMemo(() => {
    if (!eloMetrics) return null;
    try {
      return typeof eloMetrics === 'string' ? JSON.parse(eloMetrics) : eloMetrics;
    } catch (e) {
      return null;
    }
  }, [eloMetrics]);

  const parsedRatings = useMemo(() => {
    if (!surfaceRatings) return {};
    try {
      return typeof surfaceRatings === 'string' ? JSON.parse(surfaceRatings) : surfaceRatings;
    } catch (e) {
      return {};
    }
  }, [surfaceRatings]);

  const getRatingColorClass = (rating: number) => {
    if (rating >= 8.5) return 'text-purple-400 border-purple-500/30 bg-purple-500/5 shadow-[0_0_15px_rgba(168,85,247,0.2)]';
    if (rating >= 7.0) return 'text-sky-400 border-sky-500/30 bg-sky-500/5 shadow-[0_0_15px_rgba(14,165,233,0.2)]';
    if (rating >= 5.5) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_10px_rgba(16,185,129,0.15)]';
    if (rating >= 4.0) return 'text-amber-400 border-amber-500/30 bg-amber-500/5';
    return 'text-rose-500 border-rose-500/30 bg-rose-500/5 shadow-[0_0_10px_rgba(244,63,94,0.15)]';
  };

  const surfaces = [
    { key: 'hard', label: 'HARD COURT', baseColor: 'from-blue-600 to-cyan-400', surfaceName: 'hard' },
    { key: 'grass', label: 'GRASS', baseColor: 'from-green-600 to-emerald-400', surfaceName: 'grass' },
    { key: 'clay', label: 'RED CLAY', baseColor: 'from-orange-600 to-red-500', surfaceName: 'clay' }
  ];

  return (
    <div className="space-y-6">
      {/* Primary Preference Banner */}
      <div className="bg-[#151821]/80 backdrop-blur-md p-5 rounded-2xl border border-white/5 flex items-center justify-between shadow-lg">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
            Preferred Surface
          </span>
          <h3 className="text-lg font-black text-white uppercase tracking-wider">
            {surfacePreference} Specialist
          </h3>
        </div>
        <div className="bg-tennis-lime/10 text-tennis-lime border border-tennis-lime/20 p-3 rounded-2xl">
          <Trophy size={20} className="animate-pulse" />
        </div>
      </div>

      {/* Surface Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {surfaces.map((surf) => {
          const data = parsedRatings[surf.key] || { rating: 5.0, matches_tracked: 0 };
          const trueElo = parsedElo && parsedElo[surf.key] ? Math.round(parsedElo[surf.key]) : null;
          const matchesTracked = parsedElo ? parsedElo[`matches_${surf.key}`] : data.matches_tracked;
          
          let rating = Number(data.rating || 5.0);
          let textLabel = data.text || "Average";

          if (trueElo) {
            rating = ((trueElo - 1400) / (2100 - 1400)) * 9.0 + 1.0;
            rating = Math.max(1.0, Math.min(10.0, rating));
            
            if (rating >= 8.5) textLabel = "ELITE";
            else if (rating >= 7.0) textLabel = "STRONG";
            else if (rating >= 5.5) textLabel = "SOLID";
            else if (rating >= 4.0) textLabel = "VULNERABLE";
            else textLabel = "WEAKNESS";
          }

          const percentage = Math.min(100, Math.max(10, rating * 10));
          const ratingColor = getRatingColorClass(rating);
          const isPreferred = normPref.includes(surf.surfaceName);

          return (
            <div
              key={surf.key}
              className={`bg-gradient-to-b from-[#161a25]/60 to-[#0f1115]/80 p-5 rounded-2xl border ${
                isPreferred ? 'border-tennis-lime/30' : 'border-white/5'
              } flex flex-col justify-between space-y-4 hover:border-white/10 transition-colors shadow-lg`}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-gray-400 tracking-wider block">
                    {surf.label}
                  </span>
                  {trueElo && (
                    <span className="text-[10px] font-black text-tennis-lime tracking-widest block pt-0.5">
                      ELO: {trueElo}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-gray-500 font-mono block">
                    {matchesTracked || 0} MATCHES
                  </span>
                  {isPreferred && (
                    <span className="bg-tennis-lime/10 border border-tennis-lime/20 text-tennis-lime text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center mt-1">
                      <Flame size={10} className="mr-1" /> BEST
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <div className="flex-1 h-3 bg-gray-800/50 rounded-full overflow-hidden relative border border-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    className={`h-full rounded-full bg-gradient-to-r ${surf.baseColor}`}
                  />
                </div>

                <div className="flex flex-col items-center gap-1">
                  <div className={`w-12 h-10 flex items-center justify-center rounded-lg border-2 ${ratingColor} text-lg font-black tracking-tighter`}>
                    {rating.toFixed(1)}
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                    {textLabel}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SurfaceMasteryWidget;


