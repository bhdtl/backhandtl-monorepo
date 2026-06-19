import React from 'react';
import { Trophy, Globe, Flame } from 'lucide-react';
import { motion } from 'framer-motion';

interface SurfaceMasteryWidgetProps {
  surfacePreference?: string;
}

export const SurfaceMasteryWidget: React.FC<SurfaceMasteryWidgetProps> = ({
  surfacePreference = 'All Court',
}) => {
  const normPref = (surfacePreference || '').toLowerCase().trim();

  // Generate deterministic court-specific win rates based on surface preference
  let clayWinRate = 60;
  let hardWinRate = 60;
  let grassWinRate = 60;

  if (normPref.includes('clay')) {
    clayWinRate = 82;
    hardWinRate = 64;
    grassWinRate = 58;
  } else if (normPref.includes('hard')) {
    hardWinRate = 80;
    clayWinRate = 62;
    grassWinRate = 68;
  } else if (normPref.includes('grass')) {
    grassWinRate = 84;
    hardWinRate = 72;
    clayWinRate = 55;
  } else {
    // All court / versatile
    hardWinRate = 74;
    clayWinRate = 70;
    grassWinRate = 72;
  }

  const surfaces = [
    {
      name: 'Hard Court',
      value: hardWinRate,
      color: 'bg-sky-500',
      textColor: 'text-sky-400',
      borderColor: 'border-sky-500/10',
      tint: 'from-sky-500/5 to-transparent',
      desc: 'Fast pace, medium bounce. Fits aggressive baseline play and big serve return.',
    },
    {
      name: 'Clay Court',
      value: clayWinRate,
      color: 'bg-amber-600',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-600/10',
      tint: 'from-amber-600/5 to-transparent',
      desc: 'Slow pace, high bounce. Favors physical baseline rallies and heavy topspin.',
    },
    {
      name: 'Grass Court',
      value: grassWinRate,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/10',
      tint: 'from-emerald-500/5 to-transparent',
      desc: 'Very fast, low bounce. Enhances serve & volley, slice, and quick reflex play.',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 animate-fade-in"
    >
      {/* Primary Preference Banner */}
      <div className="bg-gradient-to-br from-[#161a25]/60 to-[#0f1115]/80 p-5 rounded-2xl border border-white/5 flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
            Preferred Surface
          </span>
          <h3 className="text-lg font-black text-white uppercase tracking-wider">
            {surfacePreference} Specialty
          </h3>
        </div>
        <div className="bg-tennis-lime/10 text-tennis-lime border border-tennis-lime/20 p-3 rounded-2xl">
          <Trophy size={20} className="animate-pulse" />
        </div>
      </div>

      {/* Surface Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {surfaces.map((s) => {
          const isPreferred = normPref.includes(s.name.split(' ')[0].toLowerCase());
          return (
            <div
              key={s.name}
              className={`bg-gradient-to-b ${s.tint} to-[#0f1115]/80 p-5 rounded-2xl border ${
                isPreferred ? 'border-tennis-lime/30' : 'border-white/5'
              } flex flex-col justify-between space-y-4 hover:border-white/10 transition-colors shadow-lg`}
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-white font-bold text-sm tracking-wide">{s.name}</h4>
                  {isPreferred && (
                    <span className="bg-tennis-lime/10 border border-tennis-lime/20 text-tennis-lime text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center">
                      <Flame size={10} className="mr-1" /> Best
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 leading-normal">{s.desc}</p>
              </div>

              {/* Progress Win Rate */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Win Rate</span>
                  <span className={`font-black ${s.textColor}`}>{s.value}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                  <div
                    className={`h-full rounded-full ${s.color} transition-all duration-700`}
                    style={{ width: `${s.value}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default SurfaceMasteryWidget;

