import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { BrandLogo } from '../components/BrandLogo';
import { 
  Zap, Activity, BrainCircuit, 
  TrendingUp, ArrowRight, X, Database, Eye, Lock, ShieldCheck, Check, FileText, Scale, Cpu, Cookie, Info, CreditCard 
} from 'lucide-react';
// 🚀 SOTA FIX: Importiere Lenis für das "Butter Smooth Scrolling" aus dem Video
import Lenis from '@studio-freight/lenis';
import { PartnerBadge } from '../components/PartnerBadge';
import { NeoBetBanner } from '../components/NeoBetBanner';

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
const fadeInUp = {
  hidden: { opacity: 0, y: 30, transform: 'translate3d(0, 30px, 0)' },
  visible: { opacity: 1, y: 0, transform: 'translate3d(0, 0px, 0)', transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

// --- COMPONENT: COOKIE & PRIVACY BANNER ---
function CookieBanner() {
  const [isVisible, setIsVisible] = useState(!localStorage.getItem('cookie_consent'));
  
  if (!isVisible) return null;

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'true');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'false');
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
          <Lock size={14} className="text-tennis-lime" /> Data Privacy & Cookies
        </h4>
        <p className="text-[11px] text-gray-400 leading-relaxed mb-4">
          We use proprietary encryption and anonymized analytical models (PostHog) to optimize your experience. Strictly necessary cookies are used for authentication. By continuing, you agree to our institutional privacy standards.
        </p>
        <div className="flex gap-2">
          <button 
            onClick={handleAccept}
            className="flex-1 py-2.5 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-tennis-lime transition-colors"
          >
            Accept All
          </button>
          <button 
            onClick={handleDecline}
            className="flex-1 py-2.5 bg-white/5 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-colors"
          >
            Essential Only
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// 1. HEADER (SMART LOGIN)
function LandingHeader({ onLogin }: { onLogin: () => void }) {
  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center bg-[#0f1115]/80 backdrop-blur-md border-b border-white/5 transition-all will-change-transform"
    >
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth'})}>
        <BrandLogo className="h-6 text-white" />
        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest hidden md:inline-block border border-white/10 px-2 py-0.5 rounded-md">
          v8.6 PRO
        </span>
      </div>
      
      <div className="flex items-center gap-6">
        <a href="#how-it-works" className="text-xs font-bold text-gray-400 hover:text-white transition-colors hidden sm:block">
          How it works
        </a>
        <button 
          onClick={onLogin}
          className="text-xs font-black uppercase tracking-wider bg-white text-black px-5 py-2.5 rounded-lg hover:bg-tennis-lime transition-colors shadow-lg hover:shadow-tennis-lime/20"
        >
          Login
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
            
            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Compiling Alpha Data</h3>
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
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Analysis Step {step}/{totalSteps}</span>
                <button onClick={onClose}><X size={16} className="text-gray-600 hover:text-white transition-colors" /></button>
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
                  <h3 className="text-3xl font-black text-white mb-2 tracking-tighter">Target ROI?</h3>
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
                  <h3 className="text-3xl font-black text-white mb-2 tracking-tighter">Experience?</h3>
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
                  <h3 className="text-3xl font-black text-white mb-4 tracking-tighter">Commitment.</h3>
                  <p className="text-gray-400 text-sm mb-10 leading-relaxed px-2">
                    Neural Scout Pro delivers high-precision market data. To proceed, you must commit to maintaining financial discipline and professional risk management.
                  </p>
                  
                  <button 
                    onClick={handleCommit} 
                    className="w-full py-5 bg-tennis-lime text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(204,255,0,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    I Commit. Show Results.
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
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white">How it Works</h2>
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
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Apple-like easing
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        smoothTouch: false, // Touch devices use native scroll
        touchMultiplier: 2,
      });

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
            <motion.div variants={fadeInUp} className="mb-8 inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-2xl">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">
                  System Live
                </span>
              </div>
              <div className="w-px h-3 bg-white/10"></div>
              <span className="text-[10px] font-mono text-gray-400">
                {playerCount ? `${playerCount.toLocaleString()} Players Tracked` : 'Connecting Database...'}
              </span>
            </motion.div>

            <motion.h1 variants={fadeInUp} className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.95] mb-8 text-white">
              The Edge <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-600">
                You're Missing.
              </span>
            </motion.h1>

            <motion.p variants={fadeInUp} className="text-lg md:text-xl text-gray-400 max-w-xl mb-12 leading-relaxed font-medium">
              We combine visual surface physics (BSI), institutional-grade data, and proprietary neural networks to expose market inefficiencies.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
              <button 
                onClick={handleStartAnalysis}
                className="group relative px-8 py-4 bg-tennis-lime text-black font-black text-sm uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-transform shadow-[0_0_30px_rgba(204,255,0,0.3)] hover:shadow-[0_0_50px_rgba(204,255,0,0.5)] transform-gpu"
              >
                Start Analysis
                <ArrowRight className="inline-block ml-2 group-hover:translate-x-1 transition-transform" size={16} />
              </button>
              
              <button 
                onClick={() => setShowExplainer(true)}
                id="how-it-works"
                className="px-8 py-4 bg-transparent border border-white/10 text-white font-bold text-sm uppercase tracking-widest rounded-xl hover:bg-white/5 transition-colors transform-gpu"
              >
                How it works
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
              <h2 className="text-3xl font-black uppercase tracking-tighter mb-2 text-white">Intelligence Grid</h2>
              <p className="text-gray-500 text-sm">Real-time processing of complex tennis metrics.</p>
            </div>
            <div className="hidden md:block text-right">
                <div className="text-[10px] font-mono text-gray-600 bg-white/5 px-2 py-1 rounded">STATUS: OPERATIONAL</div>
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
                    <span className="text-[9px] font-mono text-gray-500 border border-white/5 px-2 py-1 rounded bg-black/20">AI MODEL: DEEP LEARNING</span>
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-black mb-3 text-white">Professional Scout Intel</h3>
                    <p className="text-sm text-gray-400 max-w-md leading-relaxed">
                      Our system generates comprehensive "Raw Intel" reports. It evaluates tactical matchups, historical performance, and real-time form to predict outcomes with high confidence.
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
                   <h3 className="text-xl font-black mb-2 text-white">Visual BSI</h3>
                   <p className="text-xs text-gray-500 leading-relaxed">We analyze video feeds to determine the actual Bounce Speed Index of the court.</p>
                 </div>
              </div>

              <div className="bg-[#15171e] border border-white/5 rounded-[2rem] p-8 relative overflow-hidden group hover:border-white/10 transition-colors h-1/2 flex flex-col justify-between">
                 <div className="absolute inset-0 bg-gradient-to-t from-purple-500/5 to-transparent pointer-events-none transform-gpu"></div>
                 <div className="bg-white/5 w-fit p-3 rounded-2xl border border-white/5 backdrop-blur-md mb-4">
                   <Activity className="text-purple-400" size={24} />
                 </div>
                 <div>
                   <h3 className="text-xl font-black mb-2 text-white">Market Pulse</h3>
                   <p className="text-xs text-gray-500 leading-relaxed">Aggregating market data to identify probability discrepancies against our neural models.</p>
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
              {[
                { name: 'Visa', color: 'text-blue-500' },
                { name: 'Mastercard', color: 'text-orange-500' },
                { name: 'Apple Pay', color: 'text-white' },
                { name: 'Google Pay', color: 'text-gray-200' },
                { name: 'PayPal', color: 'text-blue-400' },
                { name: 'Amex', color: 'text-cyan-400' }
              ].map((method) => (
                <div key={method.name} className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl hover:bg-white/[0.06] hover:border-white/20 transition-all cursor-default group transform-gpu">
                  <CreditCard size={12} className={`${method.color} transition-transform group-hover:scale-110`} />
                  <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase">{method.name}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
              <ShieldCheck size={12} className="text-tennis-lime" />
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Enterprise Grade Data Security</span>
            </div>
            
            <p className="text-[10px] text-gray-700 leading-relaxed font-medium uppercase tracking-wider">
              BACKHAND.DTL is a data analytics platform for informational purposes only. We are not a bookmaker, do not accept bets, and do not provide financial advice. Historical player data and matchup statistics are powered by data from Jeff Sackmann (CC BY-NC-SA 4.0, non-commercial only). Sports analysis involves risk. Please use responsibly.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}