import { useState, useEffect } from 'react';
import { 
  motion, 
  AnimatePresence, 
  useMotionValue, 
  useSpring, 
  useTransform, 
  useMotionTemplate 
} from 'framer-motion';
import { 
  Gift, 
  Loader2, 
  Sparkles, 
  Crown, 
  Zap, 
  Sun, 
  ShieldCheck, 
  Copy,
  LucideIcon
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAccess } from '../hooks/useAccess'; 

// --- 🎨 ASSETS (High-Performance SVGs) ---

// Abstrakte Stadion-Silhouette (Jetzt für das WEEKEND TIER)
const StadiumSilhouettePattern = () => (
  <svg className="absolute inset-0 w-full h-full opacity-30 mix-blend-overlay pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" preserveAspectRatio="none">
    <defs>
      <linearGradient id="stadiumGrad" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" style={{ stopColor: '#00c6ff', stopOpacity: 0.3 }} />
        <stop offset="100%" style={{ stopColor: '#0072ff', stopOpacity: 0 }} />
      </linearGradient>
    </defs>
    <path fill="url(#stadiumGrad)" d="M0,250 L0,180 C50,160 150,120 200,120 C250,120 350,160 400,180 L400,250 Z" />
    <path fill="none" stroke="rgba(0,198,255,0.4)" strokeWidth="0.5" d="M0,170 C50,150 150,110 200,110 C250,110 350,150 400,170" />
    <circle cx="50" cy="100" r="1.5" fill="#ccff00" opacity="0.8" />
    <circle cx="350" cy="100" r="1.5" fill="#ccff00" opacity="0.8" />
  </svg>
);

// --- 🎨 DESIGN SYSTEM CONFIGURATION ---

interface ThemeConfig {
  id: string;
  background: string;
  surfaceTexture: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  icon: LucideIcon | React.FC<any>;
  label: string;
  customBackgroundElement?: React.ReactNode;
}

const CARD_THEMES: Record<string, ThemeConfig> = {
  FREE: {
    id: 'free',
    background: "bg-gradient-to-br from-neutral-900 via-[#111] to-black",
    surfaceTexture: "opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]",
    border: "border-white/10",
    textPrimary: "text-gray-200",
    textSecondary: "text-gray-500",
    accent: "bg-gray-700",
    icon: Zap,
    label: "FREE TIER"
  },
  WEEKEND: { 
    id: 'weekend',
    background: "bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-[#00c6ff] via-[#003A5D] to-[#000b1a]", 
    surfaceTexture: "opacity-15 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]",
    border: "border-[#00c6ff]/40 shadow-[0_0_30px_-5px_rgba(0,198,255,0.5)]",
    textPrimary: "text-white",
    textSecondary: "text-cyan-200/70",
    accent: "bg-[#00c6ff]",
    icon: Sun,
    label: "WEEKEND PASS",
    customBackgroundElement: <StadiumSilhouettePattern />
  },
  ELITE: { 
    id: 'elite',
    background: "bg-gradient-to-br from-[#4a3b00] via-[#745e00] to-[#2e2400]",
    surfaceTexture: "opacity-10 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')]",
    border: "border-yellow-500/30 shadow-[0_0_15px_-3px_rgba(234,179,8,0.3)]",
    textPrimary: "text-yellow-50",
    textSecondary: "text-yellow-200/50",
    accent: "bg-yellow-500",
    icon: Crown,
    label: "ELITE ACCESS"
  },
  PREMIUM: { 
    id: 'premium',
    background: "bg-gradient-to-br from-indigo-950 via-purple-900 to-fuchsia-950",
    surfaceTexture: "opacity-30 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]",
    border: "border-fuchsia-400/30 shadow-[0_0_20px_-5px_rgba(192,38,211,0.4)]",
    textPrimary: "text-white",
    textSecondary: "text-fuchsia-200/70",
    accent: "bg-fuchsia-500",
    icon: Sparkles,
    label: "PREMIUM TIER"
  },
  ADMIN: { 
    id: 'admin',
    background: "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-900 via-gray-950 to-black", 
    surfaceTexture: "opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]",
    border: "border-red-500/50 shadow-[0_0_30px_-5px_rgba(220,38,38,0.5)]",
    textPrimary: "text-white",
    textSecondary: "text-red-400/80",
    accent: "bg-red-600",
    icon: ShieldCheck, 
    label: "SYSTEM ARCHITECT"
  }
};

// --- 💎 SUB-COMPONENTS ---

const PremiumSheen = () => {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-[24px]">
            <div 
                className="absolute inset-[-100%] top-[-50%] bottom-[-50%] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] animate-sheen-sweep mix-blend-overlay"
                style={{ width: '200%' }}
            />
            <div 
                className="absolute inset-[-100%] top-[-50%] bottom-[-50%] bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-20deg] animate-sheen-sweep-delayed mix-blend-color-dodge"
                style={{ width: '200%' }}
            />
        </div>
    );
};

const AnimatedBrandLogo = ({ className, watermark = false }: { className?: string, watermark?: boolean }) => {
    const uid = watermark ? "wm" : "main";
    return (
        <svg viewBox="0 0 650 400" className={`${className} overflow-visible`}>
            <defs>
                <linearGradient id={`chromeGrad-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                    <stop offset="40%" stopColor="#e5e7eb" stopOpacity="1" />
                    <stop offset="100%" stopColor="#9ca3af" stopOpacity="1" />
                </linearGradient>
                <linearGradient id={`vibrantBladeGrad-${uid}`} x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#65a30d" /> 
                    <stop offset="40%" stopColor="#ccff00" />
                    <stop offset="80%" stopColor="#d9f99d" /> 
                    <stop offset="100%" stopColor="#ffffff" /> 
                </linearGradient>
                <filter id={`greenGlow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#ccff00" floodOpacity="0.6" />
                </filter>
                <path id={`bladeShape-${uid}`} d="M 20 380 Q 325 235 630 40 L 635 35 Q 325 265 15 390 Z" />
                <g id={`baseLogo-${uid}`}>
                   <path d="M 60 80 L 250 80 C 300 80 320 90 320 130 C 320 160 300 180 270 185 C 310 190 330 220 330 270 C 330 320 290 340 220 340 L 20 340 L 60 80 Z M 115 130 L 105 180 L 210 180 C 240 180 250 170 250 155 C 250 140 240 130 210 130 L 115 130 Z M 100 230 L 90 290 L 210 290 C 240 290 250 280 250 260 C 250 240 240 230 210 230 L 100 230 Z" />
                   <path d="M 420 80 L 500 80 L 470 190 L 540 190 L 570 80 L 650 80 L 560 340 L 480 340 L 450 240 L 380 240 L 350 340 L 270 340 L 300 240 L 330 130 L 360 80 L 410 80 Z" />
                </g>
                {!watermark && (
                    <>
                        <mask id={`revealBladeMask-${uid}`}>
                            <path d="M 20 380 Q 325 240 630 40" fill="none" stroke="white" strokeWidth="70" strokeLinecap="round" className="animate-blade-mask" strokeDasharray="0 1000" />
                        </mask>
                        <mask id={`maskTopSplit-${uid}`}>
                            <rect x="-100" y="-100" width="850" height="600" fill="white" />
                            <path d="M 20 380 Q 325 240 630 40 L 650 600 L -100 600 Z" fill="black" />
                        </mask>
                        <mask id={`maskBottomSplit-${uid}`}>
                            <rect x="-100" y="-100" width="850" height="600" fill="black" />
                            <path d="M 20 395 Q 325 255 630 55 L 650 600 L -100 600 Z" fill="white" />
                        </mask>
                    </>
                )}
            </defs>
            {watermark ? (
                 <g opacity="0.1">
                    <use href={`#baseLogo-${uid}`} fill={`url(#chromeGrad-${uid})`} />
                    <use href={`#bladeShape-${uid}`} fill={`url(#vibrantBladeGrad-${uid})`} />
                 </g>
            ) : (
                <>
                    <g mask={`url(#maskTopSplit-${uid})`} fill={`url(#chromeGrad-${uid})`} className="animate-split-top origin-center">
                        <use href={`#baseLogo-${uid}`} />
                    </g>
                    <g mask={`url(#maskBottomSplit-${uid})`} fill={`url(#chromeGrad-${uid})`} className="animate-split-bottom origin-center">
                        <use href={`#baseLogo-${uid}`} />
                    </g>
                    <g mask={`url(#revealBladeMask-${uid})`}>
                        <use href={`#bladeShape-${uid}`} fill={`url(#vibrantBladeGrad-${uid})`} filter={`url(#greenGlow-${uid})`} />
                        <path d="M 20 380 Q 325 235 630 40" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" style={{ mixBlendMode: 'overlay' }} />
                    </g>
                </>
            )}
        </svg>
    );
};

interface MemberCardProps {
  user: any;
  profile: any;
  onRefresh: () => void;
  forcedVariant?: string; 
  hideRedeem?: boolean; 
}

export function MemberCard({ user, profile, onRefresh, forcedVariant, hideRedeem }: MemberCardProps) {
  // 🚀 SOTA FIX 1: Self-Healing Live State + Loading Guard
  const [liveProfile, setLiveProfile] = useState<any>(profile || null);
  const [isReady, setIsReady] = useState(false);
  
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemStatus, setRedeemStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [redeemMsg, setRedeemMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const { isAdmin } = useAccess();

  // Animations
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useSpring(x, { stiffness: 150, damping: 15 });
  const mouseY = useSpring(y, { stiffness: 150, damping: 15 });
  const rotateX = useTransform(mouseY, [-0.5, 0.5], ["12deg", "-12deg"]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-12deg", "12deg"]);
  const glareX = useTransform(mouseX, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(mouseY, [-0.5, 0.5], ["0%", "100%"]);
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.3) 0%, transparent 50%)`;

  // 🚀 SOTA FIX 1.5: Holt 100% korrekte Daten beim Mount, BEVOR gerendert wird
  useEffect(() => {
      const fetchRealData = async () => {
          if (user?.id) {
              const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
              if (data) setLiveProfile(data);
          }
          setIsReady(true);
      };
      fetchRealData();
  }, [user?.id]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleMouseLeave() {
    x.set(0); y.set(0);
  }

  // --- 🚀 SOTA FIX 2: THEME RESOLVER (Live Daten) ---
  const actualTier = liveProfile?.tier ? String(liveProfile.tier).toUpperCase().trim() : 'FREE';
  
  let themeKey = actualTier;
  if (forcedVariant) themeKey = forcedVariant;
  if (liveProfile?.special_badge) themeKey = liveProfile.special_badge;
  if (isAdmin) themeKey = 'ADMIN'; 
  
  if (!CARD_THEMES[themeKey]) themeKey = 'FREE';
  
  const theme = CARD_THEMES[themeKey];
  const IconComponent = theme.icon;
  const isCustomIcon = typeof theme.icon === 'function';

  // --- 🚀 SOTA FIX 3: EXPIRY DATE LOGIC ---
  const formatExpiryDate = () => {
      if (actualTier === 'FREE' || !liveProfile?.premium_until) return 'NO ACTIVE PASS';
      
      try {
          const expiry = new Date(liveProfile.premium_until);
          if (isNaN(expiry.getTime())) return 'NO ACTIVE PASS';
          if (expiry.getFullYear() > 2090) return 'LIFETIME';
          
          return expiry.toLocaleDateString('en-US', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
          }).toUpperCase();
      } catch (e) {
          return 'NO ACTIVE PASS';
      }
  };

  // --- 🚀 SOTA FIX 4: SUPPORT ID LOGIC (Lemon Squeezy Prio & Float-Cutter) ---
  const formatLSId = (id: any) => {
      if (!id) return null;
      return Math.trunc(Number(id)); // Macht aus 7901588.0 -> 7901588
  };
  
  const customerId = formatLSId(liveProfile?.ls_customer_id);
  const displayId = customerId ? `LS-${customerId}` : `UID-${user?.id?.split('-')[0].toUpperCase() || '0000'}`;
  const idToCopy = customerId ? String(customerId) : user?.id;

  const handleCopyId = () => {
    if (idToCopy) {
        navigator.clipboard.writeText(idToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  // --- 🚀 SOTA FIX 5: UNLIMITED CREDITS LOGIC ---
  const displayCredits = () => {
      // Wenn der User NICHT Free ist (also Weekend, Premium oder Elite), bekommt er IMMER "UNLIMITED"
      if (isAdmin || actualTier !== 'FREE') return 'UNLIMITED';
      return liveProfile?.credits ?? 0;
  };

  const handleRedeem = async () => {
    if(!redeemCode.trim()) return;
    setRedeemStatus('loading');
    try {
        const { data, error } = await supabase.rpc('redeem_promo_code', { input_code: redeemCode.toUpperCase().trim() });
        if (error) throw error;
        if (data && data.success) {
            setRedeemStatus('success');
            setRedeemMsg(`+${data.value} ${data.type === 'credits' ? 'Credits' : 'Days'}`);
            onRefresh();
            
            // Re-Fetch für Live-Update
            if (user?.id) {
                const { data: newData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                if (newData) setLiveProfile(newData);
            }
            
            setRedeemCode('');
            setTimeout(() => { setRedeemStatus('idle'); setRedeemMsg(''); }, 3000);
        } else {
            setRedeemStatus('error');
            setRedeemMsg(data?.message || 'Invalid Code');
            setTimeout(() => setRedeemStatus('idle'), 3000);
        }
    } catch (e: any) {
        setRedeemStatus('error');
        setRedeemMsg(e.message);
        setTimeout(() => setRedeemStatus('idle'), 3000);
    }
  };

  // 🚀 SOTA FIX 6: LOADING GUARD (Verhindert das Flackern falscher Karten komplett)
  if (!isReady) {
      return (
          <div className="w-full max-w-md mx-auto aspect-[1.586/1] rounded-[24px] bg-[#0A0A0A] border border-white/5 animate-pulse flex flex-col items-center justify-center shadow-2xl">
              <Loader2 size={28} className="animate-spin text-white/20 mb-3" />
              <span className="text-[10px] text-white/30 font-mono uppercase tracking-widest">Decrypting Pass...</span>
          </div>
      );
  }

  return (
    <div className="w-full max-w-md mx-auto perspective-1000 group">
      <style>{`
        @keyframes sheen-sweep { 0% { transform: translateX(-100%) skewX(-20deg); } 100% { transform: translateX(200%) skewX(-20deg); } }
        @keyframes sheen-sweep-delayed { 0% { transform: translateX(-100%) skewX(-20deg); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateX(200%) skewX(-20deg); opacity: 0; } }
        @keyframes blade-mask { 0% { stroke-dasharray: 0 1000; } 100% { stroke-dasharray: 1000 0; } }
        @keyframes split-top { 0% { transform: translate(0, 0); } 50% { transform: translate(-2px, -2px); } 100% { transform: translate(0, 0); } }
        @keyframes split-bottom { 0% { transform: translate(0, 0); } 50% { transform: translate(2px, 2px); } 100% { transform: translate(0, 0); } }
        .animate-sheen-sweep { animation: sheen-sweep 4s ease-in-out infinite; }
        .animate-sheen-sweep-delayed { animation: sheen-sweep-delayed 4s ease-in-out infinite; animation-delay: 0.2s; }
        .perspective-1000 { perspective: 1000px; }
        .group:hover .animate-blade-mask { animation: blade-mask 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .group:hover .animate-split-top { animation: split-top 1s ease-out forwards; }
        .group:hover .animate-split-bottom { animation: split-bottom 1s ease-out forwards; }
      `}</style>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative aspect-[1.586/1] w-full transition-transform duration-200 ease-out"
      >
        <div className="absolute inset-4 rounded-[2rem] bg-black/50 blur-2xl -z-20 transform translate-y-10 scale-90 transition-opacity duration-500 group-hover:opacity-80 opacity-40" />

        <div className={`
          relative w-full h-full rounded-[24px] overflow-hidden 
          flex flex-col justify-between p-6 md:p-8
          border ${theme.border}
          ${theme.background}
          shadow-2xl backdrop-blur-xl
        `}>
            {theme.customBackgroundElement && (
                <div className="absolute inset-0 z-0">
                    {theme.customBackgroundElement}
                </div>
            )}

            <div className="absolute -right-16 -bottom-16 w-64 h-64 opacity-[0.07] pointer-events-none mix-blend-overlay rotate-[-12deg] z-0">
                <AnimatedBrandLogo watermark={true} className="w-full h-full" />
            </div>

            <div className={`absolute inset-0 pointer-events-none z-0 mix-blend-overlay ${theme.surfaceTexture}`} />
            
            <motion.div 
                className="absolute inset-0 pointer-events-none z-10 mix-blend-overlay opacity-50"
                style={{ background: glareBackground }}
            />

            <PremiumSheen />

            {/* --- TOP ROW --- */}
            <div className="relative z-20 flex justify-between items-start" style={{ transform: "translateZ(20px)" }}>
                {/* LEFT: ISSUER BRAND */}
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 relative filter drop-shadow-lg flex items-center justify-center">
                         <AnimatedBrandLogo className="w-full h-full" />
                    </div>
                    <div className="flex flex-col">
                        <span className={`text-[10px] uppercase tracking-[0.2em] font-semibold opacity-80 ${theme.textSecondary}`}>BH.PASS</span>
                        <span className={`text-xs font-black uppercase tracking-wide ${theme.textPrimary} drop-shadow-sm`}>{theme.label}</span>
                    </div>
                </div>

                {/* RIGHT: PARTNER / TIER LOGO */}
                <div className={`flex items-center justify-center transition-all relative z-50
                      ${isCustomIcon 
                        ? '-mt-1 -mr-1'
                        : 'p-2 rounded-full border backdrop-blur-md bg-white/10 border-white/20 shadow-inner'
                      }`}>
                    
                      {isCustomIcon ? (
                        <IconComponent className={`${theme.textPrimary} drop-shadow-xl`} />
                      ) : (
                        <IconComponent className={theme.textPrimary} size={20} />
                      )}
                </div>
            </div>

            {/* --- MIDDLE: IDENTITY --- */}
            <div className="relative z-20 mt-auto mb-auto pt-4 flex flex-col justify-center" style={{ transform: "translateZ(30px)" }}>
                <div className={`text-[11px] uppercase tracking-[0.15em] font-semibold ${theme.textSecondary} mb-1 pl-0.5`}>
                    Authorized Member
                </div>
                
                <div onClick={handleCopyId} className="group/id cursor-pointer w-fit">
                    <div className={`font-mono text-xl md:text-2xl font-bold tracking-tight ${theme.textPrimary} flex items-center gap-3 transition-all hover:scale-[1.02] origin-left`}>
                        <span className="truncate max-w-[280px]">
                             {user?.email?.split('@')[0].toUpperCase() || 'GHOST_USER'}
                        </span>
                        {isAdmin && <ShieldCheck className="text-white/40" size={18} />}
                    </div>
                    <div className={`flex items-center gap-2 mt-1 ${theme.textSecondary} group-hover/id:text-white transition-colors`}>
                        <span className="font-mono text-[10px] tracking-widest opacity-70">
                            ID: {displayId}
                        </span>
                         <span className="opacity-0 group-hover/id:opacity-100 transition-opacity text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white flex items-center gap-1">
                             {copied ? 'COPIED' : <><Copy size={8} /> COPY</>}
                        </span>
                    </div>
                </div>
            </div>

            {/* --- BOTTOM ROW: METRICS --- */}
            <div className="relative z-20 flex justify-between items-end border-t border-white/10 pt-4" style={{ transform: "translateZ(25px)" }}>
                <div>
                    <span className={`block text-[9px] uppercase tracking-wider font-bold mb-0.5 ${theme.textSecondary}`}>Valid Thru</span>
                    <span className={`font-mono text-sm font-semibold tracking-wider ${theme.textPrimary}`}>
                        {formatExpiryDate()}
                    </span>
                </div>
                <div className="text-right">
                    <span className={`block text-[9px] uppercase tracking-wider font-bold mb-0.5 ${theme.textSecondary}`}>Available Credits</span>
                    <div className="flex items-center justify-end gap-1.5">
                        <span className={`font-mono text-xl font-bold ${theme.textPrimary} tracking-tight`}>
                            {displayCredits()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
      </motion.div>

      {/* --- REDEEM TERMINAL --- */}
      {!hideRedeem && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 relative group max-w-[90%] mx-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative bg-[#0A0A0A] border border-white/10 rounded-xl flex items-center p-1.5 shadow-2xl overflow-hidden focus-within:border-white/30 transition-colors">
                <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors duration-300
                    ${redeemStatus === 'error' ? 'bg-red-500' : redeemStatus === 'success' ? 'bg-green-500' : 'bg-white/10 group-focus-within:bg-green-500'}
                `} />
                <div className="pl-4 pr-3 text-gray-500">
                    {redeemStatus === 'loading' ? <Loader2 size={14} className="animate-spin text-white" /> : <Gift size={14} />}
                </div>
                <input 
                    value={redeemCode}
                    onChange={(e) => setRedeemCode(e.target.value)}
                    placeholder="ENTER ACCESS CODE"
                    className="w-full bg-transparent text-white text-[11px] font-mono font-medium tracking-wider py-3 outline-none placeholder-gray-700 uppercase"
                    disabled={redeemStatus === 'loading'}
                    onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
                />
                <button 
                    onClick={handleRedeem}
                    disabled={!redeemCode || redeemStatus === 'loading'}
                    className="bg-white/5 hover:bg-white text-white hover:text-black px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:text-white"
                >
                    {redeemStatus === 'loading' ? 'Syncing...' : 'Apply'}
                </button>
            </div>
            <AnimatePresence>
                {redeemMsg && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className={`mt-2 text-center text-[10px] font-mono uppercase tracking-widest flex items-center justify-center gap-2
                            ${redeemStatus === 'success' ? 'text-green-400' : redeemStatus === 'error' ? 'text-red-400' : 'text-gray-400'}`}
                        >
                            {redeemStatus === 'success' && <Sparkles size={10} />}
                            {redeemMsg}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
          </motion.div>
      )}
    </div>
  );
}