import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Gauge, MapPin, Search, ArrowUpDown, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ScrollToTop } from '../components/ScrollToTop';
import { trackEvent } from '../lib/analytics';
import { LoadingScreen } from '../components/LoadingScreen';
import { useTranslation } from 'react-i18next';
import { useAccess } from '../hooks/useAccess';
import { PremiumLock } from '../components/PremiumLock';

interface Tournament {
  id: string;
  name: string;
  location: string;
  surface: 'Hard' | 'Clay' | 'Grass';
  bsi_rating: number;
  bounce: 'Low' | 'Medium' | 'High';
  notes?: string;
}

export function CourtDatabase() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const { isElite, loading: accessLoading } = useAccess();
  const navigate = useNavigate();
  
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [surfaceFilter, setSurfaceFilter] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
      filtered = filtered.filter(t => t.surface === surfaceFilter);
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
    switch (surface) {
      case 'Clay': return 'text-orange-400 border-orange-400/30 bg-orange-400/10';
      case 'Grass': return 'text-green-400 border-green-400/30 bg-green-400/10';
      default: return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
    }
  };

  if (accessLoading) return <LoadingScreen message="Verifying Access..." />;
  if (loading) return <LoadingScreen message={t('courtDatabase.loading')} />;

  return (
    <div className="min-h-screen py-8 px-4 bg-[#0f1115]">
      <div className="max-w-7xl mx-auto">
        <ScrollToTop />

        {/* HEADER SECTION */}
        <div className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-3 mb-2 uppercase tracking-tight">
            <Gauge className="text-tennis-lime" size={32} />
            {t('courtDatabase.title')}
          </h1>
          <p className="text-gray-400 font-medium max-w-2xl text-sm md:text-base leading-relaxed">
            AI analysed court speed index and tournament conditions.
          </p>
        </div>

        <PremiumLock
          isLocked={!isElite}
          minTier="ELITE"
          title="Elite Court Intelligence"
          description="Access our comprehensive database of professional court surfaces and their unique characteristics. Upgrade to Elite for data-driven court analysis."
          blurAmount="blur-lg"
        >
        {/* CONTROLS SECTION - Responsive Layout */}
        <div className="bg-[#1a1d26] p-4 rounded-2xl border border-white/5 mb-6 flex flex-col lg:flex-row gap-4 shadow-2xl backdrop-blur-sm">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-tennis-lime transition-colors" size={20} />
            <input
              type="text"
              placeholder={t('courtDatabase.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0f1115] text-white pl-12 pr-4 py-3.5 rounded-xl border border-white/5 focus:border-tennis-lime/50 focus:outline-none transition-all placeholder:text-gray-600 font-medium"
            />
          </div>
            
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative w-full sm:w-auto">
              <select
                value={surfaceFilter}
                onChange={(e) => handleSurfaceFilterChange(e.target.value)}
                className="w-full sm:w-auto appearance-none bg-[#0f1115] text-white pl-10 pr-12 py-3.5 rounded-xl border border-white/5 focus:border-tennis-lime/50 focus:outline-none transition-all font-bold text-sm min-w-[160px] cursor-pointer hover:bg-white/5"
              >
                <option value="All">{t('courtDatabase.filters.allSurfaces')}</option>
                <option value="Hard">{t('courtDatabase.filters.hard')}</option>
                <option value="Clay">{t('courtDatabase.filters.clay')}</option>
                <option value="Grass">{t('courtDatabase.filters.grass')}</option>
              </select>
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
            </div>

            <button
              onClick={handleSortChange}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#0f1115] text-white px-6 py-3.5 rounded-xl border border-white/5 hover:border-tennis-lime/50 hover:bg-white/5 transition-all font-bold text-sm shadow-lg active:scale-95"
            >
              <ArrowUpDown size={16} className={`text-tennis-lime transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
              {sortOrder === 'desc' ? t('courtDatabase.filters.fastestFirst') : t('courtDatabase.filters.slowestFirst')}
            </button>
          </div>
        </div>

        {/* CONTENT SECTION - HYBRID APPROACH */}
        <div className="bg-[#1a1d26] rounded-2xl border border-white/5 overflow-hidden shadow-2xl relative min-h-[400px]">
            
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
                {filteredTournaments.map((t) => (
                  <tr 
                    key={t.id} 
                    onClick={() => handleCourtClick(t)}
                    className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-white font-bold group-hover:text-tennis-lime transition-colors">{t.name}</span>
                        {t.notes && <span className="text-[10px] text-gray-500 font-medium mt-0.5 line-clamp-1 italic">{t.notes}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-gray-400 font-medium text-sm">
                        <MapPin size={14} className="text-gray-600" /> {t.location}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`inline-block px-3 py-1 rounded-md text-[10px] font-black uppercase border ${getSurfaceColor(t.surface)}`}>
                        {t.surface}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg font-black text-sm min-w-[48px] border ${getBSIBadgeColor(t.bsi_rating)}`}>
                        {t.bsi_rating.toFixed(1)}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          t.bounce === 'High' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                          t.bounce === 'Low' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                          'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]'
                        }`} />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.bounce}</span>
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
            {filteredTournaments.map((t) => (
               <div 
                 key={t.id}
                 onClick={() => handleCourtClick(t)}
                 className="p-5 active:bg-white/5 transition-colors cursor-pointer"
               >
                 <div className="flex justify-between items-start mb-3">
                   <div>
                     <h3 className="text-white font-bold text-lg leading-tight mb-1">{t.name}</h3>
                     <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                        <MapPin size={12} /> {t.location}
                     </div>
                   </div>
                   <div className={`px-2.5 py-1 rounded-md font-black text-xs border ${getBSIBadgeColor(t.bsi_rating)}`}>
                      {t.bsi_rating.toFixed(1)}
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-3 mt-4">
                    <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase border ${getSurfaceColor(t.surface)}`}>
                      {t.surface}
                    </span>
                    <div className="h-4 w-px bg-white/10"></div>
                    <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          t.bounce === 'High' ? 'bg-green-500' :
                          t.bounce === 'Low' ? 'bg-red-500' :
                          'bg-yellow-500'
                        }`} />
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{t.bounce} Bounce</span>
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
                Verified by Tennis AI Engine
            </p>
        </div>
        </PremiumLock>
      </div>
    </div>
  );
}