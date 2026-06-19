import { motion } from 'framer-motion';
import { Target, Activity } from 'lucide-react';

// --- INTERFACES ---
export interface GameCardPlayer {
  id: string;
  first_name: string;
  last_name: string;
  country: string;
  profile_image_url: string;
  play_style: string;
  surface_preference: string;
  form_rating: number; // 0 bis 10.0 -> Wird für die UI auf 0-100 skaliert
}

interface NeuralGameCardProps {
  player: GameCardPlayer;
  onClick?: () => void;
  isSelected?: boolean;
}

// --- HELPER: TIER SYSTEM (APPLE STYLE GRADIENTS) ---
const getTierVisuals = (formRating: number) => {
  // Skaliere 0-10 auf 0-100 für einfachere Lesbarkeit im Spiel
  const rating = Math.round(formRating * 10);

  if (rating >= 90) return {
      name: 'MYTHICAL',
      badge: 'bg-fuchsia-500 text-white',
      gradient: 'from-fuchsia-600 via-purple-600 to-indigo-600',
      text: 'text-fuchsia-400',
      glow: 'shadow-[0_0_40px_rgba(192,38,211,0.3)]'
  };
  if (rating >= 85) return {
      name: 'LEGENDARY',
      badge: 'bg-blue-500 text-white',
      gradient: 'from-blue-500 via-cyan-500 to-teal-400',
      text: 'text-cyan-400',
      glow: 'shadow-[0_0_35px_rgba(6,182,212,0.3)]'
  };
  if (rating >= 80) return {
      name: 'ELITE',
      badge: 'bg-indigo-500 text-white',
      gradient: 'from-indigo-500 via-blue-500 to-cyan-500',
      text: 'text-indigo-400',
      glow: 'shadow-[0_0_30px_rgba(99,102,241,0.3)]'
  };
  if (rating >= 75) return {
      name: 'DIAMOND',
      badge: 'bg-emerald-500 text-black',
      gradient: 'from-emerald-400 via-teal-500 to-cyan-500',
      text: 'text-emerald-400',
      glow: 'shadow-[0_0_25px_rgba(52,211,153,0.2)]'
  };
  if (rating >= 70) return {
      name: 'PRO',
      badge: 'bg-tennis-lime text-black',
      gradient: 'from-tennis-lime via-green-500 to-emerald-600',
      text: 'text-tennis-lime',
      glow: 'shadow-[0_0_20px_rgba(204,255,0,0.2)]'
  };
  if (rating >= 60) return {
      name: 'CHALLENGER',
      badge: 'bg-yellow-500 text-black',
      gradient: 'from-yellow-400 via-orange-500 to-red-500',
      text: 'text-yellow-400',
      glow: 'shadow-[0_0_15px_rgba(234,179,8,0.2)]'
  };
  return {
      name: 'PROSPECT',
      badge: 'bg-gray-400 text-black',
      gradient: 'from-gray-500 via-gray-600 to-slate-800',
      text: 'text-gray-400',
      glow: 'shadow-[0_10px_20px_rgba(0,0,0,0.5)]'
  };
};

// --- HELPER: SURFACE AURA ---
const getSurfaceAura = (surface: string) => {
  const s = (surface || '').toLowerCase();
  if (s.includes('clay')) return 'ring-red-500/40 shadow-[inset_0_0_30px_rgba(239,68,68,0.15)]';
  if (s.includes('grass')) return 'ring-emerald-500/40 shadow-[inset_0_0_30px_rgba(16,185,129,0.15)]';
  return 'ring-blue-500/40 shadow-[inset_0_0_30px_rgba(59,130,246,0.15)]'; // Hard/Indoor
};

export const NeuralGameCard = ({ player, onClick, isSelected }: NeuralGameCardProps) => {
  const tier = getTierVisuals(player.form_rating);
  const surfaceAura = getSurfaceAura(player.surface_preference);

  // Nimm nur den ersten Tag für ein sauberes UI
  const mainPlayStyle = player.play_style ? player.play_style.split(',')[0].trim() : 'Balanced';
  const displayRating = Math.round(player.form_rating * 10);

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{ willChange: 'transform' }}
      className={`
        relative w-full aspect-[3/4.2] rounded-[2rem] bg-[#0a0c10] overflow-hidden cursor-pointer
        ring-1 transition-[box-shadow,ring-color] duration-500 group select-none transform-gpu
        ${isSelected ? 'ring-white shadow-[0_0_40px_rgba(255,255,255,0.2)]' : surfaceAura}
        ${tier.glow}
      `}
    >
      {/* 1. LEGAL SHIELD BACKGROUND (Blurred Silhouette) */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-[#15171e]">
        {player.profile_image_url ? (
          <img
            src={player.profile_image_url}
            alt={player.last_name}
            className="w-full h-full object-cover blur-xl scale-125 saturate-50 opacity-60 mix-blend-luminosity transform-gpu will-change-transform group-hover:scale-150 transition-transform duration-1000"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-gray-800 to-black" />
        )}

        {/* Tier Color Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-b ${tier.gradient} mix-blend-overlay opacity-40`} />

        {/* Heavy Vignette to hide details */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c10] via-[#0a0c10]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0c10]/50 to-transparent" />

        {/* High-End Grain (Apple Glassmorphism) */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
      </div>

      {/* 2. TOP SECTION: Nationality & Badge */}
      <div className="relative z-10 flex justify-between items-start p-4 md:p-5">
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md rounded-full px-2.5 py-1 border border-white/10 w-fit shadow-lg">
                <img src={`https://flagcdn.com/w20/${(player.country || 'un').toLowerCase()}.png`} className="w-3.5 h-auto rounded-[1px] opacity-90" alt="" />
                <span className="text-[9px] font-black text-white uppercase tracking-widest">{player.country}</span>
            </div>
            <div className={`text-[8px] font-black px-2 py-0.5 rounded-sm w-fit uppercase tracking-[0.2em] shadow-lg ${tier.badge}`}>
                {tier.name}
            </div>
        </div>

        {/* Dynamic Form Rating Box */}
        <div className="flex flex-col items-end">
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/50 mb-0.5 mr-1">OVR</span>
            <div className={`flex items-center justify-center bg-black/60 backdrop-blur-xl border border-white/20 rounded-xl px-3 py-2 shadow-2xl transition-colors group-hover:border-white/40`}>
                <span className={`text-3xl font-black italic leading-none tracking-tighter ${tier.text} drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]`}>
                    {displayRating}
                </span>
            </div>
        </div>
      </div>

      {/* 3. CENTER: Abstract Element (Neural Core) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity duration-700">
         <Activity size={120} className={tier.text} strokeWidth={0.5} />
      </div>

      {/* 4. BOTTOM SECTION: Name & Stats */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 bg-gradient-to-t from-[#0a0c10] via-[#0a0c10]/90 to-transparent pt-12">
        <div className="mb-3">
            <h2 className="text-white font-black text-2xl md:text-3xl uppercase italic tracking-tighter leading-none mb-1">
                {player.last_name}
            </h2>
            <p className="text-gray-400 text-[10px] md:text-xs font-bold uppercase tracking-widest">
                {player.first_name}
            </p>
        </div>

        {/* Tactical Footer */}
        <div className="flex justify-between items-end border-t border-white/10 pt-3">
            <div className="flex flex-col">
                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Combat Style</span>
                <span className="text-[10px] font-bold text-white flex items-center gap-1.5">
                    <Target size={10} className={tier.text}/> {mainPlayStyle}
                </span>
            </div>

            <div className="flex flex-col items-end">
                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Terrain</span>
                <span className="text-[10px] font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
                    {player.surface_preference}
                </span>
            </div>
        </div>
      </div>

      {/* Selection State Overlay */}
      {isSelected && (
          <div className="absolute inset-0 border-4 border-white rounded-[2rem] pointer-events-none shadow-[inset_0_0_20px_rgba(255,255,255,0.5)] z-20" />
      )}
    </motion.div>
  );
};
