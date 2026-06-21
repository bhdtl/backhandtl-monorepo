import { useState, useEffect, useLayoutEffect } from 'react';
import { safeLocalStorage } from '../lib/storage';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { BrandLogo } from '../components/BrandLogo';
import { 
  Zap, Activity, BrainCircuit, 
  TrendingUp, ArrowRight, X, Database, Eye, Lock, ShieldCheck, CreditCard 
} from 'lucide-react';
// 🚀 SOTA FIX: Importiere Lenis für das "Butter Smooth Scrolling" aus dem Video
import Lenis from '@studio-freight/lenis';
import { PartnerBadge } from '../components/PartnerBadge';
import { NeoBetBanner } from '../components/NeoBetBanner';
import { useTranslation } from 'react-i18next';

// --- INTERFACES ---
interface OnboardingData {
  goal: string;
  experience: string;
}

interface LandingPageProps {
  onTriggerAuth: (mode: 'login' | 'register', onboardingData?: OnboardingData) => void;
  forcedShowQuiz?: boolean;
  onQuizClosed?: () => void;
  onOpenLegal: (type: string) => void; 
}

// --- ANIMATION VARIANTS (Hardware Accelerated) ---
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30, transform: 'translate3d(0, 30px, 0)' },
  visible: { opacity: 1, y: 0, transform: 'translate3d(0, 0px, 0)', transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

// --- BRANDED PAYMENT OPTIONS (Apple HIG High-Fidelity SVGs) ---
const paymentMethods = [
  {
    name: 'Visa',
    icon: (
      <svg className="w-8 h-3.5 fill-current text-white/50 group-hover:text-white transition-all duration-300" viewBox="0 0 24 8" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.6 8L5.4 0H4L2.2 8H3.6ZM9.3 0H7.7C7.4 0 7.1 0.2 7 0.5L4.2 8H5.7L6 7.1H8.6L8.8 8H10.3L9.3 0ZM6.4 5.9L7.3 3.3L7.8 5.9H6.4ZM15.1 0H13.8L12.3 5.4L11.5 0.7C11.4 0.3 11.1 0 10.7 0H9.1L9 0.4C10 1.2 10.9 2.2 11.6 3.3L12.9 8H14.4L16.2 0H15.1ZM20.7 2.4C20.7 1.4 19.3 1.3 19.3 0.9C19.3 0.8 19.5 0.7 19.8 0.7C20.1 0.7 20.7 0.8 21 1L21.3 0.1C20.9 0 20.3 0 19.8 0C18.6 0 17.8 0.6 17.8 1.5C17.8 2.6 19.3 2.7 19.3 3.3C19.3 3.5 19 3.6 18.7 3.6C18.3 3.6 17.7 3.4 17.4 3.2L17.1 4.2C17.6 4.4 18.2 4.5 18.8 4.5C20.1 4.5 20.7 3.8 20.7 2.4Z"/>
      </svg>
    )
  },
  {
    name: 'Mastercard',
    icon: (
      <svg className="w-5.5 h-3.5 transition-all duration-300 opacity-60 group-hover:opacity-100" viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="7" fill="#EB001B" />
        <circle cx="16" cy="8" r="7" fill="#F79E1B" fillOpacity="0.8" />
      </svg>
    )
  },
  {
    name: 'Apple Pay',
    icon: (
      <svg className="w-9 h-3.5 fill-current text-white/50 group-hover:text-white transition-all duration-300" viewBox="0 0 35 15" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.2 2.2C4.5 3 3.5 3.5 2.5 3.4c-.1-1 .4-2 1.1-2.7C4.3.9 5.4.4 6.3.5c.1.9-.4 1.9-1.1 1.7zm1.1 1.5c-1 0-1.8.6-2.3.6-.5 0-1.2-.5-2-.5C.9 3.8 0 4.8 0 6.6c0 3 2.3 6.4 4.3 6.4.9 0 1.4-.5 2.2-.5.8 0 1.2.5 2.2.5 1.9 0 3.3-3 3.3-4.5 0-2.4-2.1-3.3-3.2-3.3z"/>
        <path d="M16.5 4.5h2.5c1.4 0 2.2.7 2.2 1.8s-.8 1.8-2.2 1.8h-1.3v2.2h-1.2V4.5zm2.5 2.5c.7 0 1.1-.3 1.1-.8s-.4-.7-1.1-.7h-1.3v1.5h1.3zm6 1h-2v1.2h2.2v.9h-3.4V4.5h3.4v.9h-2.2v1.1h2v.7zm3 2.3l-1.9-5.8h1.3l1.2 4.1 1.2-4.1h1.3l-1.9 5.8h-1.2z"/>
      </svg>
    )
  },
  {
    name: 'Google Pay',
    icon: (
      <svg className="w-9 h-3.5 fill-current text-white/50 group-hover:text-white transition-all duration-300" viewBox="0 0 35 15" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.2 6.8v1.7h2.8c-.1.7-.8 2-2.8 2-1.7 0-3.1-1.4-3.1-3.2S3.5 4.1 5.2 4.1c1 0 1.6.4 2 .8l1.3-1.3C7.6 2.7 6.5 2 5.2 2c-3 0-5.4 2.4-5.4 5.4s2.4 5.4 5.4 5.4c3.1 0 5.2-2.2 5.2-5.3 0-.4 0-.6-.1-.7H5.2z"/>
        <path d="M14.5 4.5h2.5c1.4 0 2.2.7 2.2 1.8s-.8 1.8-2.2 1.8h-1.3v2.2h-1.2V4.5zm2.5 2.5c.7 0 1.1-.3 1.1-.8s-.4-.7-1.1-.7h-1.3v1.5h1.3zm6 1h-2v1.2h2.2v.9h-3.4V4.5h3.4v.9h-2.2v1.1h2v.7zm3 2.3l-1.9-5.8h1.3l1.2 4.1 1.2-4.1h1.3l-1.9 5.8h-1.2z"/>
      </svg>
    )
  },
  {
    name: 'PayPal',
    icon: (
      <svg className="w-8 h-3.5 fill-current text-blue-400/50 group-hover:text-blue-400 transition-all duration-300" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M20.06 6.13c-.32-1.63-1.45-3.05-3.08-3.66C15.35 1.85 13.56 1.7 11.83 1.7H4.42c-.52 0-.96.38-1.04.89L1.04 17.55c-.09.52.31.98.83.98h3.94l.87-5.5c.08-.52.52-.89 1.04-.89h2.33c4.13 0 7.37-1.68 8.24-5.97.09-.43.14-.85.14-1.26a6.83 6.83 0 0 0-.33-1.78zM18.17 6.2c-.73 3.63-3.23 5.05-6.8 5.05H8.73l.79-5.02c.03-.22.22-.38.45-.38h1.86c2.51 0 4.47.53 5.3 1.63.5.65.65 1.54.54 2.1c-.02.13-.04.26-.06.38z"/>
        <path d="M16.94 11.23c-.31-1.6-1.43-3.01-3.05-3.61C12.3 7 10.51 6.85 8.78 6.85H1.37c-.52 0-.96.38-1.04.89L.33 22.7c-.09.52.31.98.83.98h3.94l.87-5.5c.08-.52.52-.89 1.04-.89h2.33c4.13 0 7.37-1.68 8.24-5.97.09-.43.14-.85.14-1.26c0-.62-.12-1.22-.33-1.83z" fillOpacity="0.4"/>
      </svg>
    )
  },
  {
    name: 'Amex',
    icon: (
      <svg className="w-8 h-3.5 fill-current text-cyan-400/50 group-hover:text-cyan-400 transition-all duration-300" viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="16" rx="2" fill="currentColor" fillOpacity="0.05"/>
        <text x="3" y="11" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="7" letterSpacing="0.3" fill="currentColor">AMEX</text>
      </svg>
    )
  }
];

// --- COMPONENT: COOKIE & PRIVACY BANNER ---
function CookieBanner() {
  const [isVisible, setIsVisible] = useState(!safeLocalStorage.getItem('cookie_consent'));
  
  if (!isVisible) return null;

  const handleAccept = () => {
    safeLocalStorage.setItem('cookie_consent', 'true');
    setIsVisible(false);
  };

  const handleDecline = () => {
    safeLocalStorage.setItem('cookie_consent', 'false');
    setIsVisible(false);
  };

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-6 left-6 right-6 z-[200] md:left-auto md:right-8 md:w-96"
    >
      <div className="bg-[#15171e]/90 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl shadow-black/50 will-change-transform">
        <h4 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
          <Lock size={14} className="text-tennis-lime" /> {t('landing.cookiesTitle', 'Data Privacy & Cookies')}
        </h4>
        <p className="text-[11px] text-gray-400 leading-relaxed mb-4">
          {t('landing.cookiesDesc', 'We use proprietary encryption and anonymized analytical models (PostHog) to optimize your experience. Strictly necessary cookies are used for authentication. By continuing, you agree to our institutional privacy standards.')}
        </p>
        <div className="flex gap-2">
          <button 
            onClick={handleAccept}
            className="flex-1 py-3 md:py-2.5 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-tennis-lime transition-all duration-300 flex items-center justify-center"
          >
            {t('landing.acceptAll', 'Accept All')}
          </button>
          <button 
            onClick={handleDecline}
            className="flex-1 py-3 md:py-2.5 bg-white/5 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all duration-300 flex items-center justify-center"
          >
            {t('landing.essentialOnly', 'Essential Only')}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// 1. HEADER (SMART LOGIN)
function LandingHeader({ onLogin }: { onLogin: () => void }) {
  const { t } = useTranslation();
  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center bg-[#0f1115]/80 backdrop-blur-md border-b border-white/5 transition-all will-change-transform"
    >
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth'})}>
        <BrandLogo className="h-6 text-white" />
        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest hidden md:inline-block border border-white/10 px-2.5 py-0.5 rounded-md">
          {t('landing.version', 'v8.6 PRO')}
        </span>
      </div>
      
      <div className="flex items-center gap-6">
        <a href="#how-it-works" className="text-xs font-bold text-gray-400 hover:text-white transition-colors hidden sm:block">
          {t('landing.howItWorks', 'How it works')}
        </a>
        <button 
          onClick={onLogin}
          className="text-xs font-black uppercase tracking-wider bg-white text-black px-5 py-3 md:py-2.5 rounded-lg hover:bg-tennis-lime transition-all duration-300 shadow-lg hover:shadow-tennis-lime/20 flex items-center justify-center"
        >
          {t('landing.login', 'Login')}
        </button>
      </div>
    </motion.header>
  );
}

// 2. QUIZ MODAL
function QuizModal({ onClose, onFinish }: { onClose: () => void, onFinish: (data: OnboardingData) => void }) {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selections, setSelections] = useState<OnboardingData>({ goal: '', experience: '' });
  const totalSteps = 3; 

  const handleChoice = (key: keyof OnboardingData, value: string) => {
    setSelections(prev => ({ ...prev, [key]: value }));
    setStep(step + 1);
  };

  const handleCommit = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      onFinish(selections); 
    }, 2800);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={onClose}></div>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-[#15171e] border border-white/10 w-full max-w-md p-8 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden will-change-transform"
      >
        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="relative w-20 h-20 mb-8">
              <div className="absolute inset-0 rounded-full border-t-2 border-tennis-lime animate-spin"></div>
              <div className="absolute inset-3 rounded-full border-r-2 border-white/20 animate-spin-reverse"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <BrainCircuit className="text-white/50" size={24} />
              </div>
            </div>
            
            <h3 className="text-xl font-extrabold text-white mb-2 tracking-tight">Compiling Alpha Data</h3>
            <p className="text-sm text-gray-400 mb-8">Crunching 14,000+ historical data points for your profile...</p>
            
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden transform-gpu">
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: "100%" }} 
                  transition={{ duration: 2.8, ease: "linear" }} 
                  className="h-full bg-tennis-lime shadow-[0_0_10px_#ccff00]" 
                />
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.15em]">Analysis Step {step}/{totalSteps}</span>
                <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full"><X size={16} className="text-gray-600 hover:text-white transition-colors" /></button>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-tennis-lime shadow-[0_0_8px_#ccff00]' : 'bg-white/5'}`}></div>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ x: 10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -10, opacity: 0 }}>
                  <h3 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Target ROI?</h3>
                  <p className="text-gray-400 text-sm mb-8">What is your primary focus for the dashboard?</p>
                  
                  <div className="space-y-3">
                    {[
                      { label: 'Long-term Portfolio Growth', icon: TrendingUp }, 
                      { label: 'Market Discrepancy Hunting', icon: Zap }, 
                      { label: 'Advanced Player Analytics', icon: Activity }
                    ].map((opt) => (
                      <button key={opt.label} onClick={() => handleChoice('goal', opt.label)} className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-tennis-lime/50 hover:bg-white/[0.08] transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="bg-white/5 p-2 rounded-lg text-gray-400 group-hover:text-tennis-lime transition-colors">
                            <opt.icon size={18} />
                          </div>
                          <span className="font-bold text-sm text-gray-200 group-hover:text-white">{opt.label}</span>
                        </div>
                        <ArrowRight size={16} className="text-gray-600 group-hover:text-tennis-lime transition-all opacity-0 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ x: 10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -10, opacity: 0 }}>
                  <h3 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Experience?</h3>
                  <p className="text-gray-400 text-sm mb-8">We tailor the complexity based on your level.</p>
                  
                  <div className="space-y-3">
                    {['Professional / Full-time', 'Experienced Enthusiast', 'Newcomer to Data'].map((opt) => (
                      <button key={opt} onClick={() => handleChoice('experience', opt)} className="w-full text-left p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-tennis-lime/50 hover:bg-white/[0.08] transition-all text-sm font-bold text-gray-200 hover:text-white flex justify-between group">
                        {opt}
                        <ArrowRight size={16} className="text-gray-600 group-hover:text-tennis-lime transition-all opacity-0 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ x: 10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -10, opacity: 0 }} className="text-center">
                  <div className="w-20 h-20 bg-tennis-lime/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-tennis-lime/20">
                    <ShieldCheck size={40} className="text-tennis-lime" />
                  </div>
                  <h3 className="text-3xl font-extrabold text-white mb-4 tracking-tight">Commitment</h3>
                  <p className="text-gray-400 text-sm mb-10 leading-relaxed px-2">
                    Neural Scout Pro delivers high-precision market data. To proceed, you must commit to maintaining financial discipline and professional risk management.
                  </p>
                  
                  <button 
                    onClick={handleCommit} 
                    className="w-full h-14 bg-tennis-lime text-black font-bold text-sm rounded-2xl shadow-[0_0_30px_rgba(204,255,0,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center"
                  >
                    I commit. Show results.
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>
    </div>
  );
}

// 3. EXPLAINER MODAL
function ExplainerModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:px-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative bg-[#11131a] border-t md:border border-white/10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-t-[2rem] md:rounded-[2rem] shadow-2xl p-8 will-change-transform"
      >
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/10 rounded-full md:hidden"></div>
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full hover:bg-white/10 hidden md:block"><X size={20} /></button>
        
        <div className="mt-4 md:mt-0">
          <div className="flex items-center gap-3 mb-8">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tennis-lime opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-tennis-lime"></span>
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">{t('landing.howItWorks', 'How it works')}</h2>
          </div>
          
          <div className="space-y-8 relative">
              <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-tennis-lime via-white/10 to-transparent"></div>

              {[
                { icon: Database, title: "1. Real-Time Aggregation", desc: "We scan global data streams without delay. As soon as a line moves, you see it instantly." },
                { icon: Eye, title: "2. Visual BSI Engine", desc: "Our AI sees the court. We calculate the Bounce Speed Index (BSI) from live video feeds." },
                { icon: BrainCircuit, title: "3. Neural Core Engine", desc: "Deep-learning models analyze psychological and tactical matchups based on 10,000+ matches." },
                { icon: Zap, title: "4. The Analytical Edge", desc: "We compare our 'Fair Value' calculation with the market consensus. We alert you when the variance is >5%." }
              ].map((item, i) => (
                <div key={i} className="flex gap-6 relative z-10">
                   <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-[#1a1d26] flex items-center justify-center border border-white/10 shadow-lg">
                     <item.icon className="text-tennis-lime" size={20} />
                   </div>
                   <div className="pt-1">
                     <h4 className="text-lg font-bold text-white mb-1">{item.title}</h4>
                     <p className="text-sm text-gray-400 leading-relaxed font-medium">{item.desc}</p>
                   </div>
                </div>
              ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// 🚀 MAIN LANDING COMPONENT
export function LandingPage({ onTriggerAuth, forcedShowQuiz, onQuizClosed }: LandingPageProps) {
  const { t } = useTranslation();
  const [showQuiz, setShowQuiz] = useState(false);
  const [showExplainer, setShowExplainer] = useState(false);
  const [playerCount, setPlayerCount] = useState<number | null>(null);

  // 🚀 SOTA FIX: Lenis Smooth Scrolling Setup
  useLayoutEffect(() => {
    // Initialize Lenis only if it's not a touch device (to preserve native mobile scroll feel)
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    
    if (!isTouchDevice) {
      const lenis = new Lenis({
        duration: 1.2,
        easing: (time: number) => Math.min(1, 1.001 - Math.pow(2, -10 * time)), // Apple-like easing
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        smoothTouch: false, // Touch devices use native scroll
        touchMultiplier: 2,
      } as any);

      function raf(time: number) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }

      requestAnimationFrame(raf);

      return () => {
        lenis.destroy();
      };
    }
  }, []);

  useEffect(() => {
      if (forcedShowQuiz) {
          setShowQuiz(true);
      }
  }, [forcedShowQuiz]);

  const handleQuizClose = () => {
      setShowQuiz(false);
      if (onQuizClosed) onQuizClosed();
  };

  useEffect(() => {
    async function fetchStats() {
      const { count } = await supabase.from('players').select('*', { count: 'exact', head: true });
      setPlayerCount(count);
    }
    fetchStats();
  }, []);

  const handleStartAnalysis = () => {
    setShowQuiz(true);
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-white overflow-hidden selection:bg-tennis-lime selection:text-black font-sans">
      
      <LandingHeader onLogin={() => onTriggerAuth('login')} />
      <CookieBanner />

      <AnimatePresence>
        {showQuiz && (
          <QuizModal 
            onClose={handleQuizClose} 
            onFinish={(data) => {
              handleQuizClose();
              onTriggerAuth('register', data); 
            }} 
          />
        )}
        {showExplainer && <ExplainerModal onClose={() => setShowExplainer(false)} />}
      </AnimatePresence>

      <section className="relative pt-40 pb-20 md:pt-52 md:pb-32 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-tennis-lime/5 blur-[120px] rounded-full pointer-events-none transform-gpu"></div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="flex flex-col items-center"
          >
            <motion.div variants={fadeInUp} className="mb-8 inline-flex items-center gap-3 px-4.5 py-2 rounded-full border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-2xl">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-300">
                  {t('landing.systemLive', 'System Live')}
                </span>
              </div>
              <div className="w-px h-3 bg-white/10"></div>
              <span className="text-[11px] font-mono text-gray-400">
                {playerCount ? t('landing.playersTracked', '{{count}} Players Tracked', { count: playerCount }) : t('landing.connectingDb', 'Connecting Database...')}
              </span>
            </motion.div>

            <motion.h1 variants={fadeInUp} className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-8 text-white">
              {t('landing.headlineLine1', 'The Edge')} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-600">
                {t('landing.headlineLine2', "You're Missing.")}
              </span>
            </motion.h1>

            <motion.p variants={fadeInUp} className="text-lg md:text-xl text-gray-400 max-w-xl mb-12 leading-relaxed font-medium">
              {t('landing.subheadline', 'We combine visual surface physics (BSI), institutional-grade data, and proprietary neural networks to expose market inefficiencies.')}
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
              <button 
                onClick={handleStartAnalysis}
                className="group relative px-8 py-4 bg-tennis-lime text-black font-black text-sm uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-transform shadow-[0_0_30px_rgba(204,255,0,0.3)] hover:shadow-[0_0_50px_rgba(204,255,0,0.5)] transform-gpu flex items-center justify-center"
              >
                <span>{t('landing.startAnalysis', 'Start Analysis')}</span>
                <ArrowRight className="inline-block ml-2 group-hover:translate-x-1 transition-transform" size={16} />
              </button>
              
              <button 
                onClick={() => setShowExplainer(true)}
                id="how-it-works"
                className="px-8 py-4 bg-transparent border border-white/10 text-white font-bold text-sm uppercase tracking-widest rounded-xl hover:bg-white/5 transition-colors transform-gpu flex items-center justify-center"
              >
                {t('landing.howItWorks', 'How it works')}
              </button>
            </motion.div>

            <motion.div variants={fadeInUp} className="mt-12">
              <PartnerBadge variant="compact" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 🚀 SOTA: NEO.bet Partner- und Banner-Showcase */}
      <section className="py-8 px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <PartnerBadge variant="full" className="lg:col-span-2" />
          <NeoBetBanner size="200x200" className="w-full h-full" />
        </div>
      </section>

      <section className="py-20 px-6 bg-[#0f1115]">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16 md:flex justify-between items-end border-b border-white/5 pb-8 text-center md:text-left">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter mb-2 text-white">{t('landing.gridTitle', 'Intelligence Grid')}</h2>
              <p className="text-gray-500 text-sm font-medium">{t('landing.gridSubtitle', 'Real-time processing of complex tennis metrics.')}</p>
            </div>
            <div className="hidden md:block text-right">
                <div className="text-[10px] font-mono text-gray-600 bg-white/5 px-2.5 py-1 rounded">{t('landing.gridStatus', 'STATUS: OPERATIONAL')}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="md:col-span-2 bg-[#15171e] border border-white/5 rounded-[2rem] p-8 relative overflow-hidden group hover:border-white/10 transition-colors min-h-[400px] flex flex-col justify-between">
               <div className="absolute top-0 right-0 p-40 bg-tennis-lime/5 blur-[100px] rounded-full transition-all group-hover:bg-tennis-lime/10 pointer-events-none transform-gpu"></div>
               <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-start justify-between">
                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5 backdrop-blur-md mb-8">
                      <BrainCircuit className="text-tennis-lime" size={28} />
                    </div>
                    <span className="text-[10px] font-mono text-gray-500 border border-white/5 px-2.5 py-1 rounded bg-black/20">{t('landing.modelType', 'AI MODEL: DEEP LEARNING')}</span>
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-black mb-3 text-white uppercase tracking-tight">{t('landing.scoutIntelTitle', 'Professional Scout Intel')}</h3>
                    <p className="text-sm text-gray-400 max-w-md leading-relaxed font-medium">
                      {t('landing.scoutIntelDesc', 'Our system generates comprehensive "Raw Intel" reports. It evaluates tactical matchups, historical performance, and real-time form to predict outcomes with high confidence.')}
                    </p>
                  </div>

                  <div className="mt-8 p-5 bg-black/40 rounded-2xl border border-white/5 backdrop-blur-sm shadow-xl">
                      <div className="flex gap-1.5 mb-3 opacity-50">
                         <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
                         <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
                         <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
                      </div>
                      <div className="space-y-2 font-mono text-[10px] text-gray-400">
                         <p>&gt; Analyzing surface friction...</p>
                         <p>&gt; <span className="text-tennis-lime">BSI Detected:</span> 8.4 (Fast Hard)</p>
                         <p>&gt; Calculating Win Probability...</p>
                         <p className="text-white animate-pulse">&gt; Alpha Detected: +12.4% on Player A</p>
                      </div>
                  </div>
               </div>
            </div>

            <div className="space-y-4">
              <div className="bg-[#15171e] border border-white/5 rounded-[2rem] p-8 relative overflow-hidden group hover:border-white/10 transition-colors h-1/2 flex flex-col justify-between">
                 <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 to-transparent pointer-events-none transform-gpu"></div>
                 <div className="bg-white/5 w-fit p-3 rounded-2xl border border-white/5 backdrop-blur-md mb-4">
                   <Eye className="text-blue-400" size={24} />
                 </div>
                 <div>
                   <h3 className="text-xl font-black mb-2 text-white uppercase tracking-tight">{t('landing.visualBsiTitle', 'Visual BSI')}</h3>
                   <p className="text-xs text-gray-500 leading-relaxed font-medium">{t('landing.visualBsiDesc', 'We analyze video feeds to determine the actual Bounce Speed Index of the court.')}</p>
                 </div>
              </div>

              <div className="bg-[#15171e] border border-white/5 rounded-[2rem] p-8 relative overflow-hidden group hover:border-white/10 transition-colors h-1/2 flex flex-col justify-between">
                 <div className="absolute inset-0 bg-gradient-to-t from-purple-500/5 to-transparent pointer-events-none transform-gpu"></div>
                 <div className="bg-white/5 w-fit p-3 rounded-2xl border border-white/5 backdrop-blur-md mb-4">
                   <Activity className="text-purple-400" size={24} />
                 </div>
                 <div>
                   <h3 className="text-xl font-black mb-2 text-white uppercase tracking-tight">{t('landing.marketPulseTitle', 'Market Pulse')}</h3>
                   <p className="text-xs text-gray-500 leading-relaxed font-medium">{t('landing.marketPulseDesc', 'Aggregating market data to identify probability discrepancies against our neural models.')}</p>
                 </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 🚀 SOTA FIX: Komplett bereinigter Footer ohne doppelte Links */}
      <footer className="py-20 px-6 text-center bg-[#0f1115]">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-10">
          <div className="opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              <BrandLogo className="h-6 text-white" />
          </div>
          
          <div className="max-w-3xl flex flex-col items-center gap-8">
            <div className="flex flex-wrap justify-center gap-4 w-full">
              {paymentMethods.map((method) => (
                <div key={method.name} className="flex items-center justify-center px-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl hover:bg-white/[0.06] hover:border-white/20 transition-all cursor-default group transform-gpu h-10 w-16">
                  {method.icon}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 h-7">
              <ShieldCheck size={12} className="text-tennis-lime" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('landing.securityTitle', 'Enterprise Grade Data Security')}</span>
            </div>
            
            <p className="text-[10px] text-gray-500 leading-relaxed font-medium tracking-wide">
              {t('landing.disclaimer', 'BACKHAND.DTL is a data analytics platform for informational purposes only. We are not a bookmaker, do not accept bets, and do not provide financial advice. Historical player data and matchup statistics are powered by data from Jeff Sackmann (CC BY-NC-SA 4.0, non-commercial only). Sports analysis involves risk. Please use responsibly.')}
            </p>
            <p className="text-[10px] text-gray-500 font-semibold tracking-wider mt-4">
              {t('landing.regulatory', 'Offiziell lizenziert (Whitelist) | Spielteilnahme ab 18 Jahren | Glücksspiel kann süchtig machen | Hilfe unter check-dein-spiel.de / buwei.de | BZgA: 0800 1 37 27 00')}
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}