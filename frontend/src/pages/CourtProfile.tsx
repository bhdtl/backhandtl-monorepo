import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft,
  MapPin,
  Info,
  Wind,
  Thermometer,
  Zap,
  Layers,
  Activity,
  Trophy,
  Sparkles,
  Quote, // Neu für die Zitate
  Mic // Neu für den Empty-State
} from 'lucide-react';
import { ScrollToTop } from '../components/ScrollToTop';
import { LoadingScreen } from '../components/LoadingScreen';
import { useTranslation } from 'react-i18next';
import { useAccess } from '../hooks/useAccess';
import { PremiumLock } from '../components/PremiumLock'; 

// 🚀 SOTA: Neues Interface für die Multi-Quotes
interface PlayerQuote {
  quote: string;
  author: string;
}

interface Tournament {
  id: string;
  name: string;
  location: string;
  surface: 'Hard' | 'Clay' | 'Grass';
  bsi_rating: number;
  bounce: 'Low' | 'Medium' | 'High';
  notes?: string;
  player_quotes?: PlayerQuote[]; // 🚀 SOTA: Ersetzt die alten Einzel-Felder durch ein Array
  translations?: {
    [key: string]: {
      notes: string;
    };
  };
}

function CourtProfile() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { isElite, loading: accessLoading } = useAccess();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadTournament();
  }, [id]);

  const loadTournament = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setTournament(data);
      
      console.log("Loaded Tournament Data:", data);
      console.log("Available Translations:", data?.translations);
      
    } catch (error) {
      console.error('Error loading tournament:', error);
    } finally {
      setLoading(false);
    }
  };

  const localizedNotes = useMemo(() => {
    if (!tournament) return '';

    const currentLang = i18n.language?.split('-')[0] || 'en';

    if (currentLang === 'en') {
        return tournament.notes;
    }

    if (
      tournament.translations && 
      tournament.translations[currentLang] && 
      tournament.translations[currentLang].notes
    ) {
      return tournament.translations[currentLang].notes;
    }

    return tournament.notes || t('courtProfile.noData');
  }, [tournament, i18n.language, t]); 

  // Helper für Farben (SOTA Clean Code Pattern)
  const getBounceColor = (bounce: string) => {
     if (bounce === 'High') return 'text-green-400 bg-green-400/10 border-green-400/20';
     if (bounce === 'Low') return 'text-red-400 bg-red-400/10 border-red-400/20';
     return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
  };

  if (accessLoading) return <LoadingScreen message="Verifying Access..." />;
  if (loading) return <LoadingScreen message={t('courtProfile.analyzing')} />;

  if (!tournament) return (
    <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-8 text-center text-white">
      <div className="flex flex-col items-center gap-4">
          <Info size={48} className="text-gray-600" />
          <p className="text-xl font-bold">{t('courtProfile.notFound')}</p>
          <button onClick={() => navigate('/database')} className="text-tennis-lime hover:underline">Return to Database</button>
      </div>
    </div>
  );

  // Zitate sicher laden
  const quotes = tournament.player_quotes || [];

  return (
    <div className="h-screen w-full bg-[#0f1115] overflow-y-auto overflow-x-hidden relative selection:bg-tennis-lime/30 selection:text-tennis-lime scroll-smooth">
      <ScrollToTop />

      {/* Background Ambience */}
      <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vh] bg-tennis-lime/5 blur-[150px] rounded-full -z-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vh] bg-blue-500/5 blur-[150px] rounded-full -z-10 pointer-events-none" />

      <div className="pt-8 px-4 max-w-5xl mx-auto pb-32">

      <PremiumLock
        isLocked={!isElite}
        minTier="ELITE"
        title="Elite Court Analysis"
        description="Access detailed court profiles with professional insights and surface characteristics. Upgrade to Elite for complete court intelligence."
        blurAmount="blur-lg"
      >
        
        {/* Navigation Header - Share Button Removed */}
        <div className="flex justify-between items-center mb-8">
            <button 
              onClick={() => navigate(-1)}
              className="p-3 bg-white/5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-white/5 hover:border-white/20 active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            
            {/* Platzhalter div, damit das Layout stabil bleibt */}
            <div />
        </div>

        {/* Hero Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-8 md:mb-12">
          <div className="flex-1">
            {/* AI BADGE UPDATE */}
            <div className="flex items-center gap-2 text-tennis-lime font-black text-[10px] uppercase tracking-[0.3em] mb-4 py-1 px-3 bg-tennis-lime/10 w-fit rounded-full border border-tennis-lime/20">
              <Sparkles size={12} /> AI CALCULATED STATS
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white uppercase tracking-tighter leading-[0.9] mb-6 drop-shadow-2xl">
              {tournament.name}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-gray-400">
              <div className="flex items-center gap-2 font-medium bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                <MapPin size={16} className="text-gray-500" /> 
                <span className="text-sm text-gray-200">{tournament.location}</span>
              </div>
              
              {/* Desktop Only Badges (Hidden on Mobile to reduce clutter) */}
              <span className="hidden md:block w-1 h-1 bg-gray-700 rounded-full" />
              <div className={`hidden md:block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border ${
                tournament.surface === 'Clay' ? 'text-orange-400 border-orange-400/30 bg-orange-400/5' :
                tournament.surface === 'Grass' ? 'text-green-400 border-green-400/30 bg-green-400/5' :
                'text-blue-400 border-blue-400/30 bg-blue-400/5'
              }`}>
                {tournament.surface} Court
              </div>
            </div>
          </div>

          {/* Key Metrics Card - DESKTOP ONLY (Hidden on Mobile) */}
          <div className="hidden md:flex bg-[#1a1d26]/80 backdrop-blur-xl p-6 rounded-3xl border border-white/10 items-center gap-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="text-center relative z-10">
              {/* AI BSI LABEL UPDATE */}
              <div className="text-[9px] font-black text-gray-500 uppercase mb-1 tracking-widest">AI BSI RATING</div>
              <div className="text-4xl md:text-5xl font-black text-white tracking-tighter">{tournament.bsi_rating.toFixed(1)}</div>
            </div>
            
            <div className="w-px h-12 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
            
            <div className="text-center relative z-10">
              <div className="text-[9px] font-black text-gray-500 uppercase mb-1 tracking-widest">{t('courtProfile.bounce')}</div>
              <div className={`text-xl md:text-2xl font-black uppercase tracking-tight ${
                 tournament.bounce === 'High' ? 'text-green-400' : 
                 tournament.bounce === 'Low' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {tournament.bounce}
              </div>
            </div>
          </div>
        </div>

        {/* --- DYNAMIC CONTENT SWAP SECTION --- */}

        {/* 1. DESKTOP VIEW: Technical Data (Wind, Temp, Zap) */}
        <div className="hidden md:grid grid-cols-3 gap-4 mb-12">
            <div className="bg-[#1a1d26] p-5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-colors group flex flex-col gap-3">
                <div className="flex justify-between items-start">
                    <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 group-hover:scale-110 transition-transform"><Wind size={20}/></div>
                </div>
                <div>
                    <div className="text-white font-bold text-sm mb-1">{t('courtProfile.cards.resistance.title')}</div>
                    <p className="text-gray-500 text-xs leading-relaxed">{t('courtProfile.cards.resistance.desc')}</p>
                </div>
            </div>

            <div className="bg-[#1a1d26] p-5 rounded-2xl border border-white/5 hover:border-orange-500/30 transition-colors group flex flex-col gap-3">
                <div className="flex justify-between items-start">
                    <div className="p-2.5 bg-orange-500/10 rounded-xl text-orange-400 group-hover:scale-110 transition-transform"><Thermometer size={20}/></div>
                </div>
                <div>
                    <div className="text-white font-bold text-sm mb-1">{t('courtProfile.cards.temp.title')}</div>
                    <p className="text-gray-500 text-xs leading-relaxed">{t('courtProfile.cards.temp.desc')}</p>
                </div>
            </div>

            <div className="bg-[#1a1d26] p-5 rounded-2xl border border-white/5 hover:border-tennis-lime/30 transition-colors group flex flex-col gap-3">
                <div className="flex justify-between items-start">
                    <div className="p-2.5 bg-tennis-lime/10 rounded-xl text-tennis-lime group-hover:scale-110 transition-transform"><Zap size={20}/></div>
                </div>
                <div>
                    <div className="text-white font-bold text-sm mb-1">{t('courtProfile.cards.efficacy.title')}</div>
                    <p className="text-gray-500 text-xs leading-relaxed">{t('courtProfile.cards.efficacy.desc')}</p>
                </div>
            </div>
        </div>

        {/* 2. MOBILE VIEW: Vital Stats (Surface, Bounce, BSI) */}
        <div className="grid md:hidden grid-cols-2 gap-3 mb-8">
            {/* Card 1: Surface */}
            <div className="col-span-1 bg-[#1a1d26] p-4 rounded-2xl border border-white/5 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2 text-gray-400">
                    <Layers size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Surface</span>
                </div>
                <div className={`text-lg font-black uppercase ${
                    tournament.surface === 'Clay' ? 'text-orange-400' :
                    tournament.surface === 'Grass' ? 'text-green-400' : 'text-blue-400'
                }`}>
                    {tournament.surface}
                </div>
            </div>

            {/* Card 2: Rating */}
            <div className="col-span-1 bg-[#1a1d26] p-4 rounded-2xl border border-white/5 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2 text-gray-400">
                    <Trophy size={16} />
                    {/* MOBILE AI BSI LABEL UPDATE */}
                    <span className="text-[10px] font-black uppercase tracking-widest">AI BSI RATING</span>
                </div>
                <div className="text-lg font-black text-white flex items-end gap-1">
                    {tournament.bsi_rating.toFixed(1)}
                    <span className="text-[10px] text-gray-500 mb-1 font-bold">/10</span>
                </div>
            </div>

            {/* Card 3: Bounce (Full Width on Mobile) */}
            <div className={`col-span-2 p-4 rounded-2xl border flex items-center justify-between ${getBounceColor(tournament.bounce)}`}>
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-lg">
                        <Activity size={18} />
                    </div>
                    <div>
                        <div className="text-[10px] font-black uppercase opacity-70 tracking-widest">Bounce Type</div>
                        <div className="text-lg font-black uppercase leading-none mt-0.5">{tournament.bounce}</div>
                    </div>
                 </div>
                 <div className="h-full flex items-center">
                    <div className={`w-2 h-2 rounded-full ${
                        tournament.bounce === 'High' ? 'bg-green-400 animate-pulse' : 
                        tournament.bounce === 'Low' ? 'bg-red-400 animate-pulse' : 'bg-yellow-400 animate-pulse'
                    }`} />
                 </div>
            </div>
        </div>

        {/* Detailed Analysis Section */}
        <div className="bg-[#1a1d26] rounded-[2rem] border border-white/5 p-6 md:p-10 shadow-2xl relative overflow-hidden mb-8">
          <Info className="absolute -top-6 -right-6 text-white/[0.02] rotate-12" size={200} />
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-tennis-lime/50 to-transparent" />

          <h2 className="text-white font-black text-lg md:text-2xl uppercase mb-6 flex items-center gap-3 relative z-10 tracking-tight">
            <span className="w-1.5 h-6 md:w-2 md:h-8 bg-tennis-lime rounded-sm"></span>
            {t('courtProfile.conditionsHeader')}
          </h2>
          
          <div className="prose prose-invert max-w-none relative z-10">
            <p className="text-gray-300 leading-relaxed text-sm md:text-lg whitespace-pre-wrap font-light tracking-wide">
              {localizedNotes}
            </p>
          </div>
        </div>

        {/* 🚀 SOTA: PLAYER INSIGHTS / LOCKER ROOM INTEL (MULTI QUOTES) */}
        <div>
            <h3 className="text-white font-black text-lg md:text-xl uppercase mb-5 flex items-center gap-3 tracking-tight ml-2">
                <Quote className="text-tennis-lime" size={20} />
                Locker Room Intel
            </h3>
            
            {quotes.length > 0 ? (
                // 🚀 Hier iterieren wir jetzt über das Array!
                <div className="space-y-4">
                  {quotes.map((q, idx) => (
                    <div key={idx} className="bg-[#1a1d26]/80 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors shadow-xl">
                        {/* Großes Icon im Hintergrund als Deko */}
                        <div className="absolute -top-4 -left-4 text-white/[0.03] group-hover:text-white/[0.05] transition-colors pointer-events-none">
                            <Quote size={80} className="rotate-180" />
                        </div>
                        
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <p className="text-gray-300 italic text-sm md:text-base leading-relaxed font-medium flex-1">
                                "{q.quote}"
                            </p>
                            <div className="flex flex-col items-start md:items-end justify-center shrink-0">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-tennis-lime bg-tennis-lime/10 px-3 py-1 rounded-full border border-tennis-lime/20">
                                    {q.author || "Tour Professional"}
                                </span>
                            </div>
                        </div>
                    </div>
                  ))}
                </div>
            ) : (
                // State 2: Empty State (Sieht arbeitend/aktiv aus, statt kaputt/leer)
                <div className="bg-[#1a1d26]/30 backdrop-blur-md rounded-[2rem] p-8 border border-dashed border-white/10 flex flex-col items-center justify-center text-center opacity-80 shadow-inner">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                        <Mic className="text-gray-500" size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 mb-2">Awaiting Intel</span>
                    <p className="text-xs md:text-sm text-gray-600 font-medium max-w-sm">
                        Neural net is scanning recent press conferences and post-match interviews for surface insights.
                    </p>
                </div>
            )}
        </div>
        
        {/* Footer info */}
        <div className="mt-16 text-center text-gray-600 text-xs font-mono uppercase tracking-widest opacity-50">
            Tournament ID: {tournament.id.split('-')[0]} • System v2.4
        </div>

      </PremiumLock>
      </div>
    </div>
  );
}

export default CourtProfile;