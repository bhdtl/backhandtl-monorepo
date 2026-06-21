import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants, useDragControls } from 'framer-motion';
import { X, Gift, ShieldCheck, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NeoBetPromoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NeoBetPromoModal({ isOpen, onClose }: NeoBetPromoModalProps) {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);
  const dragControls = useDragControls();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const registrationUrl = "https://neo.bet/de/Sportwetten/Tennis?affiliateId=backhandtl-promo-popup";

  const promoSteps = [
    {
      title: t('picks.promoStep1Title', 'Register via our link'),
      desc: t('picks.promoStep1Desc', 'Click the "Activate Promo" button to register a new account on NEO.bet.')
    },
    {
      title: t('picks.promoStep2Title', 'Get €25 Freebet'),
      desc: t('picks.promoStep2Desc', 'A €25 Freebet will be credited to your account instantly – completely deposit-free!')
    },
    {
      title: t('picks.promoStep3Title', 'Win with AI Picks'),
      desc: t('picks.promoStep3Desc', 'Place the Freebet on our mathematically validated AI Picks and seize the opportunity for cash payouts.')
    }
  ];

  // Revolut & Apple native modal animation variants
  const modalVariants: Variants = {
    hidden: { 
      opacity: 0, 
      y: isMobile ? '100%' : 30, 
      scale: isMobile ? 1 : 0.95 
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: "spring", damping: 28, stiffness: 220 } 
    },
    exit: { 
      opacity: 0, 
      y: isMobile ? '100%' : 20, 
      scale: isMobile ? 1 : 0.95,
      transition: { duration: 0.22, ease: "easeInOut" }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-0 md:p-4">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-2xl"
          />

          {/* Modal Container */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            drag={isMobile ? "y" : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.1, bottom: 0.8 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 150) {
                onClose();
              }
            }}
            className="relative bg-gradient-to-br from-[#121620] via-[#0d1017] to-[#07090d] border border-white/10 w-full max-w-[420px] shadow-2xl overflow-hidden flex flex-col z-10 max-md:absolute max-md:bottom-0 max-md:top-auto max-md:rounded-b-none max-md:rounded-t-[2.5rem] md:rounded-[2.5rem]"
          >
            {/* Grabber Bar for Mobile Sheet */}
            <div 
              onPointerDown={(e) => dragControls.start(e)}
              className="md:hidden w-full flex justify-center py-3 cursor-grab active:cursor-grabbing select-none absolute top-0 left-0 right-0 z-30 touch-none"
            >
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            {/* Top Close Button (Sleek Apple style circle) */}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onClose}
              className="absolute top-5 right-5 z-20 flex items-center justify-center w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-gray-400 hover:text-white transition-all active:scale-95"
            >
              <X size={14} />
            </button>

            {/* Subtle Gradient Backglows */}
            <div className="absolute top-0 left-0 w-48 h-48 bg-tennis-lime/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-tennis-lime/5 rounded-full blur-[80px] pointer-events-none" />

            {/* Campaign Visual Banner with Revolut style overlap */}
            <div className="relative h-[200px] w-full overflow-hidden bg-black/10 flex items-center justify-center">
              <img
                src="/neobet/promo_square.jpg"
                alt="NEO.bet 25€ Freebet Promotion"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f1118] via-[#0f1118]/25 to-transparent" />
              
              <div className="absolute bottom-4 left-6 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                <Gift size={12} className="text-tennis-lime" />
                <span className="text-[9px] font-black uppercase tracking-widest text-tennis-lime">
                  {t('picks.exclusiveVoucher', 'Exclusive Voucher')}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 pb-8 pt-4 relative z-10">
              <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-1.5 leading-none">
                {t('picks.floatingFreebet', '25€ Freebet')}
              </h3>
              <p className="text-xs text-gray-400 font-semibold mb-6">
                {t('picks.promoSubtitleModal', 'Exclusive partner offer for Backhand.dtl. No deposit required!')}
              </p>

              {/* Step Checklist - Revolut-style timeline connector */}
              <div className="relative pl-8 space-y-6 mb-8">
                {/* Vertical Connector Line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-white/5" />

                {promoSteps.map((step: { title: string; desc: string }, idx: number) => (
                  <div key={idx} className="relative flex flex-col items-start gap-1">
                    {/* Timeline Node Badge */}
                    <div className="absolute -left-[27px] top-0 w-[22px] h-[22px] rounded-full bg-[#0f1115] border border-white/10 flex items-center justify-center text-[10px] font-black text-tennis-lime font-mono">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider mb-0.5 leading-none">
                        {step.title}
                      </h4>
                      <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Apple-style Glossy White CTA Button (Super Premium) */}
              <a
                href={registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 bg-gradient-to-r from-tennis-lime to-tennis-green hover:from-tennis-lime/90 hover:to-tennis-green/90 text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:shadow-[0_4px_25px_rgba(132,204,22,0.25)] hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 transform-gpu shadow-lg"
              >
                <span>{t('picks.promoClaim', 'Claim €25 Freebet Now')}</span>
                <ArrowRight size={14} className="stroke-[3px]" />
              </a>

              {/* Whitelist Regulatory Disclaimer */}
              <div className="mt-6 pt-4 border-t border-white/5 flex flex-col items-center gap-1.5 text-center">
                <div className="flex items-center gap-1.5 text-[8px] font-black text-gray-500 uppercase tracking-widest">
                  <ShieldCheck size={11} className="text-tennis-lime" />
                  <span>{t('partner.licensedRegulated', 'Licensed & Regulated (Whitelist)')}</span>
                </div>
                <p className="text-[8.5px] font-bold text-gray-600 leading-none tracking-wide uppercase">
                  Spielteilnahme ab 18 Jahren | Glücksspiel kann süchtig machen | Hilfe unter check-dein-spiel.de / buwei.de | BZgA: 0800 1 37 27 00
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
