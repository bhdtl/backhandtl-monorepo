import { useState, useEffect, useLayoutEffect } from 'react';
import { safeLocalStorage } from '../lib/storage';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { BrandLogo } from '../components/BrandLogo';
import { 
  Zap, Activity, BrainCircuit, 
  TrendingUp, ArrowRight, X, Database, Eye, Lock, ShieldCheck 
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
      <svg className="w-8 h-4 fill-current text-white/50 group-hover:text-white transition-all duration-300" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z" />
      </svg>
    )
  },
  {
    name: 'Mastercard',
    icon: (
      <svg className="w-8 h-5 fill-current text-white/50 group-hover:text-white transition-all duration-300" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M11.343 18.031c.058.049.12.098.181.146-1.177.783-2.59 1.238-4.107 1.238C3.32 19.416 0 16.096 0 12c0-4.095 3.32-7.416 7.416-7.416 1.518 0 2.931.456 4.105 1.238-.06.051-.12.098-.165.15C9.6 7.489 8.595 9.688 8.595 12c0 2.311 1.001 4.51 2.748 6.031zm5.241-13.447c-1.52 0-2.931.456-4.105 1.238.06.051.12.098.165.15C14.4 7.489 15.405 9.688 15.405 12c0 2.31-1.001 4.507-2.748 6.031-.058.049-.12.098-.181.146 1.177.783 2.588 1.238 4.107 1.238C20.68 19.416 24 16.096 24 12c0-4.094-3.32-7.416-7.416-7.416zM12 6.174c-.096.075-.189.15-.28.231C10.156 7.764 9.169 9.765 9.169 12c0 2.236.987 4.236 2.551 5.595.09.08.185.158.28.232.096-.074.189-.152.28-.232 1.563-1.359 2.551-3.359 2.551-5.595 0-2.235-.987-4.236-2.551-5.595-.09-.08-.184-.156-.28-.231z" />
      </svg>
    )
  },
  {
    name: 'Apple Pay',
    icon: (
      <svg className="w-8 h-4 fill-current text-white/50 group-hover:text-white transition-all duration-300" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.15 4.318a42.16 42.16 0 0 0-.454.003c-.15.005-.303.013-.452.04a1.44 1.44 0 0 0-1.06.772c-.07.138-.114.278-.14.43-.028.148-.037.3-.04.45A10.2 10.2 0 0 0 0 6.222v11.557c0 .07.002.138.003.207.004.15.013.303.04.452.027.15.072.291.142.429a1.436 1.436 0 0 0 .63.63c.138.07.278.115.43.142.148.027.3.036.45.04l.208.003h20.194l.207-.003c.15-.004.303-.013.452-.04.15-.027.291-.071.428-.141a1.432 1.432 0 0 0 .631-.631c.07-.138.115-.278.141-.43.027-.148.036-.3.04-.45.002-.07.003-.138.003-.208l.001-.246V6.221c0-.07-.002-.138-.004-.207a2.995 2.995 0 0 0-.04-.452 1.446 1.446 0 0 0-1.2-1.201 3.022 3.022 0 0 0-.452-.04 10.448 10.448 0 0 0-.453-.003zm0 .512h19.942c.066 0 .131.002.197.003.115.004.25.01.375.032.109.02.2.05.287.094a.927.927 0 0 1 .407.407.997.997 0 0 1 .094.288c.022.123.028.258.031.374.002.065.003.13.003.197v11.552c0 .065 0 .13-.003.196-.003.115-.009.25-.032.375a.927.927 0 0 1-.5.693 1.002 1.002 0 0 1-.286.094 2.598 2.598 0 0 1-.373.032l-.2.003H1.906c-.066 0-.133-.002-.196-.003a2.61 2.61 0 0 1-.375-.032c-.109-.02-.2-.05-.288-.094a.918.918 0 0 1-.406-.407 1.006 1.006 0 0 1-.094-.288 2.531 2.531 0 0 1-.032-.373 9.588 9.588 0 0 1-.002-.197V6.224c0-.065 0-.131.002-.197.004-.114.01-.248.032-.375.02-.108.05-.199.094-.287a.925.925 0 0 1 .407-.406 1.03 1.03 0 0 1 .287-.094c.125-.022.26-.029.375-.032.065-.002.131-.002.196-.003zm4.71 3.7c-.3.016-.668.199-.88.456-.191.22-.36.58-.316.918.338.03.675-.169.888-.418.205-.258.345-.603.308-.955zm2.207.42v5.493h.852v-1.877h1.18c1.078 0 1.835-.739 1.835-1.812 0-1.07-.742-1.805-1.808-1.805zm.852.719h.982c.739 0 1.161.396 1.161 1.089 0 .692-.422 1.092-1.164 1.092h-.979zm-3.154.3c-.45.01-.83.28-1.05.28-.235 0-.593-.264-.981-.257a1.446 1.446 0 0 0-1.23.747c-.527.908-.139 2.255.374 2.995.249.366.549.769.944.754.373-.014.52-.242.973-.242.454 0 .586.242.98.235.41-.007.667-.366.915-.733.286-.417.403-.82.41-.841-.007-.008-.79-.308-.797-1.209-.008-.754.615-1.113.644-1.135-.352-.52-.9-.578-1.09-.593a1.123 1.123 0 0 0-.092-.002zm8.204.397c-.99 0-1.606.533-1.652 1.256h.777c.072-.358.369-.586.845-.586.502 0 .803.266.803.711v.309l-1.097.064c-.951.054-1.488.484-1.488 1.184 0 .72.548 1.207 1.332 1.207.526 0 1.032-.281 1.264-.727h.019v.659h.788v-2.76c0-.803-.62-1.317-1.591-1.317zm1.94.072l1.446 4.009c0 .003-.073.24-.073.247-.125.41-.33.571-.711.571-.069 0-.206 0-.267-.015v.666c.06.011.267.019.335.019.83 0 1.226-.312 1.568-1.283l1.5-4.214h-.868l-1.012 3.259h-.015l-1.013-3.26zm-1.167 2.189v.316c0 .521-.45.917-1.024.917-.442 0-.731-.228-.731-.579 0-.342.278-.56.769-.593z"/>
      </svg>
    )
  },
  {
    name: 'Google Pay',
    icon: (
      <svg className="w-8 h-4 fill-current text-white/50 group-hover:text-white transition-all duration-300" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.963 7.235A3.963 3.963 0 00.422 9.419a3.963 3.963 0 000 3.559 3.963 3.963 0 003.541 2.184c1.07 0 1.97-.352 2.627-.957.748-.69 1.18-1.71 1.18-2.916a4.722 4.722 0 00-.07-.806H3.964v1.526h2.14a1.835 1.835 0 01-.79 1.205c-.356.241-.814.379-1.35.379-1.034 0-1.911-.697-2.225-1.636a2.375 2.375 0 010-1.517c.314-.94 1.191-1.636 2.225-1.636a2.152 2.152 0 011.52.594l1.132-1.13a3.808 3.808 0 00-2.652-1.033zm6.501.55v6.9h.886V11.89h1.465c.603 0 1.11-.196 1.522-.588a1.911 1.911 0 00.635-1.464 1.92 1.92 0 00-.635-1.456 2.125 2.125 0 00-1.522-.598zm2.427.85a1.156 1.156 0 01.823.365 1.176 1.176 0 010 1.686 1.171 1.171 0 01-.877.357H11.35V8.635h1.487a1.156 1.156 0 01.054 0zm4.124 1.175c-.842 0-1.477.308-1.907.925l.781.491c.288-.417.68-.626 1.175-.626a1.255 1.255 0 01.856.323 1.009 1.009 0 01.366.785v.202c-.34-.193-.774-.289-1.3-.289-.617 0-1.11.145-1.479.434-.37.288-.554.677-.554 1.165a1.476 1.476 0 00.525 1.156c.35.308.785.463 1.305.463.61 0 1.098-.27 1.465-.81h.038v.655h.848v-2.909c0-.61-.19-1.09-.568-1.44-.38-.35-.896-.525-1.551-.525zm2.263.154l1.946 4.422-1.098 2.38h.915L24 9.963h-.965l-1.368 3.391h-.02l-1.406-3.39zm-2.146 2.368c.494 0 .88.11 1.156.33 0 .372-.147.696-.44.973a1.413 1.413 0 01-.997.414 1.081 1.081 0 01-.69-.232.708.708 0 01-.293-.578c0-.257.12-.47.363-.647.24-.173.54-.26.9-.26Z"/>
      </svg>
    )
  },
  {
    name: 'PayPal',
    icon: (
      <svg className="w-8 h-4 fill-current text-white/50 group-hover:text-white transition-all duration-300" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M7.016 19.198h-4.2a.562.562 0 0 1-.555-.65L5.093.584A.692.692 0 0 1 5.776 0h7.222c3.417 0 5.904 2.488 5.846 5.5-.006.25-.027.5-.066.747A6.794 6.794 0 0 1 12.071 12H8.743a.69.69 0 0 0-.682.583l-.325 2.056-.013.083-.692 4.39-.015.087zM19.79 6.142c-.01.087-.01.175-.023.261a7.76 7.76 0 0 1-7.695 6.598H9.007l-.283 1.795-.013.083-.692 4.39-.134.843-.014.088H6.86l-.497 3.15a.562.562 0 0 0 .555.65h3.612c.34 0 .63-.249.683-.585l.952-6.031a.692.692 0 0 1 .683-.584h2.126a6.793 6.793 0 0 0 6.707-5.752c.306-1.95-.466-3.744-1.89-4.906z"/>
      </svg>
    )
  },
  {
    name: 'Amex',
    icon: (
      <svg className="w-8 h-4 fill-current text-white/50 group-hover:text-white transition-all duration-300" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.015 14.378c0-.32-.135-.496-.344-.622-.21-.12-.464-.135-.81-.135h-1.543v2.82h.675v-1.027h.72c.24 0 .39.024.478.125.12.13.104.38.104.55v.35h.66v-.555c-.002-.25-.017-.376-.108-.516-.06-.08-.18-.18-.33-.234l.02-.008c.18-.072.48-.297.48-.747zm-.87.407l-.028-.002c-.09.053-.195.058-.33.058h-.81v-.63h.824c.12 0 .24 0 .33.05.098.048.156.147.15.255 0 .12-.045.215-.134.27zM20.297 15.837H19v.6h1.304c.676 0 1.05-.278 1.05-.884 0-.28-.066-.448-.187-.582-.153-.133-.392-.193-.73-.207l-.376-.015c-.104 0-.18 0-.255-.03-.09-.03-.15-.105-.15-.21 0-.09.017-.166.09-.21.083-.046.177-.066.272-.06h1.23v-.602h-1.35c-.704 0-.958.437-.958.84 0 .9.776.855 1.407.87.104 0 .18.015.225.06.046.03.082.106.082.18 0 .077-.035.15-.08.18-.06.053-.15.07-.277.07zM0 0v10.096L.81 8.22h1.75l.225.464V8.22h2.043l.45 1.02.437-1.013h6.502c.295 0 .56.057.756.236v-.23h1.787v.23c.307-.17.686-.23 1.12-.23h2.606l.24.466v-.466h1.918l.254.465v-.466h1.858v3.948H20.87l-.36-.6v.585h-2.353l-.256-.63h-.583l-.27.614h-1.213c-.48 0-.84-.104-1.08-.24v.24h-2.89v-.884c0-.12-.03-.12-.105-.135h-.105v1.036H6.067v-.48l-.21.48H4.69l-.202-.48v.465H2.235l-.256-.624H1.4l-.256.624H0V24h23.786v-7.108c-.27.135-.613.18-.973.18H21.09v-.255c-.21.165-.57.255-.914.255H14.71v-.9c0-.12-.018-.12-.12-.12h-.075v1.022h-1.8v-1.066c-.298.136-.643.15-.928.136h-.214v.915h-2.18l-.54-.617-.57.6H4.742v-3.93h3.61l.518.602.554-.6h2.412c.28 0 .74.03.942.225v-.24h2.177c.202 0 .644.045.903.225v-.24h3.265v.24c.163-.164.508-.24.803-.24h1.89v.24c.194-.15.464-.24.84-.24h1.176V0H0zM21.156 14.955c.004.005.006.012.01.016.01.01.024.01.032.02l-.042-.035zM23.828 13.082h.065v.555h-.065zM23.865 15.03v-.005c-.03-.025-.046-.048-.075-.07-.15-.153-.39-.215-.764-.225l-.36-.012c-.12 0-.194-.007-.27-.03-.09-.03-.15-.105-.15-.21 0-.09.03-.16.09-.204.076-.045.15-.05.27-.05h1.223v-.588h-1.283c-.69 0-.96.437-.96.84 0 .9.78.855 1.41.87.104 0 .18.015.224.06.046.03.076.106.076.18 0 .07-.034.138-.09.18-.045.056-.136.07-.27.07h-1.288v.605h1.287c.42 0 .734-.118.9-.36h.03c.09-.134.135-.3.135-.523 0-.24-.045-.39-.135-.526zM18.597 14.208v-.583h-2.235V16.458h2.235v-.585h-1.57v-.57h1.533v-.584h-1.532v-.51M13.51 8.787h.685V11.6h-.684zM13.126 9.543l-.007.006c0-.314-.13-.5-.34-.624-.217-.125-.47-.135-.81-.135H10.43v2.82h.674v-1.034h.72c.24 0 .39.03.487.12.122.136.107.378.107.548v.354h.677v-.553c0-.25-.016-.375-.11-.516-.09-.107-.202-.19-.33-.237.172-.07.472-.3.472-.75zm-.855.396h-.015c-.09.054-.195.056-.33.056H11.1v-.623h.825c.12 0 .24.004.33.05.09.04.15.128.15.25s-.047.22-.134.266zM15.92 9.373h.632v-.6h-.644c-.464 0-.804.105-1.02.33-.286.3-.362.69-.362 1.11 0 .512.123.833.36 1.074.232.238.645.31.97.31h.78l.255-.627h1.39l.262.627h1.36v-2.11l1.272 2.11h.95l.002.002V8.786h-.684v1.963l-1.18-1.96h-1.02V11.4L18.11 8.744h-1.004l-.943 2.22h-.3c-.177 0-.362-.03-.468-.134-.125-.15-.186-.36-.186-.662 0-.285.08-.51.194-.63.133-.135.272-.165.516-.165zm1.668-.108l.46 1.118v.002h-.93l.466-1.12zM2.38 10.97l.254.628H4V9.393l.972 2.205h.584l.973-2.202.015 2.202h.69v-2.81H6.118l-.807 1.904-.876-1.905H3.343v2.663L2.205 8.787h-.997L.01 11.597h.72l.26-.626h1.39zm-.688-1.705l.46 1.118-.003.002h-.915l.457-1.12zM11.856 13.62H9.714l-.85.923-.825-.922H5.346v2.82H8l.855-.932.824.93h1.302v-.94h.838c.6 0 1.17-.164 1.17-.945l-.006-.003c0-.78-.598-.93-1.128-.93zM7.67 15.853l-.014-.002H6.02v-.557h1.47v-.574H6.02v-.51H7.7l.733.82-.764.824zm2.642.33l-1.03-1.147 1.03-1.108v2.253zm1.553-1.258h-.885v-.717h.885c.24 0 .42.098.42.344 0 .243-.15.372-.42.372zM9.967 9.373v-.586H7.73V11.6h2.237v-.58H8.4v-.564h1.527V9.88H8.4v-.507" />
      </svg>
    )
  }
];

// --- COMPONENT: COOKIE & PRIVACY BANNER ---
function CookieBanner() {
  const { t } = useTranslation();
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
  const { t } = useTranslation();
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
export function LandingPage({ onTriggerAuth, forcedShowQuiz, onQuizClosed, onOpenLegal }: LandingPageProps) {
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
            <motion.div variants={fadeInUp} className="mb-8 inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-3 px-4 py-2.5 sm:py-2 rounded-2xl sm:rounded-full border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-2xl">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-300">
                  {t('landing.systemLive', 'System Live')}
                </span>
              </div>
              <div className="hidden sm:block w-px h-3 bg-white/10"></div>
              <span className="text-[11px] font-mono text-gray-400 text-center">
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
            
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-[10px] font-black uppercase tracking-widest text-gray-500 mt-6 border-t border-white/5 pt-6 w-full">
              <button onClick={() => onOpenLegal('terms')} className="hover:text-tennis-lime transition-colors">Terms</button>
              <button onClick={() => onOpenLegal('privacy')} className="hover:text-tennis-lime transition-colors">Privacy</button>
              <button onClick={() => onOpenLegal('cookies')} className="hover:text-tennis-lime transition-colors">Cookies</button>
              <button onClick={() => onOpenLegal('imprint')} className="hover:text-tennis-lime transition-colors">Imprint</button>
              <button onClick={() => onOpenLegal('ai')} className="hover:text-tennis-lime transition-colors">AI Disclosure</button>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}