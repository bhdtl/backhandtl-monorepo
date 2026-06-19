import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { Check, Zap, Swords, Gauge, Target, Shield, Loader2, Lock, Sparkles, ChevronRight, Radar } from 'lucide-react';
import { MemberCard } from '../components/MemberCard';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LegalModal } from '../components/LegalModal';

// --- 🎨 SOTA ASSETS: BULLETPROOF SIMPLE-ICONS CDN ---
const PAYMENT_METHODS = [
  { name: 'Visa', url: 'https://cdn.simpleicons.org/visa/white', height: 'h-3 md:h-4' },
  { name: 'Mastercard', url: 'https://cdn.simpleicons.org/mastercard', height: 'h-5 md:h-6' },
  { name: 'PayPal', url: 'https://cdn.simpleicons.org/paypal/009CDE', height: 'h-4 md:h-5' },
  { name: 'Apple Pay', url: 'https://cdn.simpleicons.org/applepay/white', height: 'h-5 md:h-6' },
  { name: 'Google Pay', url: 'https://cdn.simpleicons.org/googlepay/white', height: 'h-5 md:h-6' },
  { name: 'CashApp', url: 'https://cdn.simpleicons.org/cashapp/00D632', height: 'h-5 md:h-6' }
];

// --- CONFIGURATION ---
const PREMIUM_FEATURES = [
  { icon: Swords, label: 'Unlimited AI Matchups', desc: 'Deep-learning prediction, expected handicaps & set betting without daily limits.' },
  { icon: Zap, label: 'Live Value Scanner', desc: 'Real-time automated edge detection across 40+ global sportsbooks.' },
  { icon: Target, label: 'High-Yield AI Picks', desc: 'SOTA mathematical expected-value predictions and selections.' },
  { icon: Radar, label: 'Tournament Oracle', desc: 'Draw simulations, bracket analysis, and predictive models.' },
  { icon: Gauge, label: 'Global Court Index', desc: 'Complete database of physical bounce speeds (BSI) for all professional tour courts.' }
];

// 🚀 ORIGINAL: Die Checkout-Links & IDs für ehrliche Nutzer (MIT TRIAL)
const CHECKOUT_LINKS: Record<string, string> = {
  weekend_pass: "https://backhandtl.lemonsqueezy.com/buy/72643f89-212b-4992-b8c0-160984d7b592",
  elite_monthly: "https://backhandtl.lemonsqueezy.com/buy/72643f89-212b-4992-b8c0-160984d7b592",
  premium_yearly: "https://backhandtl.lemonsqueezy.com/buy/72643f89-212b-4992-b8c0-160984d7b592"
};

const VARIANT_IDS: Record<string, string> = {
  weekend_pass: "632313",
  elite_monthly: "632314",
  premium_yearly: "632315"
};

// 🚀 THE VAULT: Die Checkout-Links & IDs für Post-Trial Nutzer (OHNE TRIAL)
const CHECKOUT_LINKS_POST_TRIAL: Record<string, string> = {
  weekend_pass: "https://backhandtl.lemonsqueezy.com/buy/b04c31ff-a9cd-41b2-9cd0-4093b4899a7e",
  elite_monthly: "https://backhandtl.lemonsqueezy.com/buy/b04c31ff-a9cd-41b2-9cd0-4093b4899a7e",
  premium_yearly: "https://backhandtl.lemonsqueezy.com/buy/b04c31ff-a9cd-41b2-9cd0-4093b4899a7e"
};

const VARIANT_IDS_POST_TRIAL: Record<string, string> = {
  weekend_pass: "1485891",
  elite_monthly: "1485892",
  premium_yearly: "1485893"
};

const PLANS = [
  {
    id: 'free',
    tier: 'FREE',
    variant: 'FREE',
    name: 'Free Tier',
    price: '0',
    duration: 'Forever',
    features: ['3 Free AI Matchups', 'Free Player Profile Deep Dives', 'BSI Speed & Style Analytics', 'Scouting Reports & News'],
    cta: 'Stay Free',
    popular: false
  },
  {
    id: 'weekend_pass',
    tier: 'WEEKEND',
    variant: 'WEEKEND',
    name: 'Weekend Pass',
    price: '7.99',
    duration: 'One-Time Payment',
    features: PREMIUM_FEATURES, 
    cta: 'Unlock Weekend Pass',
    popular: false
  },
  {
    id: 'elite_monthly',
    tier: 'ELITE',
    variant: 'ELITE',
    name: 'Elite Access',
    price: '24.99',
    duration: 'Billed Monthly',
    trial: '3-Day Free Trial Active', 
    features: PREMIUM_FEATURES, 
    cta: 'Start 3-Day Free Access',
    popular: true
  },
  {
    id: 'premium_yearly',
    tier: 'PREMIUM',
    variant: 'PREMIUM',
    name: 'Premium Tier',
    price: '199.99',
    duration: 'Billed Yearly',
    features: PREMIUM_FEATURES, 
    cta: 'Claim Annual Premium',
    popular: false
  }
];

export function PricingPage() {
  const [activeIndex, setActiveIndex] = useState(2); 
  const navigate = useNavigate();
  const dragX = useMotionValue(0);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [user, setUser] = useState<any>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [legalModal, setLegalModal] = useState<string | null>(null);
  
  // 🚀 SOTA FIX: Unser dynamischer Gatekeeper-State
  const [hasUsedTrial, setHasUsedTrial] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          
          setUser(session?.user || null);

          // 🚀 SILICON VALLEY DEBUG: Unhandled Promise Rejection Guard
          if (session?.user?.id) {
              const { data: profile, error: profileError } = await supabase
                  .from('profiles')
                  .select('has_used_trial')
                  .eq('id', session.user.id)
                  .maybeSingle(); // maybeSingle verhindert den "Row not found" Crash von .single()

              if (!profileError && profile?.has_used_trial === true) {
                  setHasUsedTrial(true);
              }
          }
      } catch (error) {
          // Lautloser Fallback: Keine Crashes im UI zulassen
          console.error("Auth Fetch Error:", error);
      }
    };
    fetchUser();

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 🚀 SILICON VALLEY DEBUG: Double-Execution Crash Guard für externe Skripte
  useEffect(() => {
      try {
          if (typeof (window as any).createLemonSqueezy === 'function') {
              (window as any).createLemonSqueezy();
          }
      } catch (e) {
          // Externe Skripte können bei Re-Renders kollabieren. Wir fangen das hier ab.
      }
  }, []); // <-- Streng auf [] gesetzt. Darf nur exakt 1x beim Mounten feuern!

  const handleDragEnd = () => {
    const x = dragX.get();
    const threshold = isMobile ? 40 : 70;
    if (x < -threshold && activeIndex < PLANS.length - 1) setActiveIndex(activeIndex + 1);
    else if (x > threshold && activeIndex > 0) setActiveIndex(activeIndex - 1);
  };

  const handleCheckout = () => {
      const plan = PLANS[activeIndex];
      
      if (activeIndex === 0) {
          navigate('/dashboard');
          return;
      }

      if (!user) {
          navigate('/'); 
          return;
      }

      setIsCheckingOut(true);

      try {
          // 🚀 THE GATEKEEPER: Wir entscheiden hier dynamisch, welches Dictionary wir nutzen
          const activeLinks = hasUsedTrial ? CHECKOUT_LINKS_POST_TRIAL : CHECKOUT_LINKS;
          const activeVariants = hasUsedTrial ? VARIANT_IDS_POST_TRIAL : VARIANT_IDS;

          const baseUrl = activeLinks[plan.id];
          const variantId = activeVariants[plan.id];
          
          // Fallback, falls irgendetwas schiefgeht (verhindert undefined URL crashes)
          if (!baseUrl || !variantId) {
              throw new Error("Invalid Plan ID configuration");
          }

          // Wir bauen den String hart und fehlerfrei zusammen.
          const finalUrl = `${baseUrl}?variant=${variantId}&embed=1&checkout[email]=${encodeURIComponent(user.email || '')}&checkout[custom][user_id]=${encodeURIComponent(user.id || '')}`;
          
          // Originaler, funktionierender Redirect
          window.location.href = finalUrl;
      } catch (error) {
          console.error("Checkout Builder Error:", error);
          setIsCheckingOut(false);
          alert("Could not initialize access. Please try again.");
      }
  };
  
  return (
    <div className="min-h-screen bg-[#0f1115] text-white pt-20 md:pt-24 pb-24 md:pb-32 overflow-x-hidden selection:bg-tennis-lime selection:text-black font-sans relative">
      
      <AnimatePresence>
         {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-6 text-center mb-6 md:mb-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6"
        >
          <Shield size={12} className="text-tennis-lime" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Professional Grade Data Hub</span>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-7xl font-black tracking-tighter mb-4 uppercase leading-[0.9]"
        >
          Choose Your <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-tennis-lime via-emerald-400 to-teal-500">Strategic Edge.</span>
        </motion.h1>
      </div>

      <div className="relative h-[340px] md:h-[450px] flex items-center justify-center touch-none mb-2 md:mb-0">
        <motion.div 
          className="flex items-center justify-center w-full h-full relative"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          style={{ x: dragX }}
          onDragEnd={handleDragEnd}
        >
          <AnimatePresence mode="popLayout">
            {PLANS.map((plan, index) => {
              const distance = index - activeIndex;
              const absDistance = Math.abs(distance);
              const isActive = index === activeIndex;

              if (absDistance > 1) return null;

              const offset = isMobile ? 240 : 320; 

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: isActive ? 1 : 0.3,
                    scale: isActive ? 1 : 0.8,
                    x: distance * offset,
                    rotateY: distance * (isMobile ? 15 : 25),
                    z: isActive ? 0 : -150,
                    filter: isActive ? 'blur(0px)' : 'blur(8px)',
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="absolute w-[280px] md:w-[360px] cursor-pointer"
                  style={{ 
                    zIndex: 50 - absDistance,
                    transformStyle: 'preserve-3d'
                  }}
                  onClick={() => setActiveIndex(index)}
                >
                  <MemberCard 
                    user={{ email: user?.email || 'GUEST', id: user?.id }} 
                    profile={{ tier: plan.tier }} 
                    onRefresh={() => {}} 
                    forcedVariant={plan.variant}
                    hideRedeem={true}
                  />
                  
                  {plan.popular && isActive && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-black uppercase px-5 py-2 rounded-full shadow-[0_20px_40px_rgba(255,255,255,0.3)] flex items-center gap-2"
                    >
                      <Sparkles size={12} fill="black" /> Recommended Access
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="flex justify-center gap-2 mb-10 md:mb-16">
        {PLANS.map((_, i) => (
          <div 
            key={i} 
            className={`h-1.5 transition-all duration-500 rounded-full ${i === activeIndex ? 'w-10 bg-tennis-lime shadow-[0_0_15px_#ccff00]' : 'w-2 bg-white/10'}`} 
          />
        ))}
      </div>

      <div className="max-w-xl mx-auto px-6 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8 md:space-y-12"
          >
            <div className="text-center relative">
              {/* 🚀 SOTA FIX: Trial-Badge wird ausgeblendet, falls verbraucht */}
              {PLANS[activeIndex].trial && !hasUsedTrial && (
                 <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center gap-2 mb-5 px-5 py-2 bg-[#ccff00] text-black rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(204,255,0,0.5)]"
                 >
                    <Zap size={14} fill="black" />
                    {PLANS[activeIndex].trial}
                 </motion.div>
              )}
              <div className="text-6xl md:text-8xl font-black tracking-tighter mb-2 flex items-center justify-center gap-2">
                <span className="text-2xl md:text-3xl font-bold text-gray-600 mt-2">€</span>
                {PLANS[activeIndex].price}
              </div>
              <div className="text-xs font-black text-gray-500 uppercase tracking-[0.3em]">
                {PLANS[activeIndex].duration}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {PLANS[activeIndex].features.map((item: any, i: number) => {
                const isString = typeof item === 'string';
                const Icon = isString ? Check : item.icon;
                const label = isString ? item : item.label;
                const desc = isString ? null : item.desc;

                return (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-4 p-4 rounded-[1.5rem] bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-all group"
                  >
                    <div className="p-2 rounded-xl bg-black/40 text-tennis-lime group-hover:scale-110 transition-transform shadow-inner">
                      <Icon size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black uppercase text-white tracking-widest leading-tight">
                        {label}
                      </h4>
                      {desc && <p className="text-[10px] text-gray-500 mt-1 font-medium">{desc}</p>}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="pt-4 flex flex-col gap-8 items-center">
              <button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className={`
                  relative overflow-hidden w-full py-5 md:py-6 rounded-2xl font-black uppercase tracking-[0.25em] text-xs transition-all transform active:scale-[0.98] flex items-center justify-center gap-3
                  ${activeIndex === 0 
                    ? 'bg-transparent border border-white/10 text-gray-500 hover:text-white hover:border-white/20' 
                    : 'bg-white text-black shadow-[0_30px_60px_rgba(255,255,255,0.15)] hover:bg-tennis-lime hover:shadow-[0_20px_40px_rgba(204,255,0,0.3)]'}
                  ${isCheckingOut ? 'opacity-70 pointer-events-none' : ''}
                `}
              >
                {isCheckingOut ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    {/* 🚀 SOTA FIX: Dynamischer CTA-Text */}
                    {hasUsedTrial && PLANS[activeIndex].id === 'elite_monthly' ? 'Upgrade to Elite' : PLANS[activeIndex].cta}
                    <ChevronRight size={16} strokeWidth={3} />
                  </>
                )}
              </button>
              
              {activeIndex !== 0 && (
                <div className="flex flex-col items-center gap-10 w-full">
                   <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 opacity-80">
                      {PAYMENT_METHODS.map((method) => (
                        <img 
                          key={method.name}
                          src={method.url} 
                          alt={method.name} 
                          className={`${method.height} w-auto object-contain transition-transform hover:scale-110`}
                          onError={(e) => {
                             (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ))}
                   </div>

                   <p className="text-[10px] text-gray-600 text-center max-w-[340px] leading-relaxed font-medium">
                      Instant activation via Merchant of Record. 256-bit SSL encryption. <br/>
                      By continuing, you agree to our <button onClick={() => setLegalModal('terms')} className="text-white hover:underline transition-colors">Terms</button> and <button onClick={() => setLegalModal('privacy')} className="text-white hover:underline transition-colors">Privacy Policy</button>.
                   </p>

                   <div className="flex items-center gap-2.5 px-4 py-2 bg-white/[0.02] border border-white/5 rounded-full">
                      <Lock size={12} className="text-tennis-lime" />
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Secured by Lemon Squeezy</span>
                   </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}