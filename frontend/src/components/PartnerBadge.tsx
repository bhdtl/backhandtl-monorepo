import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface PartnerBadgeProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export function PartnerBadge({ className = "", variant = 'compact' }: PartnerBadgeProps) {
  const { t } = useTranslation();

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.3 }}
        className={`inline-flex items-center gap-3 px-4 py-2 bg-[#15171e]/60 border border-white/10 rounded-2xl shadow-xl backdrop-blur-md cursor-pointer group ${className}`}
      >
        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-500 group-hover:text-white transition-colors">
          {t('partner.officialPartner')}:
        </span>
        <div className="h-4 flex items-center border-l border-white/10 pl-3">
          <img 
            src="/neobet_logo_white.svg" 
            alt="NEO.bet Logo" 
            className="h-full w-auto opacity-70 group-hover:opacity-100 transition-opacity duration-300"
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 bg-gradient-to-br from-[#15171e]/80 to-[#0f1115]/80 border border-white/5 rounded-[2rem] shadow-2xl backdrop-blur-xl relative overflow-hidden group hover:border-tennis-lime/20 transition-all duration-300 ${className}`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-tennis-lime/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-tennis-lime/10 transition-all duration-500"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div>
          <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tennis-lime opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-tennis-lime"></span>
            </span>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-tennis-lime">
              {t('partner.premiumPartner')}
            </span>
          </div>
          <h3 className="text-lg font-black text-white uppercase tracking-tight mb-1">
            BACKHAND.DTL x NEO.bet
          </h3>
          <p className="text-xs text-gray-500 font-medium max-w-sm">
            {t('partner.description')}
          </p>
        </div>
        
        <div className="flex items-center gap-6 px-6 py-3 bg-black/30 border border-white/10 rounded-2xl shadow-inner">
          <img 
            src="/neobet_logo_white.svg" 
            alt="NEO.bet Logo" 
            className="h-6 w-auto opacity-90 hover:opacity-100 transition-opacity duration-300 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]"
          />
        </div>
      </div>
    </motion.div>
  );
}

