import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Trophy, 
  Swords, 
  Loader2, 
  FileText, 
  Search, 
  Plus, 
  X, 
  ChevronRight, 
  Lock, 
  Activity, 
  Zap, 
  MapPin, 
  Clock, 
  Target, 
  Gauge, 
  TrendingUp, 
  AlertTriangle, 
  BarChart3, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Circle, 
  BrainCircuit, 
  Shield, 
  Crosshair, 
  MoveHorizontal, 
  Cpu,
  Coins, 
  Crown,
  HelpCircle,
  MousePointerClick,
  Sliders,
  Settings2,
  Bookmark,
  Archive,
  Trash2,
  ArrowRight,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ScrollToTop } from '../components/ScrollToTop';
import { trackEvent } from '../lib/analytics';
import { LoadingScreen } from '../components/LoadingScreen'; 
import { useTranslation } from 'react-i18next';
import { useAccess } from '../hooks/useAccess'; 
import { StyleAnalysis } from '../components/StyleAnalysis'; 
import { BsiSpeedPerformance } from '../components/BsiSpeedPerformance'; 
import { MarketOddsPerformance } from '../components/MarketOddsPerformance'; 
import { motion, AnimatePresence } from 'framer-motion'; 

// Trigger fresh Vercel deployment
// --- CONFIG ---
const FUNCTION_URL = "https://suoaznisiowoolxilaju.supabase.co/functions/v1/smart-api";

// --- VETERAN UPGRADE: COMPLETE TENNIS GEO-MAP (V2.0 - Bugfixes & Expansion) ---
const getCountryISO = (country: string) => {
  if (!country) return 'un';
  
  const cleanCountry = country.trim().toUpperCase();
  
  const map: Record<string, string> = {
    // --- THE ORIGINALS ---
    'INDIA': 'in', 'USA': 'us', 'UNITED STATES': 'us', 'GERMANY': 'de', 
    'FRANCE': 'fr', 'SPAIN': 'es', 'ITALY': 'it', 'UK': 'gb', 
    'UNITED KINGDOM': 'gb', 'GREAT BRITAIN': 'gb', 'SERBIA': 'rs', 
    'GREECE': 'gr', 'POLAND': 'pl', 'SWITZERLAND': 'ch', 'AUSTRIA': 'at', 
    'CANADA': 'ca', 'AUSTRALIA': 'au', 'CROATIA': 'hr', 'NORWAY': 'no', 
    'DENMARK': 'dk', 'JAPAN': 'jp', 'BRAZIL': 'br',

    // --- THE MISSING (RUSSIA, BOSNIA & OTHERS) ---
    'RUSSIA': 'ru', 'BOSNIA': 'ba', 'BOSNIA AND HERZEGOVINA': 'ba', 'BOSNIA & HERZEGOVINA': 'ba',
    'BELARUS': 'by', 'CHINA': 'cn', 'KAZAKHSTAN': 'kz', 'BULGARIA': 'bg',
    'CZECH REPUBLIC': 'cz', 'CZECHIA': 'cz', 'ARGENTINA': 'ar', 'NETHERLANDS': 'nl',
    'BELGIUM': 'be', 'SLOVAKIA': 'sk', 'SOUTH AFRICA': 'za', 'ROMANIA': 'ro',
    'SWEDEN': 'se', 'FINLAND': 'fi', 'PORTUGAL': 'pt', 'CHILE': 'cl', 
    'COLOMBIA': 'co', 'MEXICO': 'mx', 'HUNGARY': 'hu', 'TURKEY': 'tr',
    'LATVIA': 'lv', 'LITHUANIA': 'lt', 'ESTONIA': 'ee', 'UKRAINE': 'ua', 
    'GEORGIA': 'ge', 'SOUTH KOREA': 'kr', 'TAIWAN': 'tw', 'NEW ZEALAND': 'nz', 
    'EGYPT': 'eg', 'TUNISIA': 'tn', 'MOROCCO': 'ma', 'ALGERIA': 'dz', 
    'MONTENEGRO': 'me', 'SLOVENIA': 'si', 'MONACO': 'mc', 'CYPRUS': 'cy', 
    'LUXEMBOURG': 'lu', 'IRELAND': 'ie', 'ICELAND': 'is', 
    
    // --- 🚀 SOTA FIXES: Südamerika Shift-Bug behoben & neue Länder hinzugefügt ---
    'PERU': 'pe', 'ECUADOR': 'ec', 'BOLIVIA': 'bo', 'URUGUAY': 'uy',
    'UZBEKISTAN': 'uz', 'MOLDOVA': 'md', 'ISRAEL': 'il', 'DOMINICAN REPUBLIC': 'do',
    'CHINESE TAIPEI': 'tw', 'SAUDI ARABIA': 'sa', 'UNITED ARAB EMIRATES': 'ae',

    // --- 🌍 DEUTSCHE SPELLINGS (Falls die Scraper-Quelle Deutsch liefert) ---
    'ARGENTINIEN': 'ar', 'BRASILIEN': 'br', 'SPANIEN': 'es', 'ITALIEN': 'it',
    'FRANKREICH': 'fr', 'TSCHECHIEN': 'cz', 'KROATIEN': 'hr', 'SCHWEDEN': 'se',

    // --- 3-LETTER ISO FALLBACKS (oft genutzt in ATP/WTA Daten) ---
    'RUS': 'ru', 'BIH': 'ba', 'SRB': 'rs', 'ESP': 'es', 'FRA': 'fr', 'GER': 'de',
    'ITA': 'it', 'GBR': 'gb', 'SUI': 'ch', 'CAN': 'ca', 'AUS': 'au',
    'ARG': 'ar', 'BRA': 'br', 'JPN': 'jp', 'CHN': 'cn', 'CZE': 'cz', 'POL': 'pl',
    'CRO': 'hr', 'NED': 'nl', 'BEL': 'be', 'AUT': 'at', 'GRE': 'gr', 'BUL': 'bg',
    'ROU': 'ro', 'SWE': 'se', 'FIN': 'fi', 'POR': 'pt', 'CHI': 'cl', 'COL': 'co',
    'MEX': 'mx', 'KAZ': 'kz', 'BLR': 'by', 'UKR': 'ua', 'SVK': 'sk', 'HUN': 'hu',
    'LAT': 'lv', 'LTU': 'lt', 'EST': 'ee', 'GEO': 'ge', 'KOR': 'kr', 'TPE': 'tw',
    'UZB': 'uz', 'MDA': 'md', 'ISR': 'il', 'DOM': 'do', 'RSA': 'za', 'URU': 'uy',
    'ECU': 'ec', 'PER': 'pe', 'BOL': 'bo'
  };
  
  return map[cleanCountry] || 'un'; // 'un' = United Nations (Sicherer Fallback für unbekannte)
};

// --- HELPER: TEXT FORMATTER ---
const renderFormattedText = (text: string) => {
  if (!text) return null;
  return text.split('**').map((part, index) => 
    index % 2 === 1 ? <span key={index} className="font-bold text-white">{part}</span> : part
  );
};

// --- STYLES ---
const style = document.createElement('style');
style.textContent = `
  @keyframes shine-subtle { 0% { transform: translateX(-150%) skewX(-12deg); opacity: 0; } 50% { opacity: 0.3; } 100% { transform: translateX(150%) skewX(-12deg); opacity: 0; } }
  @keyframes glass-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes roll { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  @keyframes border-breathe { 0% { border-color: rgba(132, 204, 22, 0.3); box-shadow: 0 0 0 rgba(132, 204, 22, 0); } 50% { border-color: rgba(132, 204, 22, 0.8); box-shadow: 0 0 15px rgba(132, 204, 22, 0.15); } 100% { border-color: rgba(132, 204, 22, 0.3); box-shadow: 0 0 0 rgba(132, 204, 22, 0); } }
  .animate-silver-glass { background: linear-gradient(110deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0) 60%); background-size: 200% 100%; animation: glass-shimmer 5s infinite linear; }
  .animate-button-shine { animation: shine-subtle 3s infinite ease-in-out; }
  .animate-roll { animation: roll 1s linear infinite; }
  .animate-border-breathe { animation: border-breathe 3s infinite ease-in-out; }
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
  .glass-matrix { background: rgba(21, 23, 30, 0.6); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.05); }
  .no-select { user-select: none; -webkit-user-drag: none; }
`;
document.head.appendChild(style);

// --- INTERFACES ---
interface Player { 
  id: string; 
  first_name: string; 
  last_name: string; 
  country: string; 
  profile_image_url: string; 
  tour: 'ATP' | 'WTA';
  play_style?: string;
  surface_preference?: string;
  surface_ratings?: any;
  form_rating?: any;
}
interface PlayerSkills { player_id: string; serve: number; forehand: number; backhand: number; volley: number; speed: number; power: number; mental: number; stamina: number; overall_rating: number; }
interface ScoutingReport { player_id: string; strengths: string; weaknesses: string; mental_game_notes: string; }
interface PlayerData { player: Player; skills: PlayerSkills | null; report: ScoutingReport | null; }
interface Tournament { id: string; name: string; surface: string; bsi_rating: number; bounce?: string; notes?: string; }
interface AnalysisResult { prediction: string; confidence_score: number; key_factor: string; summary_bullet_points: string[]; deep_dive_text: string; winner_id: string; projectedScore: string; probA: number; }

// --- UI COMPONENTS ---

// 1. PROCESSING INDICATOR
function ProcessingIndicator({ isVisible, progress, statusText }: { isVisible: boolean, progress: number, statusText: string }) {
    if (!isVisible) return null;

    return (
        <div className="w-full max-w-md mx-auto mb-20 md:mb-24 animate-in fade-in duration-300 px-6">
            <div className="flex justify-between items-end mb-3">
                <span className="text-xs md:text-[10px] font-mono text-tennis-lime font-bold uppercase tracking-widest animate-pulse">
                    {statusText}
                </span>
                <span className="text-sm md:text-xs font-mono text-white font-bold">{Math.round(progress)}%</span>
            </div>
            <div className="h-3 md:h-2.5 w-full bg-[#15171e] rounded-full relative border border-white/10 overflow-visible">
                {/* Smooth Progress Track */}
                <motion.div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-tennis-lime/80 to-tennis-lime rounded-full shadow-[0_0_15px_rgba(132,204,22,0.6)] transform-gpu"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: "spring", stiffness: 45, damping: 12, mass: 0.8 }}
                />
                {/* Smooth Floating Tennis Ball */}
                <motion.div
                    className="absolute top-1/2 z-20 transform-gpu"
                    initial={{ left: "0%" }}
                    animate={{ left: `${progress}%` }}
                    style={{ x: "-50%", y: "-50%" }}
                    transition={{ type: "spring", stiffness: 45, damping: 12, mass: 0.8 }}
                >
                    <div className="animate-roll w-6 h-6 md:w-5 md:h-5 rounded-full bg-[#dfff4f] border border-black/30 shadow-lg flex items-center justify-center relative overflow-hidden">
                        <div className="absolute w-[140%] h-[140%] rounded-full border-[1.5px] border-black/20 left-1/2 -top-[20%]"></div>
                        <div className="absolute w-[140%] h-[140%] rounded-full border-[1.5px] border-black/20 right-1/2 -bottom-[20%]"></div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

// 2. ACCESS DENIED MODAL
function AccessDeniedModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const navigate = useNavigate();

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}></div>
            <div className="relative bg-[#15171e] border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-tennis-lime/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-black/40 rounded-full flex items-center justify-center mb-4 border border-white/5">
                        <Lock size={28} className="text-red-500" />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Access Locked</h3>
                    <p className="text-gray-400 text-sm md:text-xs leading-relaxed mb-6 px-4">
                        You have used all <span className="text-white font-bold">3 free evaluation credits</span>.
                        Upgrade your clearance to <span className="text-tennis-lime font-bold">Elite</span> for unlimited neural intelligence and real-time market edges.
                    </p>
                    <div className="w-full space-y-3">
                        <button onClick={() => navigate('/pricing')} className="w-full py-3.5 md:py-3 bg-tennis-lime text-black font-black text-xs uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-transform transform-gpu will-change-transform flex items-center justify-center gap-2 shadow-lg shadow-tennis-lime/20">
                            <Crown size={14} /> Unlock Unlimited
                        </button>
                    </div>
                    <button onClick={onClose} className="mt-4 text-[10px] text-gray-600 font-bold uppercase tracking-widest hover:text-gray-400 transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

// 3. TACTICAL BRIEFING MODAL
function TacticalBriefingModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [step, setStep] = useState(0);
    
    useEffect(() => { if (isOpen) setStep(0); }, [isOpen]);

    if (!isOpen) return null;

    const steps = [
        {
            title: "Select Players",
            desc: "Choose two players from the ATP/WTA database. The system loads their latest performance data and biometrics.",
            icon: <MousePointerClick size={32} className="text-tennis-lime" />
        },
        {
            title: "Configure Court",
            desc: "Select a tournament to load official court speed (BSI). Or use 'Override' to manually set surface & speed.",
            icon: <Settings2 size={32} className="text-blue-400" />
        },
        {
            title: "Analyze & Dominate",
            desc: "Our neural network runs 10,000 simulations to predict the winner, key tactical edges, and dominance metrics.",
            icon: <Zap size={32} className="text-yellow-400" />
        }
    ];

    const nextStep = () => {
        if (step < steps.length - 1) setStep(step + 1);
        else onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose}></div>
            <div className="relative bg-[#1a1d26] border border-white/10 w-full max-w-md rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col items-center text-center">
                
                <div className="flex gap-2 mb-8">
                    {steps.map((_, i) => (
                        <div key={i} className={`h-1.5 w-12 rounded-full transition-all duration-300 ${i <= step ? 'bg-tennis-lime' : 'bg-white/10'}`} />
                    ))}
                </div>

                <div className="h-20 w-20 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center mb-6 shadow-lg shadow-black/50 animate-in zoom-in duration-300" key={step}>
                    {steps[step].icon}
                </div>

                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300" key={`t-${step}`}>{steps[step].title}</h3>
                <p className="text-gray-400 text-sm font-medium leading-relaxed mb-8 h-16 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-75" key={`d-${step}`}>
                    {steps[step].desc}
                </p>

                <button onClick={nextStep} className="w-full py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-transform transform-gpu will-change-transform shadow-lg">
                    {step < steps.length - 1 ? "Next Step" : "Get Started"}
                </button>
            </div>
        </div>
    );
}

const getRatingColor = (val: number) => {
  if (val >= 90) return 'text-[#3b82f6]'; 
  if (val >= 80) return 'text-[#22c55e]'; 
  if (val >= 70) return 'text-[#84cc16]'; 
  if (val >= 60) return 'text-[#facc15]'; 
  return 'text-[#ef4444]'; 
};

const getBarColor = (val: number) => {
  if (val >= 90) return 'bg-[#3b82f6] shadow-[0_0_12px_rgba(59,130,246,0.5)]';
  if (val >= 80) return 'bg-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.5)]';
  if (val >= 70) return 'bg-[#84cc16] shadow-[0_0_10px_rgba(132,204,22,0.4)]';
  if (val >= 60) return 'bg-[#facc15] shadow-[0_0_8px_rgba(250,204,21,0.3)]';
  return 'bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.3)]';
};

function StatBattleBar({ label, valA, valB }: { label: string, valA: number, valB: number }) { 
  const total = (valA + valB) || 1; 
  const perA = Math.round((valA / total) * 100); 
  const colorA = getRatingColor(valA);
  const colorB = getRatingColor(valB);
  const barA = getBarColor(valA);
  const barB = getBarColor(valB);

  return ( 
      <div className="mb-5 md:mb-7 group"> 
          <div className="flex justify-between text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2 transition-colors"> 
              <span className={valA >= valB ? colorA : "text-gray-600"}>{Math.round(valA)} {label}</span>
              <span className={valB >= valA ? colorB : "text-gray-600"}>{label} {Math.round(valB)}</span> 
          </div> 
          <div className="flex h-2 md:h-2 w-full bg-[#0a0a0a] rounded-full overflow-hidden relative border border-white/5"> 
              <div style={{ width: `${perA}%` }} className={`h-full transition-[width] duration-1000 transform-gpu ${barA}`} />
              <div style={{ width: `${100-perA}%` }} className={`h-full transition-[width] duration-1000 transform-gpu ${barB}`} /> 
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-black/50 z-10"></div>
          </div> 
      </div> 
  ); 
}

// --- PLAYER SLOT (REVERTED TO CLEAN DESIGN) ---
function PlayerSlot({ label, player, onClick, onClear, isError }: any) { 
  const { t } = useTranslation();
  
  const emptyStateClasses = isError 
    ? 'border-red-500/50 bg-red-500/5 animate-shake' 
    : 'border-white/5 hover:border-white/20 animate-border-breathe'; 

  const activeClasses = 'border-white/10 hover:border-tennis-lime shadow-xl';

  return ( 
      <div 
        onClick={onClick} 
        className={`group relative w-full aspect-[4/5] md:aspect-[3/4] rounded-2xl md:rounded-[2.5rem] overflow-hidden cursor-pointer border-2 transition-[border-color,box-shadow] duration-500 bg-[#15171e] transform-gpu will-change-transform
        ${player ? activeClasses : emptyStateClasses}`}
      > 
          {player ? ( 
              <> 
                  <img src={player.profile_image_url} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 transform-gpu will-change-transform" alt={player.last_name}/> 
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-90" /> 
                  <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-2 md:top-4 right-2 md:right-4 p-2 md:p-2 rounded-full bg-black/60 text-white hover:bg-red-500 transition-colors z-20 backdrop-blur-md border border-white/10"><X size={14}/></button> 
                  <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8"> 
                      <div className="text-tennis-lime text-[10px] md:text-[10px] font-black uppercase tracking-[0.3em] mb-0.5 md:mb-1">{label}</div> 
                      <div className="text-white font-black text-xl md:text-3xl uppercase leading-none truncate tracking-tighter">{player.last_name}</div> 
                      <div className="text-gray-400 text-[10px] md:text-[10px] font-bold mt-1.5 md:mt-2 uppercase tracking-widest flex items-center gap-1.5 md:gap-2">
                          <img src={`https://flagcdn.com/w20/${getCountryISO(player.country)}.png`} className="w-3.5 h-auto rounded-[1px] grayscale-[0.2]" alt="" />
                          {player.country}
                      </div> 
                  </div> 
              </> 
          ) : ( 
              <div className="flex flex-col items-center justify-center h-full gap-3 md:gap-4 opacity-40 group-hover:opacity-100 transition-all px-2 relative">
                  <div className={`h-10 w-10 md:h-12 w-12 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all relative z-10 ${isError ? 'border-red-500 text-red-500' : 'border-gray-700 group-hover:border-tennis-lime text-gray-500 group-hover:text-tennis-lime'}`}><Plus size={24} /></div> 
                  <span className={`text-[10px] md:text-[10px] font-black uppercase tracking-[0.2em] text-center leading-tight transition-colors ${isError ? 'text-red-500' : 'text-gray-500 group-hover:text-white'}`}>{t('matchup.slots.assign', { label })}</span> 
              </div> 
          )} 
      </div> 
  ); 
}

// --- NEU: APPLE-LIKE PLAYER INTEL BADGES ---
function PlayerIntelBadges({ player, surface }: { player: any, surface: string }) {
    if (!player) return null;

    const safeParse = (str: any) => {
        if (!str) return null;
        if (typeof str === 'object') return str;
        try { return JSON.parse(str); } catch { return null; }
    };

    const formObj = safeParse(player?.form_rating);
    const surfaceObj = safeParse(player?.surface_ratings);
    
    const formScore = formObj?.score ? Number(formObj.score).toFixed(1) : null;

    let surfRating = null;
    let surfColor = '#fff';
    let surfLabel = 'Hard';

    if (surfaceObj && surface) {
        const isClay = surface.toLowerCase().includes('clay');
        const isGrass = surface.toLowerCase().includes('grass');
        const sKey = isClay ? 'clay' : isGrass ? 'grass' : 'hard';
        surfLabel = isClay ? 'Clay' : isGrass ? 'Grass' : 'Hard';
        
        const sData = surfaceObj[sKey];
        if (sData && sData.rating) {
            surfRating = Number(sData.rating).toFixed(1);
            surfColor = sData.color || '#fff';
        }
    }

    // 🚀 SOTA FIX: flex-row mit wrap anstelle von flex-col um Platz auf Mobile zu sparen
    return (
        <div className="flex w-full animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex flex-row flex-wrap justify-center items-start gap-1.5 md:gap-2 w-full">
                {player.play_style && (
                    <div className="flex items-center gap-1.5 bg-[#15171e] border border-white/10 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full shadow-lg">
                        <Target size={10} className="text-gray-400" />
                        <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-gray-200 max-w-[100px] md:max-w-[140px] truncate">
                            {player.play_style.split(',')[0]}
                        </span>
                    </div>
                )}
                {formScore && (
                    <div className="flex items-center gap-1.5 bg-[#15171e] border border-white/10 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full shadow-lg">
                        <Activity size={10} style={{ color: formObj?.color_hex || '#fff' }} />
                        <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white">
                            Form: {formScore}
                        </span>
                    </div>
                )}
                {surfRating && (
                    <div className="flex items-center gap-1.5 bg-[#15171e] border border-white/10 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full shadow-lg">
                        <MapPin size={10} style={{ color: surfColor }} />
                        <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white">
                            {surfLabel}: {surfRating}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

function PlayerSelectModal({ isOpen, onClose, onSelect, players }: any) { 
  const { t } = useTranslation();
  const [search, setSearch] = useState(''); 
  if (!isOpen) return null; 
  const safePlayers = Array.isArray(players) ? players : []; 
  const filtered = safePlayers.filter((p: Player) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase())); 
  
  return ( 
      <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300"> 
          <div className="bg-[#1a1d26] w-full md:max-w-xl h-[85vh] md:h-[700px] rounded-t-[3rem] md:rounded-[2.5rem] flex flex-col border border-white/10 shadow-2xl overflow-hidden"> 
              <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-black/20">
                  <h3 className="text-white font-black uppercase tracking-widest text-xs md:text-sm">{t('matchup.modal.title')}</h3>
                  <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all"><X size={20} /></button>
              </div> 
              <div className="p-4 md:p-8">
                  <div className="relative group">
                      <Search className="absolute left-4 md:left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-tennis-lime transition-colors" size={20} />
                      <input autoFocus type="text" placeholder={t('matchup.modal.search')} className="w-full bg-black/40 text-white pl-12 pr-4 py-4 md:py-4 rounded-xl md:rounded-2xl border border-white/10 outline-none focus:border-tennis-lime transition-all font-bold text-base md:text-lg" value={search} onChange={(e) => setSearch(e.target.value)}/>
                  </div>
              </div> 
              <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-2 md:space-y-3 custom-scrollbar"> 
                  {filtered.map((p: Player) => {
                      const pStyle = p.play_style ? p.play_style.split(',')[0] : null; 
                      return ( 
                          <button key={p.id} onClick={() => { onSelect(p); onClose(); setSearch(''); }} className="w-full flex items-center gap-4 md:gap-5 p-3 md:p-4 hover:bg-white/5 rounded-xl md:rounded-[1.5rem] transition-all text-left group border border-transparent hover:border-white/5"> 
                              {p.profile_image_url ? <img src={p.profile_image_url} className="h-16 w-12 md:h-18 md:w-14 rounded-lg md:rounded-2xl object-cover bg-gray-800 border border-white/10 group-hover:scale-105 transition-transform" /> : <div className="h-16 w-12 md:h-18 md:w-14 rounded-lg md:rounded-2xl bg-gray-800 border border-white/10 flex items-center justify-center text-[10px] font-black tracking-widest uppercase">{t('matchup.modal.noImg')}</div>} 
                              <div className="flex-1">
                                  <div className="text-white font-black uppercase text-base md:text-lg leading-none mb-1 tracking-tighter group-hover:text-tennis-lime transition-colors">{p.last_name}</div>
                                  <div className="flex items-center gap-2 mt-1">
                                      <div className="text-gray-500 text-[10px] md:text-xs font-bold uppercase tracking-widest">
                                          {p.first_name} • <span className="text-white/40">{p.country}</span>
                                      </div>
                                      {pStyle && (
                                          <div className="hidden md:flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-gray-400">
                                              <Target size={8} /> {pStyle}
                                          </div>
                                      )}
                                  </div>
                              </div>
                              <ChevronRight className="text-gray-700 group-hover:text-tennis-lime group-hover:translate-x-1 transition-[color,transform] transform-gpu will-change-transform" size={20} /> 
                          </button> 
                      )
                  })} 
              </div> 
          </div> 
      </div> 
  ); 
}

function OverlappingRadar({ skillsA, skillsB }: { skillsA: any, skillsB: any }) { 
    const { t } = useTranslation();
    if (!skillsA || !skillsB) return null; 
    const size = 260; 
    const center = size/2; 
    const radius = 80; 
    const categories = [
        t('skills.serve'), 
        t('skills.forehand'), 
        t('skills.backhand'), 
        t('skills.speed'), 
        t('skills.mental'), 
        t('skills.power')
    ]; 
    const getPoly = (skills: any) => { 
        const data = [skills.serve, skills.forehand, skills.backhand, skills.speed, skills.mental, skills.power]; 
        return data.map((val, i) => { 
            const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2; 
            const r = ((val || 50) / 100) * radius; 
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`; 
        }).join(' '); 
    }; 
    return ( 
        <div className="flex flex-col items-center py-4"> 
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible"> 
                {[0.25, 0.5, 0.75, 1].map(s => <polygon key={s} points={categories.map((_, i) => `${center + radius * s * Math.cos((Math.PI * 2 * i) / 6 - Math.PI / 2)},${center + radius * s * Math.sin((Math.PI * 2 * i) / 6 - Math.PI / 2)}`).join(' ')} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />)} 
                {categories.map((label, i) => <text key={i} x={center + (radius + 25) * Math.cos((Math.PI * 2 * i) / 6 - Math.PI / 2)} y={center + (radius + 25) * Math.sin((Math.PI * 2 * i) / 6 - Math.PI / 2)} textAnchor="middle" dominantBaseline="middle" fill="#666" fontSize="9" fontWeight="900" style={{textTransform: 'uppercase', letterSpacing: '2px'}}>{label.substring(0, 4)}</text>)} 
                <polygon points={getPoly(skillsB)} fill="rgba(59, 130, 246, 0.15)" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" /> 
                <polygon points={getPoly(skillsA)} fill="rgba(132, 204, 22, 0.15)" stroke="#84cc16" strokeWidth="2.5" strokeLinejoin="round" /> 
            </svg> 
        </div> 
    ); 
}

// --- NEU: HEAD-TO-HEAD COMPARISON HUD (APPLE-STYLE SOTA) ---
function HeadToHeadComparisonHUD({ playerAData, playerBData, surface }: { playerAData: any, playerBData: any, surface: string }) {
    if (!playerAData || !playerBData) return null;

    const getPlayerElo = (skills: any, surf: string) => {
        if (!skills || !skills.elo_metrics) return 1500;
        try {
            const eloObj = typeof skills.elo_metrics === 'string' ? JSON.parse(skills.elo_metrics) : skills.elo_metrics;
            const surfLower = (surf || 'hard').toLowerCase();
            if (surfLower.includes('clay')) return eloObj.clay || 1500;
            if (surfLower.includes('grass')) return eloObj.grass || 1500;
            return eloObj.hard || 1500;
        } catch {
            return 1500;
        }
    };

    const getSurfaceAdvancedStats = (skills: any, surf: string) => {
        if (!skills || !skills.advanced_stats) return null;
        try {
            const parsed = typeof skills.advanced_stats === 'string' ? JSON.parse(skills.advanced_stats) : skills.advanced_stats;
            const timeData = parsed.all || parsed;
            const surfLower = (surf || 'hard').toLowerCase();
            const key = surfLower.includes('clay') ? 'clay' : surfLower.includes('grass') ? 'grass' : 'hard';
            return timeData[key] || timeData.overall || timeData.hard || Object.values(timeData)[0] || null;
        } catch {
            return null;
        }
    };

    const safeParse = (str: any) => {
        if (!str) return null;
        if (typeof str === 'object') return str;
        try { return JSON.parse(str); } catch { return null; }
    };

    const eloA = getPlayerElo(playerAData.skills, surface);
    const eloB = getPlayerElo(playerBData.skills, surface);
    
    const formAObj = safeParse(playerAData.player?.form_rating);
    const formBObj = safeParse(playerBData.player?.form_rating);
    const formA = formAObj?.score ? parseFloat(formAObj.score) : 5.0;
    const formB = formBObj?.score ? parseFloat(formBObj.score) : 5.0;

    const statsA = getSurfaceAdvancedStats(playerAData.skills, surface);
    const statsB = getSurfaceAdvancedStats(playerBData.skills, surface);

    const eloDiff = Math.abs(eloA - eloB);
    const formDiff = Math.abs(formA - formB).toFixed(1);

    const isClay = surface.toLowerCase().includes('clay');
    const isGrass = surface.toLowerCase().includes('grass');
    const surfLabel = isClay ? 'Clay' : isGrass ? 'Grass' : 'Hard';

    // Calculate normalized bars
    const eloTotal = eloA + eloB || 1;
    const eloPercentA = Math.round((eloA / eloTotal) * 100);

    const formTotal = formA + formB || 1;
    const formPercentA = Math.round((formA / formTotal) * 100);

    const serviceMetrics = [
        { key: 'aces_per_match', label: 'Aces / Match', isPercentage: false },
        { key: 'df_per_match', label: 'Double Faults / Match', isPercentage: false },
        { key: 'first_in_pct', label: '1st Serve In', isPercentage: true },
        { key: 'first_win_pct', label: '1st Serve Won', isPercentage: true },
        { key: 'second_win_pct', label: '2nd Serve Won', isPercentage: true },
    ];

    const returnMetrics = [
        { key: 'ret_win_pct', label: 'Return Win', isPercentage: true },
        { key: 'bp_saved_pct', label: 'BP Saved', isPercentage: true },
        { key: 'bp_conv_pct', label: 'BP Converted', isPercentage: true },
    ];

    const renderAdvancedDuel = (metric: any, index: number) => {
        const rawValA = statsA ? statsA[metric.key] : null;
        const rawValB = statsB ? statsB[metric.key] : null;
        
        const valA = rawValA !== null && rawValA !== undefined ? parseFloat(rawValA) : null;
        const valB = rawValB !== null && rawValB !== undefined ? parseFloat(rawValB) : null;

        const displayA = valA !== null ? `${valA.toFixed(metric.isPercentage ? 1 : 2)}${metric.isPercentage ? '%' : ''}` : '-';
        const displayB = valB !== null ? `${valB.toFixed(metric.isPercentage ? 1 : 2)}${metric.isPercentage ? '%' : ''}` : '-';

        let perA = 50;
        if (valA !== null && valB !== null) {
            const total = (valA + valB) || 1;
            perA = Math.round((valA / total) * 100);
        }

        const hasData = valA !== null || valB !== null;
        
        return (
            <motion.div 
                key={metric.key} 
                className="group/item relative"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
            >
                <div className="flex justify-between items-end text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] mb-1.5 transition-colors">
                    <span className={valA !== null && (valB === null || valA >= valB) ? 'text-tennis-lime font-black' : 'text-gray-400 font-bold'}>
                        {displayA}
                    </span>
                    <span className="text-gray-500 font-black tracking-widest text-[8px] uppercase">
                        {metric.label}
                    </span>
                    <span className={valB !== null && (valA === null || valB >= valA) ? 'text-blue-400 font-black' : 'text-gray-400 font-bold'}>
                        {displayB}
                    </span>
                </div>
                {hasData ? (
                    <div className="flex h-1.5 w-full bg-black/40 rounded-full overflow-hidden relative border border-white/5 shadow-inner">
                        <motion.div 
                            initial={{ width: "0%" }}
                            animate={{ width: `${perA}%` }}
                            transition={{ type: "spring", stiffness: 45, damping: 11, delay: 0.1 + index * 0.06 }}
                            className="h-full bg-gradient-to-r from-tennis-lime/80 to-tennis-lime shadow-[0_0_8px_rgba(132,204,22,0.3)] transform-gpu" 
                        />
                        <motion.div 
                            initial={{ width: "0%" }}
                            animate={{ width: `${100-perA}%` }}
                            transition={{ type: "spring", stiffness: 45, damping: 11, delay: 0.1 + index * 0.06 }}
                            className="h-full bg-gradient-to-l from-blue-500/80 to-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)] transform-gpu" 
                        />
                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-black/60 z-10"></div>
                    </div>
                ) : (
                    <div className="flex h-1.5 w-full bg-black/40 rounded-full border border-dashed border-white/5 relative justify-center items-center">
                        <span className="text-[7px] font-mono text-gray-700 tracking-widest uppercase">No Telemetry</span>
                    </div>
                )}
            </motion.div>
        );
    };

    return (
        <div className="w-full max-w-[640px] mx-auto mb-10 md:mb-14 p-6 rounded-3xl bg-[#1a1d26] border border-white/5 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
            <div className="absolute top-0 right-0 h-32 w-32 bg-tennis-lime/5 rounded-full blur-[50px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 h-32 w-32 bg-blue-500/5 rounded-full blur-[50px] pointer-events-none" />
            
            <div className="flex w-full items-center gap-2 border-b border-white/5 pb-3 mb-6 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
                <Swords size={12} className="text-tennis-lime" /> Neural Telemetry Comparison
            </div>

            <div className="space-y-6">
                {/* 1. SURFACE ELO DUEL */}
                <div className="group">
                    <div className="flex justify-between items-end text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] mb-2.5">
                        <span className={eloA >= eloB ? 'text-tennis-lime font-black' : 'text-gray-400 font-bold'}>
                            {eloA} {playerAData.player.last_name}
                        </span>
                        <span className="text-gray-500 font-black tracking-widest text-[9px]">
                            {surfLabel} ELO {eloDiff > 0 ? `(Δ ${eloDiff})` : ''}
                        </span>
                        <span className={eloB >= eloA ? 'text-blue-400 font-black' : 'text-gray-400 font-bold'}>
                            {playerBData.player.last_name} {eloB}
                        </span>
                    </div>
                    <div className="flex h-2.5 w-full bg-black/40 rounded-full overflow-hidden relative border border-white/5 shadow-inner">
                        <motion.div 
                            initial={{ width: "0%" }}
                            animate={{ width: `${eloPercentA}%` }}
                            transition={{ type: "spring", stiffness: 40, damping: 10 }}
                            className="h-full bg-gradient-to-r from-tennis-lime/90 to-tennis-lime shadow-[0_0_8px_rgba(132,204,22,0.3)] transform-gpu" 
                        />
                        <motion.div 
                            initial={{ width: "0%" }}
                            animate={{ width: `${100-eloPercentA}%` }}
                            transition={{ type: "spring", stiffness: 40, damping: 10 }}
                            className="h-full bg-gradient-to-l from-blue-500/90 to-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)] transform-gpu" 
                        />
                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-black/60 z-10"></div>
                    </div>
                </div>

                {/* 2. HOT FORM CLASH */}
                <div className="group">
                    <div className="flex justify-between items-end text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] mb-2.5">
                        <span className={formA >= formB ? 'text-tennis-lime font-black' : 'text-gray-400 font-bold'}>
                            {formA.toFixed(1)} Form
                        </span>
                        <span className="text-gray-500 font-black tracking-widest text-[9px]">
                            Current Form {parseFloat(formDiff) > 0 ? `(Δ ${formDiff})` : ''}
                        </span>
                        <span className={formB >= formA ? 'text-blue-400 font-black' : 'text-gray-400 font-bold'}>
                            Form {formB.toFixed(1)}
                        </span>
                    </div>
                    <div className="flex h-2.5 w-full bg-black/40 rounded-full overflow-hidden relative border border-white/5 shadow-inner">
                        <motion.div 
                            initial={{ width: "0%" }}
                            animate={{ width: `${formPercentA}%` }}
                            transition={{ type: "spring", stiffness: 40, damping: 10 }}
                            className="h-full bg-gradient-to-r from-tennis-lime/90 to-tennis-lime shadow-[0_0_8px_rgba(132,204,22,0.3)] transform-gpu" 
                        />
                        <motion.div 
                            initial={{ width: "0%" }}
                            animate={{ width: `${100-formPercentA}%` }}
                            transition={{ type: "spring", stiffness: 40, damping: 10 }}
                            className="h-full bg-gradient-to-l from-blue-500/90 to-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)] transform-gpu" 
                        />
                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-black/60 z-10"></div>
                    </div>
                </div>
            </div>

            {/* 3. TACTICAL COMBAT PROFILE (SIDE-BY-SIDE INLINE CARDS) */}
            <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/5">
                <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-black/25 border border-white/5 relative overflow-hidden group">
                    <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1"><Trophy size={8}/> Dominant Style</div>
                    <div className="text-[11px] font-black text-white uppercase tracking-tight truncate">{playerAData.player.play_style?.split(',')[0] || 'All-Rounder'}</div>
                    <div className="text-[9px] font-bold text-gray-400 leading-normal line-clamp-2 mt-1">
                        {playerAData.report?.strengths?.split(';')[0] || 'Consistent shotmaker from the baseline.'}
                    </div>
                </div>
                <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-black/25 border border-white/5 relative overflow-hidden group">
                    <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1"><Trophy size={8}/> Dominant Style</div>
                    <div className="text-[11px] font-black text-white uppercase tracking-tight truncate">{playerBData.player.play_style?.split(',')[0] || 'All-Rounder'}</div>
                    <div className="text-[9px] font-bold text-gray-400 leading-normal line-clamp-2 mt-1">
                        {playerBData.report?.strengths?.split(';')[0] || 'Consistent shotmaker from the baseline.'}
                    </div>
                </div>
            </div>

            {/* ADVANCED QUANT MATRIX */}
            <div className="mt-8 pt-6 border-t border-white/5">
                <div className="flex w-full items-center justify-between mb-6">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 flex items-center gap-2">
                        <Sliders size={12} className="text-tennis-lime animate-pulse" />
                        Granular Surface Telemetry ({surfLabel})
                    </span>
                    <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest bg-black/40 px-2.5 py-1 rounded-md border border-white/5 flex items-center gap-1.5 shadow-inner">
                        <Activity size={10} className="text-tennis-lime animate-pulse" /> Live Telemetry Matrix
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                    {/* Column 1: Service Metrics */}
                    <div className="space-y-4">
                        <div className="text-[8px] font-black uppercase tracking-widest text-tennis-lime/70 mb-2 border-b border-tennis-lime/10 pb-1.5 flex items-center gap-1.5">
                            <Zap size={10} className="text-tennis-lime" /> Service Dominance
                        </div>
                        {serviceMetrics.map((metric, idx) => renderAdvancedDuel(metric, idx))}
                    </div>

                    {/* Column 2: Return & Break Point Metrics */}
                    <div className="space-y-4">
                        <div className="text-[8px] font-black uppercase tracking-widest text-blue-400/70 mb-2 border-b border-blue-400/10 pb-1.5 flex items-center gap-1.5">
                            <Crosshair size={10} className="text-blue-400" /> Tactical Return
                        </div>
                        {returnMetrics.map((metric, idx) => renderAdvancedDuel(metric, idx + serviceMetrics.length))}
                    </div>
                </div>

                {/* Granular Match Samples Count */}
                <div className="mt-6 text-[8px] text-gray-600 font-bold uppercase tracking-widest flex items-center justify-between border-t border-white/5 pt-4">
                    <span className="flex items-center gap-1 bg-black/20 px-2.5 py-1.5 rounded-xl border border-white/5 shadow-inner">
                        <span className="w-1.5 h-1.5 rounded-full bg-tennis-lime animate-pulse"></span>
                        A Sample: {(statsA?.matches_with_stats || 0)} matches
                    </span>
                    <span className="flex items-center gap-1 bg-black/20 px-2.5 py-1.5 rounded-xl border border-white/5 shadow-inner">
                        B Sample: {(statsB?.matches_with_stats || 0)} matches
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                    </span>
                </div>
            </div>
        </div>
    );
}

const BsiInput = ({ value, onChange, label }: { value: number | string, onChange: (v: string) => void, label: string }) => {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col w-full">
            <label className="text-[10px] md:text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1.5 md:mb-1.5">{label}</label>
            <input
                type="text" 
                value={value}
                onChange={e => onChange(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-lg md:rounded-xl p-3 md:p-4 text-sm md:text-sm text-white focus:border-tennis-lime outline-none transition-all font-bold"
            />
        </div>
    );
};

const CustomSurfaceSelect = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col w-full">
            <label className="text-[10px] md:text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1.5 md:mb-1.5">{t('matchup.controls.type')}</label>
            <div className="relative">
                <select
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="bg-black/40 text-white text-sm md:text-sm font-bold px-3 md:px-4 py-3 md:py-4 rounded-lg md:rounded-xl border border-white/10 outline-none focus:border-tennis-lime w-full transition-all appearance-none cursor-pointer"
                >
                    <option value="Hard">{t('courtDatabase.filters.hard')}</option>
                    <option value="Indoor">Indoor</option>
                    <option value="Red Clay">{t('courtDatabase.filters.clay')} (Red)</option>
                    <option value="Green Clay">{t('courtDatabase.filters.clay')} (Green)</option>
                    <option value="Grass">{t('courtDatabase.filters.grass')}</option>
                </select>
                <ChevronDown className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
            </div>
        </div>
    );
};

function InternalMatchupCard({ playerA, playerB, prediction, context, isAnalyzing }: any) {
  const { t } = useTranslation();
  const pA = playerA || { name: 'Player A', image: '', country: 'INT', id: '' };
  const pB = playerB || { name: 'Player B', image: '', country: 'INT', id: '' };
  const ctx = context || { surface: 'HARD', bsi: 5 };

  if (isAnalyzing || !prediction) {
      return (
        <div className="flex flex-col items-center w-full max-w-[400px] mx-auto select-none p-4 opacity-50">
            <div className="relative w-full h-[580px] rounded-[32px] bg-[#15171e] border border-white/5 shadow-2xl overflow-hidden flex flex-col items-center justify-center">
            </div>
        </div>
      );
  }

  const { winner_prediction: winnerName, confidence_score: score, key_factor: keyFactor, probA } = prediction;
  const isWinnerA = winnerName.toLowerCase().includes(pA.name.toLowerCase().trim().split(' ').pop().toLowerCase());
  const winnerObj = isWinnerA ? pA : pB;

  const isBlue = score >= 9.0;
  const isDarkGreen = score >= 8.0 && score < 9.0;
  const isLightGreen = score >= 7.0 && score < 8.0;
    
  const scoreColor = isBlue ? 'text-[#3b82f6]' : (isDarkGreen ? 'text-[#22c55e]' : (isLightGreen ? 'text-[#84cc16]' : 'text-[#facc15]'));
  const barColor = isBlue ? 'bg-[#3b82f6]' : (isDarkGreen ? 'bg-[#22c55e]' : (isLightGreen ? 'bg-[#84cc16]' : 'bg-[#facc15]'));

  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    if (score > 0) {
        let start = 0; const end = score; const duration = 1200; 
        const increment = end / (duration / 16); 
        const timer = setInterval(() => { 
            start += increment; 
            if (start >= end) { setDisplayScore(end); clearInterval(timer); } 
            else { setDisplayScore(start); } 
        }, 16);
        return () => clearInterval(timer);
    }
  }, [score]);

  return (
    <div className="group relative w-full max-w-[380px] md:max-w-[400px] mx-auto select-none animate-in fade-in zoom-in duration-500 my-8">
      <div className="relative rounded-[36px] bg-[#1a1d24] shadow-[0_30px_60px_-15px_rgba(0,0,0,1)] overflow-hidden p-[2px]">
        <div className="absolute inset-0 rounded-[36px] border-[2px] border-white/5 pointer-events-none z-50"></div>
        <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden rounded-[36px] animate-silver-glass opacity-30"></div>
        <div className="relative w-full h-auto min-h-[580px] bg-[#0a0a0a] rounded-[34px] overflow-hidden flex flex-col">
            {winnerObj.image && (
                <div className="absolute inset-0 z-0">
                    <img src={winnerObj.image} alt="bg" className="w-full h-full object-cover opacity-90 blur-[2px] scale-105"/>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent"></div>
                </div>
            )}
            <div className="relative z-20 flex justify-between items-center p-6">
                <div className="inline-flex items-center gap-2 bg-black/50 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full shadow-lg">
                    <span className="text-white font-bold text-xs tracking-tight uppercase">{pA.name.split(' ').pop()}</span>
                    <span className={`font-black text-[10px] italic ${scoreColor}`}>{t('matchup.slots.vs')}</span>
                    <span className="text-gray-300 font-bold text-xs tracking-tight uppercase">{pB.name.split(' ').pop()}</span>
                </div>
            </div>
            <div className="relative z-20 px-6 flex-1 flex flex-col justify-end pb-10">
                <h1 className={`text-6xl font-black text-white leading-none tracking-tighter drop-shadow-2xl uppercase outline-text mb-4`}>{winnerObj.name.split(' ').pop()}</h1>
                <div className="flex items-center gap-3 mb-6">
                    <div className={`h-7 w-7 ${barColor} rounded-md ring-1 ring-white/30 backdrop-blur-md shadow-lg`}></div>
                    <div className={`text-8xl font-black tracking-tighter leading-none ${scoreColor} drop-shadow-2xl`}>{displayScore.toFixed(2)}</div>
                </div>
                
                <div className="bg-[#15171e]/80 p-5 rounded-[24px] backdrop-blur-xl border border-white/10 shadow-xl space-y-5">
                    <div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin size={10}/> {ctx.surface} BSI</div>
                        <div className="flex gap-0.5 items-center">
                            {[...Array(10)].map((_, i) => (<div key={i} className={`w-1.5 h-3 rounded-sm ${i < ctx.bsi ? 'bg-[#84cc16]' : 'bg-gray-700'}`}></div>))}
                            <span className="text-white font-mono font-bold text-xs ml-3">{ctx.bsi}/10</span>
                        </div>
                    </div>
                    <div className="pt-3 border-t border-white/5">
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1 mb-1"><Zap size={10} className={scoreColor}/> {t('matchupCard.labels.edge')}</div>
                        <p className="text-sm text-gray-200 font-medium leading-snug line-clamp-2">{keyFactor}</p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

// --- MAIN PAGE EXPORT ---
export function MatchupAnalyzer() {
  const { t, i18n } = useTranslation();
  const { user, isAdmin } = useAuth();
  const { isElite, credits, refreshAccess, loading: accessLoading } = useAccess();

  // 🚀 NEU: THE VAULT STATES
  const [activeTab, setActiveTab] = useState<'scanner' | 'vault'>('scanner');
  const [savedMatchups, setSavedMatchups] = useState<any[]>([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [savingVault, setSavingVault] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const isLoadingFromVaultRef = useRef(false);

  const [players, setPlayers] = useState<any[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<any[]>([]);
  const [tourFilter, setTourFilter] = useState<'ATP' | 'WTA'>('ATP');
  const [tournaments, setTournaments] = useState<any[]>([]);
    
  const [activeSlot, setActiveSlot] = useState<'A' | 'B' | null>(null);
  const [playerA, setPlayerA] = useState<any | null>(null);
  const [playerB, setPlayerB] = useState<any | null>(null);
    
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [customBsi, setCustomBsi] = useState('5.0'); 
  const [isCustomBsiMode, setIsCustomBsiMode] = useState(false);
  const [customSurface, setCustomSurface] = useState('Hard');
  const [courtSearchTerm, setCourtSearchTerm] = useState('');
    
  const [playerAData, setPlayerAData] = useState<any | null>(null);
  const [playerBData, setPlayerBData] = useState<any | null>(null);
    
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [pageLoading, setPageLoading] = useState(true); 
  const [dataLoading, setDataLoading] = useState(false);
  const [showRequirementAlert, setShowRequirementAlert] = useState(false);

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatusText, setLoadingStatusText] = useState("Initializing..."); 
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [accessInfo, setAccessInfo] = useState<any>(null); 
  
  // 🚀 NEU: DATA EXPLORER STATES (Apple-like Tab System)
  const [activeMobilePlayer, setActiveMobilePlayer] = useState<'A' | 'B'>('A');
  const [activeDataTab, setActiveDataTab] = useState<'STYLE' | 'BSI' | 'MARKET'>('STYLE'); 

  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- INIT ---
  useEffect(() => {
    Promise.all([
        supabase.from('players').select('*').order('last_name'), 
        supabase.from('tournaments').select('*').order('name')
    ]).then(([p, t]) => {
      if(p.data) setPlayers(p.data); 
      if(t.data) setTournaments(t.data);
      setPageLoading(false);
    }).catch(e => { console.error(e); setPageLoading(false); });
    
    const hasSeenTutorial = localStorage.getItem('hasSeenMatchupTutorial');
    if (!hasSeenTutorial) {
        setTimeout(() => setShowTutorial(true), 1000); 
        localStorage.setItem('hasSeenMatchupTutorial', 'true');
    }
  }, []);

  // 🚀 NEU: FETCH VAULT
  useEffect(() => {
      if (activeTab === 'vault' && user) {
          fetchVault();
      }
  }, [activeTab, user]);

  const fetchVault = async () => {
      setVaultLoading(true);
      try {
          const { data, error } = await supabase.from('user_saved_matchups').select('*').order('created_at', { ascending: false });
          if (error) throw error;
          setSavedMatchups(data || []);
      } catch(e) {
          console.error("Failed fetching vault:", e);
      } finally {
          setVaultLoading(false);
      }
  };

  useEffect(() => { setFilteredPlayers(players.filter(p => p.tour === tourFilter)); }, [tourFilter, players]);
  useEffect(() => { if(playerA) fetchDeepData(playerA.id, setPlayerAData); else setPlayerAData(null); }, [playerA]);
  useEffect(() => { if(playerB) fetchDeepData(playerB.id, setPlayerBData); else setPlayerBData(null); }, [playerB]);
  
  // SOTA FIX: Prevent reset when loading from Vault
  useEffect(() => { 
      if (isLoadingFromVaultRef.current) {
          isLoadingFromVaultRef.current = false;
          return;
      }
      setAnalysisResult(null); 
      setIsSaved(false);
  }, [playerA?.id, playerB?.id, selectedTournamentId, isCustomBsiMode, customBsi, customSurface]);

  const fetchDeepData = async (id: string, setter: any) => {
    setDataLoading(true);
    try {
        const { data: p } = await supabase.from('players').select('*').eq('id', id).single();
        const { data: s } = await supabase.from('player_skills').select('*').eq('player_id', id).maybeSingle();
        const { data: r } = await supabase.from('scouting_reports').select('*').eq('player_id', id).maybeSingle();
        setter({ player: p, skills: s, report: r });
    } catch(e) { console.error(e); } finally { setDataLoading(false); }
  };

  const selectedTournament = tournaments.find(t => t.id === selectedTournamentId);
  const finalBsi = isCustomBsiMode ? (parseFloat(customBsi) || 5) : (selectedTournament?.bsi_rating || 5);
  const finalSurface = isCustomBsiMode ? customSurface : (selectedTournament?.surface || 'Hard');
    
  const filteredCourtTournaments = tournaments.filter(t => 
    t.name.toLowerCase().includes(courtSearchTerm.toLowerCase()) || 
    t.surface.toLowerCase().includes(courtSearchTerm.toLowerCase())
  );

  const isCourtSelected = !!selectedTournamentId || isCustomBsiMode;
  const isMatchupReady = !!playerA && !!playerB;
  const canAnalyze = isMatchupReady && isCourtSelected && !dataLoading && !analyzing;

  // 🚀 NEU: SAVE TO VAULT LOGIC
  const saveToVault = async () => {
      if (!user || !analysisResult || !playerAData || !playerBData) return;
      setSavingVault(true);
      try {
          const payload = {
              user_id: user.id,
              player_a_name: playerAData.player.last_name,
              player_b_name: playerBData.player.last_name,
              surface: finalSurface,
              analysis_data: {
                  playerAData,
                  playerBData,
                  analysisResult,
                  context: { surface: finalSurface, bsi: finalBsi }
              }
          };
          const { error } = await supabase.from('user_saved_matchups').insert([payload]);
          if (error) throw error;
          setIsSaved(true);
      } catch (error) {
          console.error('Save failed', error);
          alert('Failed to save to Vault. Please try again.');
      } finally {
          setSavingVault(false);
      }
  };

  // 🚀 NEU: LOAD FROM VAULT LOGIC
  const loadFromVault = (item: any) => {
      isLoadingFromVaultRef.current = true; // Signalisiert dem Reset-Effect, diese Runde zu überspringen
      const data = item.analysis_data;
      
      setPlayerA(data.playerAData.player);
      setPlayerB(data.playerBData.player);
      setPlayerAData(data.playerAData);
      setPlayerBData(data.playerBData);
      setAnalysisResult(data.analysisResult);
      
      setIsCustomBsiMode(true);
      setCustomSurface(data.context.surface);
      setCustomBsi(data.context.bsi.toString());
      setSelectedTournamentId('');
      
      setIsSaved(true); // Bereits im Vault gespeichert
      setActiveTab('scanner');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 🚀 NEU: DELETE FROM VAULT LOGIC
  const deleteFromVault = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm('Are you sure you want to delete this intel from your Vault?')) return;
      try {
          const { error } = await supabase.from('user_saved_matchups').delete().eq('id', id);
          if (error) throw error;
          setSavedMatchups(prev => prev.filter(m => m.id !== id));
      } catch(e) {
          console.error(e);
      }
  };

  // --- ANALYZE FUNCTION (VETERAN UPGRADE W/ TELEMETRY) ---
  const analyzeMatchup = async () => {
    if (!canAnalyze) { 
        setShowRequirementAlert(true); 
        setTimeout(() => setShowRequirementAlert(false), 2000); 
        return; 
    }
    
    if (user) {
        setAnalyzing(true);
        const { data: isAllowed, error } = await supabase.rpc('use_matchup_analyzer', { 
            p_user_id: user.id 
        });
        
        if (error) {
            console.error("[Gatekeeper Error]:", error.message);
            setAnalyzing(false);
            return;
        }

        if (!isAllowed) {
            setAnalyzing(false);
            setShowAccessDeniedModal(true); 
            refreshAccess();
            
            trackEvent('matchup_paywall_hit', {
                playerA: playerAData?.player.last_name,
                playerB: playerBData?.player.last_name
            });
            return; 
        }

        trackEvent('matchup_analysis_start', {
            playerA: playerAData?.player.last_name,
            playerA_id: playerAData?.player.id,
            playerB: playerBData?.player.last_name,
            playerB_id: playerBData?.player.id,
            surface: finalSurface,
            bsi: finalBsi,
            tour: tourFilter
        });
    }

    setAnalysisResult(null);
    setLoadingProgress(0);
    setLoadingStatusText("Initializing Neural Core...");

    const intervalId = setInterval(() => {
        setLoadingProgress((prev) => {
            let increment = 0;
            if (prev < 20) increment = 2.5;        
            else if (prev < 45) increment = 1.2;  
            else if (prev < 70) increment = 0.6;  
            else if (prev < 90) increment = 0.2;  
            else if (prev < 99) increment = 0.05; 
            else increment = 0; 
            const next = Math.min(prev + increment, 99.5);
            if (next < 25) setLoadingStatusText("Initializing Neural Core...");
            else if (next < 50) setLoadingStatusText("Analyzing Court Metrics (BSI)...");
            else if (next < 75) setLoadingStatusText("Checking Player Form & Biometrics...");
            else setLoadingStatusText("Running Tactical Simulations...");
            return next;
        });
    }, 100); 
    loadingIntervalRef.current = intervalId;

    const notes = isCustomBsiMode ? "Manual Override" : (selectedTournament?.notes || "");
    const startTime = Date.now(); 

    try {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            playerAId: playerAData!.player.id, 
            playerBId: playerBData!.player.id,
            surface: finalSurface, 
            bsi: finalBsi, 
            courtNotes: notes,
            skillsA: playerAData?.skills,
            skillsB: playerBData?.skills,
            reportA: playerAData?.report,
            reportB: playerBData?.report,
            language: (i18n.language || 'en').substring(0, 2).toLowerCase()
        })
      });

      if (!response.ok) throw new Error("AI API Failed");
      const data = await response.json();
      
      const probString = data.win_probability.replace('%', '');
      const probValue = parseFloat(probString);
      const uiScore = Math.max(2.00, Math.min(9.99, probValue / 10));

      const elapsedTime = Date.now() - startTime;
      const minLoadingTime = 3000; 
      
      if (data._cached && elapsedTime < minLoadingTime) {
          setLoadingStatusText("Loading Cached Intelligence...");
          await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
      }

      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
      setLoadingProgress(100);
      setLoadingStatusText("Finalizing Report...");
      
      setTimeout(() => {
          setAnalysisResult({ 
              winner_prediction: data.winner_prediction,
              confidence_score: uiScore, 
              key_factor: data.key_factor, 
              deep_dive_text: data.prediction_text || data.deep_dive_text, 
              winner_id: data.winner_prediction.toLowerCase().includes(playerAData!.player.last_name.toLowerCase()) ? playerAData!.player.id : playerBData!.player.id, 
              probA: data.winner_prediction.toLowerCase().includes(playerAData!.player.last_name.toLowerCase()) ? probValue/100 : 1-(probValue/100),
              summary_bullet_points: data.tactical_bullets || []
          });
          setAnalyzing(false);
          refreshAccess(); 
          
          if(user) {
              trackEvent('matchup_analysis_success', {
                  winner: data.winner_prediction,
                  confidence: uiScore
              });
          }
      }, 600); 

    } catch (e: any) { 
        console.error("Analysis Failed:", e);
        if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
        setAnalyzing(false);
        setAnalysisResult({ 
            winner_prediction: "Error", confidence_score: 5.0, key_factor: "Connection Failed", 
            deep_dive_text: "Neural Net unreachable.", winner_id: "", probA: 0.5, summary_bullet_points: []
        });
        
        if(user) {
            trackEvent('matchup_analysis_failed', {
                error: e.message
            });
        }
    }
  };

  if (pageLoading || accessLoading) return <LoadingScreen message={t('matchup.loading')} />;

  const getButtonText = () => {
    if (isElite || isAdmin) {
        return { 
            main: t('matchup.buttons.run'), 
            sub: "Unlimited Elite Access", 
            icon: <Crown size={12} className="text-yellow-400"/>,
            color: "text-yellow-400" 
        };
    }
    if (credits > 0) {
        return { 
            main: t('matchup.buttons.run'), 
            sub: `${credits}/3 Evaluation Credits`, 
            icon: <Coins size={12} className="text-tennis-lime"/>,
            color: "text-tennis-lime" 
        };
    }
    return { 
        main: "Unlock Access", 
        sub: "Free Limit Reached", 
        icon: <Lock size={12} className="text-red-500"/>,
        color: "text-red-500" 
    };
  };

  const btnState = getButtonText();

  const SaveVaultButton = () => {
      if (!user) return null; 
      return (
          <button
              onClick={saveToVault}
              disabled={savingVault || isSaved}
              className={`w-full py-4 rounded-[1.5rem] flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs transition-[border-color,background-color,color,transform] shadow-xl mt-4 transform-gpu will-change-transform ${
                  isSaved
                  ? 'bg-white/5 text-tennis-lime border border-tennis-lime/20 cursor-default'
                  : 'bg-[#15171e] text-white border border-white/10 hover:border-tennis-lime hover:text-tennis-lime active:scale-[0.98]'
              }`}
          >
              {savingVault ? <Loader2 size={16} className="animate-spin text-tennis-lime"/> : isSaved ? <CheckCircle2 size={16}/> : <Bookmark size={16}/>}
              {savingVault ? 'Encrypting...' : isSaved ? 'Secured in Vault' : 'Save to Vault'}
          </button>
      );
  };

  return (
    <div className="pb-24 w-full max-w-6xl mx-auto px-4 relative">
      <ScrollToTop />
      <AccessDeniedModal isOpen={showAccessDeniedModal} onClose={() => setShowAccessDeniedModal(false)} />
      <TacticalBriefingModal isOpen={showTutorial} onClose={() => setShowTutorial(false)} />

      {/* HELP BUTTON */}
      <div className="fixed top-24 right-4 lg:right-8 z-50">
          <button 
            onClick={() => setShowTutorial(true)} 
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1d26] backdrop-blur-md rounded-full border border-white/10 hover:border-tennis-lime transition-all text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white shadow-xl hover:shadow-[0_0_15px_rgba(132,204,22,0.15)] group"
          >
              <HelpCircle size={14} className="group-hover:text-tennis-lime transition-colors"/> Guide
          </button>
      </div>

      {/* 🚀 NEU: THE VAULT / SCANNER TAB SWITCHER */}
      <div className="flex justify-center mb-8 pt-6">
          <div className="bg-black/40 backdrop-blur-md p-1.5 rounded-full border border-white/10 flex gap-2 shadow-2xl">
              <button 
                  onClick={() => setActiveTab('scanner')} 
                  className={`px-6 py-2.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest transition-[background-color,color,box-shadow] flex items-center gap-2 transform-gpu will-change-transform ${activeTab === 'scanner' ? 'bg-tennis-lime text-black shadow-[0_0_20px_rgba(132,204,22,0.3)]' : 'text-gray-500 hover:text-white'}`}
              >
                  <Activity size={14}/> Neural Scanner
              </button>
              <button 
                  onClick={() => {
                      if (!user) { alert("Please sign in to access The Vault."); return; }
                      setActiveTab('vault');
                  }} 
                  className={`px-6 py-2.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest transition-[background-color,color,box-shadow] flex items-center gap-2 transform-gpu will-change-transform ${activeTab === 'vault' ? 'bg-tennis-lime text-black shadow-[0_0_20px_rgba(132,204,22,0.3)]' : 'text-gray-500 hover:text-white'}`}
              >
                  <Archive size={14}/> Intel Vault
              </button>
          </div>
      </div>

      {/* ========================================================================= */}
      {/* SCANNER VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'scanner' && (
          <div className="animate-in fade-in zoom-in-95 duration-500">
              {/* SEARCH & FILTERS SECTION */}
              <div className={`flex flex-col md:flex-row gap-4 md:gap-6 items-center justify-between mb-10 glass-matrix p-4 md:p-6 rounded-2xl md:rounded-[2rem] border transition-all duration-700 mt-2 shadow-2xl relative overflow-visible z-40 ${showRequirementAlert && !isCourtSelected ? 'border-red-500 shadow-red-500/10 animate-shake' : 'border-white/5'}`}>
                 <div className="flex bg-black/40 p-1 md:p-1.5 rounded-xl md:rounded-2xl border border-white/5 w-full md:w-auto">
                    {['ATP', 'WTA'].map(t => (
                      <button key={t} onClick={() => setTourFilter(t as any)} className={`flex-1 md:flex-none px-6 md:px-8 py-3 md:py-3.5 rounded-lg md:rounded-xl text-xs md:text-xs font-black tracking-widest transition-all ${tourFilter === t ? 'bg-tennis-lime text-black shadow-lg shadow-tennis-lime/20' : 'text-gray-500 hover:text-white'}`}>{t}</button>
                    ))}
                 </div>
                 <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 w-full md:w-auto flex-1 md:justify-end">
                    <div className="relative w-full md:max-w-[320px] group">
                        <Search className="absolute left-4 md:left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-tennis-lime transition-colors" size={16} />
                        <input type="text" placeholder={t('matchup.controls.searchCourt')} value={courtSearchTerm} onChange={(e) => { setCourtSearchTerm(e.target.value); setSelectedTournamentId(''); setAnalysisResult(null); }} className="w-full bg-black/40 text-white pl-12 pr-4 py-3 md:py-4 rounded-xl border border-white/10 outline-none focus:border-tennis-lime transition-all font-bold text-sm md:text-sm" />
                        {courtSearchTerm.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 md:mt-2 bg-[#1a1d26] border border-white/10 rounded-xl md:rounded-2xl z-[60] shadow-2xl max-h-40 md:max-h-60 overflow-y-auto custom-scrollbar">
                            {filteredCourtTournaments.map(t => (
                                <button key={t.id} onClick={() => { setSelectedTournamentId(t.id); setCourtSearchTerm(''); setAnalysisResult(null); }} className="w-full px-4 md:px-5 py-3 md:py-4 text-left text-xs md:text-xs font-black uppercase tracking-widest text-gray-300 hover:bg-white/5 border-b border-white/5 last:border-0">{t.name} ({t.bsi_rating}/10)</button>
                            ))}
                          </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
                        {isCustomBsiMode ? (
                            <div className="flex gap-2 md:gap-3 w-full md:w-64 animate-in slide-in-from-right-2 md:slide-in-from-right-4">
                              <BsiInput label="BSI Rating" value={customBsi} onChange={v => { setCustomBsi(v); setAnalysisResult(null); }} />
                              <CustomSurfaceSelect value={customSurface} onChange={v => { setCustomSurface(v); setAnalysisResult(null); }} />
                            </div>
                        ) : (
                          <div className="flex items-center gap-2 md:gap-4 px-4 md:px-6 py-3 md:py-4 bg-black/20 rounded-lg md:rounded-xl border border-white/5 min-w-[120px] md:min-w-[180px] justify-center">
                            <BarChart3 size={16} className="text-tennis-lime" />
                            <span className="text-xs md:text-sm text-gray-400 font-black uppercase tracking-widest">{finalBsi}/10 <span className="text-white/30 ml-1 md:ml-2">{finalSurface}</span></span>
                          </div>
                        )}
                        <button onClick={() => { setIsCustomBsiMode(!isCustomBsiMode); setSelectedTournamentId(''); }} className="text-tennis-lime text-[10px] md:text-[10px] font-black uppercase tracking-widest underline hover:text-white whitespace-nowrap px-2 md:px-2">{isCustomBsiMode ? t('matchup.controls.dbSearch') : t('matchup.controls.override')}</button>
                    </div>
                 </div>
              </div>
              
              {/* SLOT GRID (🚀 SOTA ARCHITECT FIX: Flexible Column Flow für Badges) */}
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 md:gap-16 items-start mb-16 md:mb-24 px-0 md:px-4 max-w-[900px] mx-auto relative z-30">
                  <div className="w-full flex flex-col">
                      <PlayerSlot label={t('matchup.slots.alpha')} player={playerA} onClick={() => setActiveSlot('A')} onClear={() => { setPlayerA(null); setAnalysisResult(null); }} isError={showRequirementAlert && !playerA} />
                      <div className="mt-4 md:mt-5 min-h-[80px] md:min-h-[40px] w-full">
                          <PlayerIntelBadges player={playerA} surface={finalSurface} />
                      </div>
                  </div>
                  <div className="flex flex-col items-center justify-start pt-[40%] md:pt-[25%]">
                      <div className="text-2xl md:text-8xl font-black italic text-white/5 select-none tracking-tighter no-select">VS</div>
                  </div>
                  <div className="w-full flex flex-col">
                      <PlayerSlot label={t('matchup.slots.beta')} player={playerB} onClick={() => setActiveSlot('B')} onClear={() => { setPlayerB(null); setAnalysisResult(null); }} isError={showRequirementAlert && !playerB} />
                      <div className="mt-4 md:mt-5 min-h-[80px] md:min-h-[40px] w-full">
                          <PlayerIntelBadges player={playerB} surface={finalSurface} />
                      </div>
                  </div>
              </div>

              {/* DIRECT HEAD-TO-HEAD INTEL & ELO COMPARISON HUD */}
              <HeadToHeadComparisonHUD playerAData={playerAData} playerBData={playerBData} surface={finalSurface} />
              
              {/* ACTION AREA */}
              {!analysisResult && (
                  analyzing ? (
                      <ProcessingIndicator isVisible={analyzing} progress={loadingProgress} statusText={loadingStatusText} />
                  ) : (
                      <div className="mb-20 md:mb-24 max-sm:max-w-md mx-auto space-y-6">
                        <button 
                          onClick={analyzeMatchup} 
                          disabled={analyzing} 
                          className={`
                            relative group overflow-hidden rounded-xl bg-[#15171e] border border-white/10 px-8 py-5 md:py-4
                            transition-[border-color,box-shadow,transform] duration-300 hover:border-tennis-lime/50 hover:shadow-[0_0_20px_rgba(132,204,22,0.15)]
                            active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mx-auto block w-full max-w-sm transform-gpu will-change-transform
                            ${canAnalyze ? '' : 'opacity-50 cursor-not-allowed'}
                          `}
                        >
                            {canAnalyze && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[100%] group-hover:animate-[shine-subtle_1s_infinite]" />}
                            <span className="relative flex flex-col items-center justify-center gap-1">
                                <span className="flex items-center gap-2 text-sm md:text-xs font-black uppercase tracking-[0.2em] text-gray-300 group-hover:text-white">
                                    <Swords size={18} className="text-tennis-lime" />
                                    {btnState.main}
                                </span>
                                {/* SMART SUBTEXT */}
                                <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${btnState.color}`}>
                                    {btnState.icon}
                                    {btnState.sub}
                                </span>
                            </span>
                        </button>
                      </div>
                  )
              )}
              
              {/* RESULT VIEW */}
              {analysisResult && playerAData && playerBData && (
                  <div className="animate-in fade-in slide-in-from-bottom-12 duration-1000">
                      
                      {/* --- MOBILE LAYOUT --- */}
                      <div className="flex flex-col lg:hidden gap-8 items-start">
                          <div className="w-full flex-shrink-0 flex flex-col items-center mx-auto">
                              <InternalMatchupCard playerA={{ name: playerAData.player.last_name, image: playerAData.player.profile_image_url, country: playerAData.player.country, id: playerAData.player.id }} playerB={{ name: playerBData.player.last_name, image: playerBData.player.profile_image_url, country: playerBData.player.country, id: playerBData.player.id }} prediction={analysisResult} context={{ surface: finalSurface, bsi: finalBsi }} isAnalyzing={analyzing} />
                              
                              <div className="w-full px-4 mb-6">
                                 <SaveVaultButton />
                              </div>

                              <div className="bg-[#1a1d26] p-6 rounded-[2rem] border border-white/5 shadow-2xl flex flex-col items-center w-full relative overflow-hidden group">
                                  <div className="absolute top-0 right-0 h-24 w-24 bg-blue-500/5 blur-[40px]" />
                                  <div className="mb-6 flex w-full items-center gap-2 border-b border-white/5 pb-4 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500"><Activity size={12} className="text-tennis-lime"/> {t('matchup.headers.matrix')}</div>
                                  <OverlappingRadar skillsA={playerAData.skills} skillsB={playerBData.skills} />
                                  <div className="mt-6 flex gap-6 rounded-lg border border-white/5 bg-black/20 p-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                        <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-tennis-lime"></div>{playerAData.player.last_name}</div>
                                        <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-blue-500"></div>{playerBData.player.last_name}</div>
                                  </div>
                              </div>
                          </div>
                          <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
                                <div className="relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#1a1d26] p-6 shadow-2xl">
                                    <div className="absolute left-0 top-0 h-full w-1 bg-tennis-lime" />
                                    <h3 className="mb-6 flex items-center gap-3 text-xs font-black uppercase tracking-[0.3em] text-white"><BrainCircuit size={18} className="text-tennis-lime"/> {t('matchup.headers.briefing')}</h3>
                                    <div className="space-y-6">
                                        {(analysisResult?.deep_dive_text || '').split('\n\n').map((para: string, i: number) => {
                                            if(!para.trim()) return null;
                                            const icons = [<Target size={16} className="text-tennis-lime" />, <Shield size={16} className="text-blue-400" />, <Crosshair size={16} className="text-red-400" />];
                                            const titles = [t('matchup.analysisLabels.surface'), t('matchup.analysisLabels.tactical'), t('matchup.analysisLabels.verdict')];
                                            return (
                                                <div key={i} className="flex gap-4 group">
                                                    <div className="mt-1 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">{icons[i % 3]}</div>
                                                    <div>
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">{titles[i % 3] || 'Analysis'}</div>
                                                        <p className="text-sm font-medium text-gray-300 leading-relaxed">
                                                            {renderFormattedText(para)}
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div className="rounded-[2.5rem] border border-white/5 bg-[#1a1d26] p-6 shadow-2xl">
                                    <h3 className="mb-8 flex items-center gap-3 text-xs font-black uppercase tracking-[0.3em] text-white"><Zap size={18} className="text-yellow-400"/> {t('matchup.headers.dominance')}</h3>
                                    <div className="space-y-4">
                                        <StatBattleBar label={t('matchup.metrics.service')} valA={playerAData.skills?.serve || 50} valB={playerBData.skills?.serve || 50} />
                                        <StatBattleBar label={t('matchup.metrics.forehand')} valA={playerAData.skills?.forehand || 50} valB={playerBData.skills?.forehand || 50} />
                                        <StatBattleBar label={t('matchup.metrics.mental')} valA={playerAData.skills?.mental || 50} valB={playerBData.skills?.mental || 50} />
                                        <StatBattleBar label={t('matchup.metrics.physical')} valA={playerAData.skills?.speed || 50} valB={playerBData.skills?.speed || 50} />
                                    </div>
                                </div>
                                
                                {/* 🚀 NEU: APPLE-LIKE DEEP DIVE EXPLORER FÜR MOBILE */}
                                <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-500 mt-8">
                                    <h3 className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.3em] text-white ml-2">
                                        <Activity size={18} className="text-tennis-lime"/> Data Explorer
                                    </h3>
                                    
                                    {/* Player Switcher */}
                                    <div className="flex flex-col gap-2">
                                        <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5 w-full shadow-lg">
                                            <button 
                                                onClick={() => setActiveMobilePlayer('A')} 
                                                className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all transform-gpu will-change-transform ${activeMobilePlayer === 'A' ? 'bg-tennis-lime text-black shadow-md scale-[1.02]' : 'text-gray-500 hover:text-white'}`}
                                            >
                                                {playerAData.player.last_name}
                                            </button>
                                            <button 
                                                onClick={() => setActiveMobilePlayer('B')} 
                                                className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all transform-gpu will-change-transform ${activeMobilePlayer === 'B' ? 'bg-blue-500 text-white shadow-md scale-[1.02]' : 'text-gray-500 hover:text-white'}`}
                                            >
                                                {playerBData.player.last_name}
                                            </button>
                                        </div>
                                        {/* Playstyle Subtitle */}
                                        <div className="flex justify-center items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1 mb-2">
                                            <Target size={10} className={activeMobilePlayer === 'A' ? 'text-tennis-lime' : 'text-blue-500'} />
                                            {activeMobilePlayer === 'A' 
                                                ? (playerAData.player.play_style?.split(',')[0] || 'Unknown Style')
                                                : (playerBData.player.play_style?.split(',')[0] || 'Unknown Style')}
                                        </div>
                                    </div>

                                    {/* Metric Tab Switcher (Horizontal Scroll) */}
                                    <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5 w-full overflow-x-auto no-scrollbar snap-x shadow-lg">
                                        <button 
                                            onClick={() => setActiveDataTab('STYLE')} 
                                            className={`flex-none min-w-[120px] py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 snap-center ${activeDataTab === 'STYLE' ? 'bg-white/10 text-white border border-white/10' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            <TrendingUp size={12} className={activeDataTab === 'STYLE' ? 'text-tennis-lime' : ''}/> Style Edge
                                        </button>
                                        <button 
                                            onClick={() => setActiveDataTab('BSI')} 
                                            className={`flex-none min-w-[120px] py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 snap-center ${activeDataTab === 'BSI' ? 'bg-white/10 text-white border border-white/10' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            <Gauge size={12} className={activeDataTab === 'BSI' ? 'text-orange-400' : ''}/> BSI Physics
                                        </button>
                                        <button 
                                            onClick={() => setActiveDataTab('MARKET')} 
                                            className={`flex-none min-w-[120px] py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 snap-center ${activeDataTab === 'MARKET' ? 'bg-white/10 text-white shadow-inner border border-white/10' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            <DollarSign size={12} className={activeDataTab === 'MARKET' ? 'text-green-500' : ''}/> Market ROI
                                        </button>
                                    </div>

                                    {/* Active Component Render */}
                                    <div className="w-full mt-4 transition-all duration-300">
                                        {activeDataTab === 'STYLE' && (
                                            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                                                <StyleAnalysis playerName={activeMobilePlayer === 'A' ? playerAData.player.last_name : playerBData.player.last_name} />
                                            </div>
                                        )}
                                        {activeDataTab === 'BSI' && (
                                            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                                                <BsiSpeedPerformance playerName={activeMobilePlayer === 'A' ? playerAData.player.last_name : playerBData.player.last_name} />
                                            </div>
                                        )}
                                        {activeDataTab === 'MARKET' && (
                                            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                                                <MarketOddsPerformance playerName={activeMobilePlayer === 'A' ? playerAData.player.last_name : playerBData.player.last_name} />
                                            </div>
                                        )}
                                    </div>
                                </div>

                          </div>
                      </div>

                      {/* --- DESKTOP LAYOUT --- */}
                      <div className="hidden lg:grid grid-cols-12 gap-8 items-start">
                          
                          {/* COL 1: THE VERDICT */}
                          <div className="col-span-4 sticky top-24 flex flex-col items-center">
                              <InternalMatchupCard playerA={{ name: playerAData.player.last_name, image: playerAData.player.profile_image_url, country: playerAData.player.country, id: playerAData.player.id }} playerB={{ name: playerBData.player.last_name, image: playerBData.player.profile_image_url, country: playerBData.player.country, id: playerBData.player.id }} prediction={analysisResult} context={{ surface: finalSurface, bsi: finalBsi }} isAnalyzing={analyzing} />
                              <div className="w-full max-w-[400px]">
                                  <SaveVaultButton />
                              </div>
                          </div>

                          {/* COL 2: THE DATA CORE */}
                          <div className="col-span-4 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                                <div className="bg-[#1a1d26] p-8 rounded-[2.5rem] border border-white/10 shadow-[0_0_50px_-20px_rgba(132,204,22,0.15)] flex flex-col items-center w-full relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 h-40 w-40 bg-tennis-lime/5 blur-[80px]" />
                                    <div className="mb-8 flex w-full items-center justify-between border-b border-white/5 pb-4">
                                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 flex items-center gap-2"><Activity size={16} className="text-tennis-lime"/> {t('matchup.headers.matrix')}</div>
                                        <div className="flex gap-4">
                                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-500"><div className="h-1.5 w-1.5 rounded-full bg-tennis-lime"></div>{playerAData.player.last_name}</div>
                                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-500"><div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>{playerBData.player.last_name}</div>
                                        </div>
                                    </div>
                                    <div className="scale-110 mb-4">
                                        <OverlappingRadar skillsA={playerAData.skills} skillsB={playerBData.skills} />
                                    </div>
                                </div>

                                <div className="rounded-[2.5rem] border border-white/5 bg-[#1a1d26] p-8 shadow-2xl relative overflow-hidden">
                                     <div className="absolute bottom-0 left-0 h-32 w-32 bg-yellow-400/5 blur-[60px]" />
                                    <h3 className="mb-8 flex items-center gap-3 text-xs font-black uppercase tracking-[0.4em] text-white"><Zap size={20} className="text-yellow-400"/> {t('matchup.headers.dominance')}</h3>
                                    <div className="space-y-6">
                                        <StatBattleBar label={t('matchup.metrics.service')} valA={playerAData.skills?.serve || 50} valB={playerBData.skills?.serve || 50} />
                                        <StatBattleBar label={t('matchup.metrics.forehand')} valA={playerAData.skills?.forehand || 50} valB={playerBData.skills?.forehand || 50} />
                                        <StatBattleBar label={t('matchup.metrics.mental')} valA={playerAData.skills?.mental || 50} valB={playerBData.skills?.mental || 50} />
                                        <StatBattleBar label={t('matchup.metrics.physical')} valA={playerAData.skills?.speed || 50} valB={playerBData.skills?.speed || 50} />
                                    </div>
                                </div>
                          </div>

                          {/* COL 3: THE INTEL */}
                          <div className="col-span-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                                <div className="relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#1a1d26] p-10 shadow-2xl">
                                    <div className="absolute left-0 top-0 h-full w-1.5 bg-tennis-lime" />
                                    <h3 className="mb-8 flex items-center gap-4 text-xs font-black uppercase tracking-[0.4em] text-white"><BrainCircuit size={20} className="text-tennis-lime"/> {t('matchup.headers.briefing')}</h3>
                                    <div className="space-y-8">
                                        {(analysisResult?.deep_dive_text || '').split('\n\n').map((para: string, i: number) => {
                                            if(!para.trim()) return null;
                                            const icons = [<Target size={18} className="text-tennis-lime" />, <Shield size={18} className="text-blue-400" />, <Crosshair size={18} className="text-red-400" />];
                                            const titles = [t('matchup.analysisLabels.surface'), t('matchup.analysisLabels.tactical'), t('matchup.analysisLabels.verdict')];
                                            return (
                                                <div key={i} className="flex gap-4 group">
                                                    <div className="mt-1 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">{icons[i % 3]}</div>
                                                    <div>
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{titles[i % 3] || 'Analysis'}</div>
                                                        <p className="text-base font-medium text-gray-300 leading-relaxed">
                                                            {renderFormattedText(para)}
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                          </div>

                          {/* 🚀 NEU: COL 4: DEEP DIVE DATA EXPLORER (FULL WIDTH SIDE-BY-SIDE) */}
                          <div className="col-span-12 mt-16 mb-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
                              
                              <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 pl-4 pr-2">
                                  <div className="flex items-center gap-4 w-full md:w-auto">
                                      <Activity className="text-tennis-lime" size={28} />
                                      <h3 className="text-xl font-black uppercase tracking-[0.4em] text-white">Historical Intel</h3>
                                      <div className="h-px bg-white/5 flex-1 md:hidden ml-4"></div>
                                  </div>
                                  
                                  {/* Apple-like Desktop Tab Switcher */}
                                  <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/10 shadow-lg shrink-0">
                                        <button 
                                            onClick={() => setActiveDataTab('STYLE')} 
                                            className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeDataTab === 'STYLE' ? 'bg-white/10 text-white shadow-inner border border-white/5' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            <TrendingUp size={14} className={activeDataTab === 'STYLE' ? 'text-tennis-lime' : ''}/> Style Edge
                                        </button>
                                        <button 
                                            onClick={() => setActiveDataTab('BSI')} 
                                            className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeDataTab === 'BSI' ? 'bg-white/10 text-white shadow-inner border border-white/5' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            <Gauge size={14} className={activeDataTab === 'BSI' ? 'text-orange-400' : ''}/> BSI Physics
                                        </button>
                                        <button 
                                            onClick={() => setActiveDataTab('MARKET')} 
                                            className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeDataTab === 'MARKET' ? 'bg-white/10 text-white shadow-inner border border-white/5' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            <DollarSign size={14} className={activeDataTab === 'MARKET' ? 'text-green-500' : ''}/> Market ROI
                                        </button>
                                  </div>
                              </div>
                              
                              {/* 50/50 Split Grid (Dynamic content based on Tab) */}
                              <div className="grid grid-cols-2 gap-8 relative overflow-hidden min-h-[350px]">
                                  
                                  {/* Player A Column */}
                                  <div className="flex flex-col gap-3">
                                      <div className="flex items-center justify-between px-2">
                                          <span className="text-sm font-black text-white uppercase tracking-wider">{playerAData.player.last_name}</span>
                                          <span className="text-[9px] font-bold text-tennis-lime uppercase tracking-widest flex items-center gap-1.5">
                                              <Target size={12}/> {playerAData.player.play_style?.split(',')[0] || 'Unknown Style'}
                                          </span>
                                      </div>
                                      <div className="relative group flex-1">
                                          <div className="absolute -inset-1 bg-gradient-to-r from-tennis-lime/20 to-transparent rounded-[2.5rem] blur opacity-0 group-hover:opacity-100 transition duration-1000"></div>
                                          <div className="relative transition-all duration-300 h-full">
                                              {activeDataTab === 'STYLE' && (
                                                  <div className="animate-in fade-in slide-in-from-top-4 duration-500 h-full">
                                                      <StyleAnalysis playerName={playerAData.player.last_name} />
                                                  </div>
                                              )}
                                              {activeDataTab === 'BSI' && (
                                                  <div className="animate-in fade-in slide-in-from-top-4 duration-500 h-full">
                                                      <BsiSpeedPerformance playerName={playerAData.player.last_name} />
                                                  </div>
                                              )}
                                              {activeDataTab === 'MARKET' && (
                                                  <div className="animate-in fade-in slide-in-from-top-4 duration-500 h-full">
                                                      <MarketOddsPerformance playerName={playerAData.player.last_name} />
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                  </div>
                                  
                                  {/* Player B Column */}
                                  <div className="flex flex-col gap-3">
                                      <div className="flex items-center justify-between px-2">
                                          <span className="text-sm font-black text-white uppercase tracking-wider">{playerBData.player.last_name}</span>
                                          <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1.5">
                                              <Target size={12}/> {playerBData.player.play_style?.split(',')[0] || 'Unknown Style'}
                                          </span>
                                      </div>
                                      <div className="relative group flex-1">
                                          <div className="absolute -inset-1 bg-gradient-to-l from-blue-500/20 to-transparent rounded-[2.5rem] blur opacity-0 group-hover:opacity-100 transition duration-1000"></div>
                                          <div className="relative transition-all duration-300 h-full">
                                              {activeDataTab === 'STYLE' && (
                                                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                                                      <StyleAnalysis playerName={playerBData.player.last_name} />
                                                  </div>
                                              )}
                                              {activeDataTab === 'BSI' && (
                                                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                                                      <BsiSpeedPerformance playerName={playerBData.player.last_name} />
                                                  </div>
                                              )}
                                              {activeDataTab === 'MARKET' && (
                                                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                                                      <MarketOddsPerformance playerName={playerBData.player.last_name} />
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                  </div>

                              </div>
                          </div>

                      </div>

                  </div>
              )}
          </div>
      )}

      {/* ========================================================================= */}
      {/* 🚀 NEU: THE VAULT VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'vault' && (
          <div className="w-full animate-in fade-in duration-500">
              <div className="mb-8 flex items-center justify-between">
                  <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                      <Archive className="text-tennis-lime" size={28}/> The Vault
                  </h2>
                  <div className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5">
                      {savedMatchups.length} Records
                  </div>
              </div>
              
              {vaultLoading ? (
                  <div className="flex justify-center py-32"><Loader2 className="animate-spin text-tennis-lime" size={40}/></div>
              ) : savedMatchups.length === 0 ? (
                  <div className="bg-[#1a1d26]/50 border border-dashed border-white/10 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center shadow-inner mt-10">
                      <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center mb-6 border border-white/5">
                          <Archive size={32} className="text-gray-600" />
                      </div>
                      <h3 className="text-xl font-black text-white uppercase tracking-widest mb-3">Vault is Empty</h3>
                      <p className="text-sm text-gray-500 font-medium max-w-md leading-relaxed">
                          You haven't saved any tactical intel yet. Run an analysis in the Scanner and save it to build your personal library.
                      </p>
                      <button onClick={() => setActiveTab('scanner')} className="mt-8 px-8 py-4 bg-[#15171e] hover:border-tennis-lime border border-white/10 rounded-2xl text-xs font-black text-white hover:text-tennis-lime uppercase tracking-widest transition-all">
                          Return to Scanner
                      </button>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {savedMatchups.map(item => (
                          <div
                              key={item.id}
                              onClick={() => loadFromVault(item)}
                              className="bg-[#1a1d26] border border-white/5 hover:border-tennis-lime/50 rounded-[2rem] p-6 cursor-pointer group transition-[border-color,box-shadow,transform] hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(132,204,22,0.15)] relative overflow-hidden flex flex-col transform-gpu will-change-transform"
                          >
                              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-tennis-lime to-blue-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                              
                              <div className="flex justify-between items-start mb-6">
                                  <div className="flex flex-col gap-1">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                          {new Date(item.created_at).toLocaleDateString()}
                                      </span>
                                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md w-fit">
                                          {item.surface}
                                      </span>
                                  </div>
                                  <button 
                                      onClick={(e) => deleteFromVault(item.id, e)} 
                                      className="p-2.5 bg-white/5 hover:bg-red-500/20 text-gray-500 hover:text-red-500 rounded-xl transition-colors z-10"
                                  >
                                      <Trash2 size={16}/>
                                  </button>
                              </div>

                              <div className="flex-1 flex flex-col justify-center items-center text-center mb-8 mt-2">
                                  <div className="text-xl font-black text-white uppercase tracking-tighter truncate w-full">{item.player_a_name}</div>
                                  <div className="text-[10px] font-black text-tennis-lime italic my-2 tracking-[0.3em]">VS</div>
                                  <div className="text-xl font-black text-white uppercase tracking-tighter truncate w-full">{item.player_b_name}</div>
                              </div>

                              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Load Intel</span>
                                  <div className="h-8 w-8 bg-black/50 rounded-full flex items-center justify-center border border-white/5 group-hover:border-tennis-lime transition-colors">
                                      <ArrowRight size={14} className="text-gray-400 group-hover:text-tennis-lime group-hover:translate-x-0.5 transition-all" />
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {activeSlot && (
        <PlayerSelectModal isOpen={!!activeSlot} onClose={() => setActiveSlot(null)} onSelect={(p: any) => { if(activeSlot==='A') setPlayerA(p); else setPlayerB(p); setAnalysisResult(null); }} players={filteredPlayers} />
      )}
    </div>
  );
}