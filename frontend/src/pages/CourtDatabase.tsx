import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Gauge, MapPin, Search, ArrowUpDown, Filter, ChevronDown, ChevronRight,
  X, HelpCircle, TrendingUp, BarChart3
} from 'lucide-react';
import { ScrollToTop } from '../components/ScrollToTop';
import { trackEvent } from '../lib/analytics';
import { LoadingScreen } from '../components/LoadingScreen';
import { useTranslation } from 'react-i18next';
import { useAccess } from '../hooks/useAccess';
import { PremiumLock } from '../components/PremiumLock';
import { motion, useDragControls, AnimatePresence } from 'framer-motion';

interface Tournament {
  id: string;
  name: string;
  location: string;
  surface: string;
  bsi_rating: number;
  bounce: string;
  notes?: string;
}

export const translateSurface = (surface: string, t: any) => {
  if (!surface) return '';
  const normalized = surface.toLowerCase().replace(/\s+/g, '');
  let key = normalized;
  if (normalized === 'redclay') key = 'redClay';
  else if (normalized === 'greenclay') key = 'greenClay';
  else if (normalized === 'hardcourtindoor') key = 'hardCourtIndoor';
  else if (normalized === 'hardcourtoutdoor') key = 'hardCourtOutdoor';
  return t(`courtDatabase.surfaces.${key}`, surface);
};

export const translateBounce = (bounce: string, t: any) => {
  if (!bounce) return '';
  const normalized = bounce.toLowerCase();
  return t(`courtDatabase.bounces.${normalized}`, bounce);
};

function CourtDatabaseBriefing({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [step, setStep] = useState(0);
  const dragControls = useDragControls();
  const { t } = useTranslation();
  
  useEffect(() => { if (isOpen) setStep(0); }, [isOpen]);

  const steps = [
      {
          title: t('courtDatabase.tutorial.step1Title', 'BSI Rating (Speed)'),
          desc: t('courtDatabase.tutorial.step1Desc', "BSI rating measures how fast a tennis court plays, from 1.0 (slow clay) to 10.0 (fast grass). Slow courts favor long rallies, fast courts favor servers."),
          icon: <Gauge size={28} className="text-tennis-lime" />
      },
      {
          title: t('courtDatabase.tutorial.step2Title', 'Bounce Level'),
          desc: t('courtDatabase.tutorial.step2Desc', "Different surfaces bounce balls higher or lower. Clay produces high, slow bounces, whereas grass produces low, fast, skidding bounces."),
          icon: <TrendingUp size={28} className="text-blue-400" />
      },
      {
          title: t('courtDatabase.tutorial.step3Title', 'Tactical Advantage'),
          desc: t('courtDatabase.tutorial.step3Desc', "A top player on Clay can lose on Grass against a lower-ranked player who loves fast courts. We simulate these surface-specific ELO variables."),
          icon: <BarChart3 size={28} className="text-purple-400" />
      }
  ];

  const nextStep = () => {
      if (step < steps.length - 1) setStep(step + 1);
      else onClose();
  };

  return (
      <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-6">
          <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer" 
              onClick={onClose}
          />
          <motion.div 
              drag={window.innerWidth < 768 ? "y" : false}
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.1, bottom: 0.8 }}
              onDragEnd={(_e, info) => {
                  if (info.offset.y > 150) {
                      onClose();
                  }
              }}
              initial={window.innerWidth < 768 ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
              animate={window.innerWidth < 768 ? { y: 0 } : { scale: 1, opacity: 1 }}
              exit={window.innerWidth < 768 ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative bg-[#1c1c1e] border border-white/5 w-full md:max-w-md rounded-t-[2.5rem] md:rounded-[2rem] p-8 shadow-2xl overflow-hidden flex flex-col items-center text-center z-10"
          >
              <div 
                  onPointerDown={(e) => dragControls.start(e)}
                  className="w-full flex justify-center py-2 -mt-4 mb-2 cursor-grab active:cursor-grabbing select-none touch-none"
              >
                  <div className="w-10 h-1 bg-white/10 rounded-full" />
              </div>

              <div className="flex gap-2.5 mb-8">
                  {steps.map((_, i) => (
                      <div key={i} className={`h-1.5 w-10 rounded-full transition-all duration-300 ${i <= step ? 'bg-tennis-lime shadow-[0_0_8px_rgba(132,204,22,0.3)]' : 'bg-white/10'}`} />
                  ))}
              </div>

              <div className="h-16 w-16 rounded-2xl bg-black/35 border border-white/5 flex items-center justify-center mb-6 shadow-inner animate-in zoom-in duration-300" key={step}>
                  {steps[step].icon}
              </div>

              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2 animate-in fade-in slide-in-from-bottom-2 duration-300" key={`t-${step}`}>{steps[step].title}</h3>
              <p className="text-gray-400 text-sm font-medium leading-relaxed mb-8 h-24 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-75" key={`d-${step}`}>
                  {steps[step].desc}
              </p>

              <button 
                  onClick={nextStep} 
                  className="w-full py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
              >
                  {step < steps.length - 1 ? t('common.nextStep', 'Next Step') : t('common.getStarted', 'Get Started')}
              </button>
          </motion.div>
      </div>
  );
}

export function CourtDatabase() {
  const { t } = useTranslation();
  const { isElite, loading: accessLoading } = useAccess();
  const navigate = useNavigate();
  
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [surfaceFilter, setSurfaceFilter] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showTutorial, setShowTutorial] = useState(false);

  // SOTA TELEMETRY: Track Intent & Paywall hits on mount
  useEffect(() => {
    if (!accessLoading) {
        if (!isElite) {
            trackEvent('court_database_paywall_view', {});
        } else {
            trackEvent('court_database_view', {});
        }
    }
  }, [isElite, accessLoading]);

  useEffect(() => {
    loadTournaments();
  }, []);

  // Analytics Tracker für die Text-Suche (mit 1s Debounce)
  useEffect(() => {
    if (searchTerm.trim().length > 2) {
      const timer = setTimeout(() => {
        trackEvent('court_search', { 
          query: searchTerm, 
          surface_filter: surfaceFilter 
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [searchTerm, surfaceFilter]);

  const loadTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name, location, surface, bsi_rating, bounce, notes')
        .order('bsi_rating', { ascending: false });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error('Error loading tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Performance Optimization: useMemo statt useEffect für Filtering
  const filteredTournaments = useMemo(() => {
    let filtered = [...tournaments];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(term) ||
        t.location.toLowerCase().includes(term)
      );
    }

    if (surfaceFilter !== 'All') {
      filtered = filtered.filter(t => {
        const s = t.surface.toLowerCase();
        if (surfaceFilter === 'Hard') return s.includes('hard');
        if (surfaceFilter === 'Clay') return s.includes('clay');
        if (surfaceFilter === 'Grass') return s.includes('grass');
        return false;
      });
    }

    filtered.sort((a, b) => {
      return sortOrder === 'desc'
        ? b.bsi_rating - a.bsi_rating
        : a.bsi_rating - b.bsi_rating;
    });

    return filtered;
  }, [tournaments, searchTerm, surfaceFilter, sortOrder]);

  const handleCourtClick = (tournament: Tournament) => {
    trackEvent('court_profile_view', { 
      court_id: tournament.id, 
      court_name: tournament.name,
      bsi_rating: tournament.bsi_rating
    });
    navigate(`/court/${tournament.id}`);
  };

  // SOTA TELEMETRY: Handle Dropdown changes explicitly
  const handleSurfaceFilterChange = (val: string) => {
    setSurfaceFilter(val);
    trackEvent('court_filters_refined', {
        surface_selected: val,
        sort_order: sortOrder
    });
  };

  // SOTA TELEMETRY: Handle Sort changes explicitly
  const handleSortChange = () => {
      const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
      setSortOrder(newOrder);
      trackEvent('court_filters_refined', {
          surface_selected: surfaceFilter,
          sort_order: newOrder
      });
  };

  const getBSIBadgeColor = (rating: number) => {
    if (rating <= 3) return 'bg-blue-500/10 text-blue-400 border-blue-500/20'; 
    if (rating <= 7) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    return 'bg-red-500/10 text-red-400 border-red-500/20';
  };

  const getSurfaceColor = (surface: string) => {
    if (!surface) return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
    const s = surface.toLowerCase();
    if (s.includes('clay')) return 'text-orange-400 border-orange-400/30 bg-orange-400/10';
    if (s.includes('grass')) return 'text-green-400 border-green-400/30 bg-green-400/10';
    return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
  };

  if (accessLoading) return <LoadingScreen message="Verifying Access..." />;
  if (loading) return <LoadingScreen message={t('courtDatabase.loading')} />;

  return (
    <div className="min-h-screen py-8 px-4 bg-[#0f1115]">
      <div className="max-w-7xl mx-auto">
        <ScrollToTop />
        <AnimatePresence>
          {showTutorial && (
            <CourtDatabaseBriefing isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
          )}
        </AnimatePresence>

        {/* HEADER SECTION */}
        <div className="mt-8 md:mt-12 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-tennis-lime font-black text-xs uppercase tracking-widest mb-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-tennis-lime opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-tennis-lime"></span>
                </span>
                <span>{t('courtDatabase.header.badge', 'COURT INDEX')}</span>
               </div>
               
               <div className="flex items-center gap-2">
                 <button
                     onClick={() => setShowTutorial(true)}
                     className="flex items-center justify-center w-11 h-11 bg-white/[0.04] rounded-full border border-white/[0.06] hover:bg-white/[0.08] transition-colors text-gray-400 hover:text-white shadow-sm"
                     title="How it works"
                 >
                   <HelpCircle size={18} />
                 </button>
               </div>
             </div>
             <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                 <div className="flex-1">
                   <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none mb-2">{t('courtDatabase.title')}</h1>
                   <p className="text-gray-400 text-sm md:text-base font-medium max-w-2xl pl-1">{t('courtDatabase.subtitle')}</p>
                 </div>
             </div>
         </div>

        <PremiumLock
          isLocked={!isElite}
          minTier="ELITE"
          title={t('courtDatabase.premiumTitle')}
          description={t('courtDatabase.premiumDesc')}
          blurAmount="blur-lg"
        >
        {/* CONTROLS SECTION - Responsive Layout */}
        <div className="bg-[#1a1d26]/80 backdrop-blur-md p-4 rounded-2xl md:rounded-[2rem] border border-white/5 mb-6 flex flex-col lg:flex-row gap-4 shadow-2xl">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-tennis-lime transition-colors" size={20} />
            <input
              type="text"
              placeholder={t('courtDatabase.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0f1115] text-white pl-12 pr-12 py-3.5 rounded-xl border border-white/5 focus:border-tennis-lime/50 focus:outline-none transition-all placeholder:text-gray-600 font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
            
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="flex bg-black/40 p-1 rounded-xl md:rounded-2xl border border-white/5 w-full sm:w-auto overflow-x-auto scrollbar-none whitespace-nowrap">
              {['All', 'Hard', 'Clay', 'Grass'].map((surf) => (
                <button
                  key={surf}
                  onClick={() => handleSurfaceFilterChange(surf)}
                  className={`flex-1 sm:flex-none px-3.5 sm:px-5 py-2 rounded-lg md:rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                    surfaceFilter === surf
                      ? 'bg-tennis-lime text-black shadow-lg shadow-tennis-lime/10'
                      : 'text-gray-500 hover:text-white'
                  }`}
                >
                  {surf === 'All' ? t('courtDatabase.filters.allSurfaces', 'All') : t(`courtDatabase.filters.${surf.toLowerCase()}`, surf)}
                </button>
              ))}
            </div>

            <button
              onClick={handleSortChange}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-black/40 text-white px-6 py-3.5 rounded-xl md:rounded-2xl border border-white/5 hover:border-tennis-lime/30 transition-all font-black text-xs uppercase tracking-widest active:scale-95 shadow-lg shadow-black/25"
            >
              <ArrowUpDown size={14} className={`text-tennis-lime transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
              {sortOrder === 'desc' ? t('courtDatabase.filters.fastestFirst') : t('courtDatabase.filters.slowestFirst')}
            </button>
          </div>
        </div>

        {/* CONTENT SECTION - HYBRID APPROACH */}
        <div className="bg-[#1a1d26]/80 backdrop-blur-md rounded-2xl md:rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl relative min-h-[400px]">
            
          {/* 1. DESKTOP VIEW (Table) - Hidden on Mobile */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#12141a]/80 border-b border-white/5 text-gray-500 uppercase text-[10px] font-black tracking-[0.2em]">
                  <th className="px-6 py-5">{t('courtDatabase.table.tournament')}</th>
                  <th className="px-6 py-5">{t('courtDatabase.table.location')}</th>
                  <th className="px-6 py-5 text-center">{t('courtDatabase.table.surface')}</th>
                  <th className="px-6 py-5 text-center">{t('courtDatabase.table.bsi')}</th>
                  <th className="px-6 py-5 text-center">{t('courtDatabase.table.bounce')}</th>
                  <th className="px-6 py-5 text-right">{t('courtDatabase.table.details')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTournaments.map((court) => (
                  <tr 
                    key={court.id} 
                    onClick={() => handleCourtClick(court)}
                    className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-white font-bold group-hover:text-tennis-lime transition-colors">{court.name}</span>
                        {court.notes && <span className="text-[10px] text-gray-500 font-medium mt-0.5 line-clamp-1 italic">{court.notes}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-gray-400 font-medium text-sm">
                        <MapPin size={14} className="text-gray-600" /> {court.location}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`inline-block px-3 py-1 rounded-md text-[10px] font-black uppercase border ${getSurfaceColor(court.surface)}`}>
                        {translateSurface(court.surface, t)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg font-black text-sm min-w-[48px] border ${getBSIBadgeColor(court.bsi_rating)}`}>
                        {court.bsi_rating.toFixed(1)}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          court.bounce.toLowerCase() === 'high' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                          court.bounce.toLowerCase() === 'low' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                          'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]'
                        }`} />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{translateBounce(court.bounce, t)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center inline-flex group-hover:bg-tennis-lime group-hover:text-black transition-all">
                          <ChevronRight size={16} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 2. MOBILE VIEW (Cards) - Visible only on Mobile */}
          <div className="md:hidden flex flex-col divide-y divide-white/5">
            {filteredTournaments.map((court) => (
               <div 
                 key={court.id}
                 onClick={() => handleCourtClick(court)}
                 className="p-5 active:bg-white/5 transition-colors cursor-pointer"
               >
                 <div className="flex justify-between items-start mb-3">
                   <div>
                     <h3 className="text-white font-bold text-lg leading-tight mb-1">{court.name}</h3>
                     <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                        <MapPin size={12} /> {court.location}
                     </div>
                   </div>
                   <div className={`px-2.5 py-1 rounded-md font-black text-xs border ${getBSIBadgeColor(court.bsi_rating)}`}>
                      {court.bsi_rating.toFixed(1)}
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-3 mt-4">
                    <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase border ${getSurfaceColor(court.surface)}`}>
                      {translateSurface(court.surface, t)}
                    </span>
                    <div className="h-4 w-px bg-white/10"></div>
                    <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          court.bounce.toLowerCase() === 'high' ? 'bg-green-500' :
                          court.bounce.toLowerCase() === 'low' ? 'bg-red-500' :
                          'bg-yellow-500'
                        }`} />
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{translateBounce(court.bounce, t)}</span>
                    </div>
                 </div>
               </div>
            ))}
          </div>
            
          {/* EMPTY STATE */}
          {filteredTournaments.length === 0 && (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-gray-600 mb-2">
                <Search size={32} />
              </div>
              <p className="text-gray-500 font-bold uppercase text-sm tracking-widest">{t('courtDatabase.noResults')}</p>
              <button 
                onClick={() => { setSearchTerm(''); setSurfaceFilter('All'); }}
                className="text-tennis-lime text-xs font-bold hover:underline"
              >
                {t('courtDatabase.clearFilters')}
              </button>
            </div>
          )}
        </div>
        
        <div className="mt-6 text-center">
            <p className="text-[#343a46] text-[10px] uppercase font-black tracking-[0.2em]">
                {t('courtDatabase.verifiedBy')}
            </p>
        </div>
        </PremiumLock>
      </div>
    </div>
  );
}