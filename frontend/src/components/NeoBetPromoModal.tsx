import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NeoBetPromoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NeoBetPromoModal({ isOpen, onClose }: NeoBetPromoModalProps) {
  const { t, i18n } = useTranslation();

  const isGerman = i18n.language?.startsWith('de');

  const registrationUrl = "https://neo.bet/de/Sportwetten/Tennis?affiliateId=backhandtl-promo-popup";

  const steps = isGerman ? [
    {
      title: "Konto erstellen",
      desc: "Registriere dich kostenlos bei unserem Partner NEO.bet über unseren Link."
    },
    {
      title: "25€ Freebet erhalten",
      desc: "Die 25€ Gratiswette wird deinem Account sofort gutgeschrieben – komplett ohne Einzahlung!"
    },
    {
      title: "Mit AI Picks gewinnen",
      desc: "Setze die Freebet auf unsere mathematisch geprüften AI Picks und wandle sie risikofrei in Echtgeld um."
    }
  ] : [
    {
      title: "Create Account",
      desc: "Register for free with our partner NEO.bet using our dynamic referral link."
    },
    {
      title: "Get €25 Freebet",
      desc: "A €25 Freebet will be credited to your account instantly – completely deposit-free!"
    },
    {
      title: "Win with AI Picks",
      desc: "Place the Freebet on our mathematically validated AI Picks to turn it into risk-free cash."
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
            className="relative bg-[#15171e] border border-white/10 w-full max-w-[440px] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col z-10"
          >
            {/* Top Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 z-20 flex items-center justify-center p-2.5 bg-black/40 hover:bg-black/80 rounded-full border border-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>

            {/* Glowing effect inside */}
            <div className="absolute -top-32 -left-32 w-64 h-64 bg-tennis-lime/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-tennis-lime/5 rounded-full blur-[80px] pointer-events-none" />

            {/* Campaign Visual Banner */}
            <div className="relative h-[220px] w-full overflow-hidden bg-black/20 flex items-center justify-center">
              <img
                src="/neobet/promo_square.jpg"
                alt="NEO.bet 25€ Freebet Promotion"
                className="w-full h-full object-cover scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#15171e] via-[#15171e]/30 to-transparent" />
              
              <div className="absolute bottom-4 left-6 flex items-center gap-2">
                <div className="p-1 bg-tennis-lime/10 rounded-lg border border-tennis-lime/20">
                  <Gift size={14} className="text-tennis-lime" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-tennis-lime">
                  EXCLUSIVE VOUCHER
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 pb-8 pt-2 relative z-10">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-1.5 leading-none">
                {isGerman ? "25€ Gratiswette Sichern" : "Get Your €25 Freebet"}
              </h3>
              <p className="text-xs text-gray-400 font-semibold mb-6">
                {isGerman 
                  ? "Exklusiv für Backhand.dtl Mitglieder. Keine Einzahlung erforderlich!" 
                  : "Exclusive Backhand.dtl partner offer. No deposit required!"}
              </p>

              {/* Step Checklist */}
              <div className="space-y-4 mb-8">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-6 h-6 rounded-full bg-tennis-lime/10 border border-tennis-lime/20 flex items-center justify-center text-tennis-lime text-[11px] font-black font-mono">
                        {idx + 1}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider mb-0.5 leading-none">
                        {step.title}
                      </h4>
                      <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Main CTA */}
              <a
                href={registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 bg-tennis-lime text-black font-black text-xs uppercase tracking-widest rounded-xl hover:shadow-[0_0_25px_rgba(204,255,0,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 transform-gpu"
              >
                <span>{isGerman ? "Jetzt 25€ Freebet beanspruchen" : "Claim €25 Freebet Now"}</span>
                <ArrowRight size={14} className="stroke-[3px]" />
              </a>

              {/* Regulatory Footer */}
              <div className="mt-5 pt-4 border-t border-white/5 flex flex-col items-center gap-1.5 text-center">
                <div className="flex items-center gap-1.5 text-[8px] font-black text-gray-500 uppercase tracking-widest">
                  <ShieldCheck size={11} className="text-tennis-lime" />
                  <span>Officially Licensed & Regulated (Whitelist)</span>
                </div>
                <p className="text-[8.5px] font-bold text-gray-600 leading-none tracking-wide uppercase">
                  18+ | Suchtrisiken | Hilfe unter buwei.de
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
