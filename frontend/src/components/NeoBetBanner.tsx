import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

interface NeoBetBannerProps {
  size?: '120x240' | '120x600' | '160x600' | '200x200';
  className?: string;
}

export function NeoBetBanner({ size = '200x200', className = "" }: NeoBetBannerProps) {
  // Map size to dimensions
  const dims = {
    '120x240': { width: 120, height: 240 },
    '120x600': { width: 120, height: 600 },
    '160x600': { width: 160, height: 600 },
    '200x200': { width: 200, height: 200 }
  };

  const currentDim = dims[size] || dims['200x200'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`relative p-6 bg-[#15171e]/40 border border-white/5 rounded-3xl flex flex-col items-center justify-center backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-tennis-lime/30 group ${className}`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-tennis-lime/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-tennis-lime/10 transition-all duration-500"></div>
      
      {/* Offizieller Partner Badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tennis-lime opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-tennis-lime"></span>
        </span>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-tennis-lime">
          OFFIZIELLER PREMIUM PARTNER
        </span>
      </div>

      {/* The actual Banner Iframe wrapper */}
      <div 
        className="relative overflow-hidden rounded-2xl bg-black/20 p-2 border border-white/10 shadow-inner flex items-center justify-center"
        style={{ width: `${currentDim.width + 16}px`, height: `${currentDim.height + 16}px` }}
      >
        <iframe
          title={`NEO.bet ${size}`}
          width={currentDim.width}
          height={currentDim.height}
          loading="lazy"
          scrolling="no"
          style={{ border: 'none', overflow: 'hidden', borderRadius: '8px' }}
          src={`https://banner.neobet.de/?slide=campaign&custom_a=backhandtl-${size}&size=${size}`}
        />
      </div>

      {/* German Regulatory Whitelist Footer */}
      <div className="mt-4 flex flex-col items-center gap-1.5 text-center max-w-[280px]">
        <div className="flex items-center gap-1 text-[8px] font-black text-gray-500 uppercase tracking-widest">
          <ShieldCheck size={10} className="text-tennis-lime" />
          <span>Lizenziert & Reguliert (Whitelist)</span>
        </div>
        <p className="text-[9px] font-bold text-gray-600 leading-normal tracking-wide uppercase">
          18+ | Suchtrisiken | Hilfe unter buwei.de
        </p>
      </div>
    </motion.div>
  );
}
