import { useState, useEffect } from 'react';
import { Heart, SlidersHorizontal, ArrowUpDown, Lock, Zap, Bell, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PlayerCard } from '../components/PlayerCard';
import { ScrollToTop } from '../components/ScrollToTop';
import { trackEvent } from '../lib/analytics';
import { LoadingScreen } from '../components/LoadingScreen';
import { useTranslation } from 'react-i18next'; // 1. Import

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  country: string;
  play_style: string;
  surface_preference: string;
  profile_image_url: string;
  overall_rating?: number;
  tour: 'ATP' | 'WTA';
}

export function Watchlist({ onPlayerClick }: { onPlayerClick: (id: string) => void }) {
  const { t } = useTranslation(); // 2. Hook
  const { user } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'name' | 'rating'>('name');

  // Silicon Valley Veteran Normalization Logic
  const normalizePlayStyle = (style: string) => {
    if (!style) return '';
    if (style === 'Aggressive Baselines') return 'Aggressive Baseliner';
    return style;
  };

  useEffect(() => {
    if (user) {
        loadWatchlist();
        trackEvent('watchlist_view');
    }
    else setLoading(false);
  }, [user]);

  useEffect(() => {
    filterPlayers();
     
    if (ratingFilter > 0 || sortBy !== 'name') {
        trackEvent('watchlist_interaction', { 
            filter_rating: ratingFilter, 
            sort_method: sortBy 
        });
    }
  }, [ratingFilter, sortBy, players]);

  const loadWatchlist = async () => {
    if (!user) return;
    try {
      const { data: favorites } = await supabase.from('favorites').select('player_id').eq('user_id', user.id);
      if (favorites && favorites.length > 0) {
        const ids = favorites.map(f => f.player_id);
        const { data: playersData } = await supabase.from('players').select('*').in('id', ids);
        const { data: skillsData } = await supabase.from('player_skills').select('player_id, overall_rating').in('player_id', ids);
        
        const skillsMap = new Map(skillsData?.map(s => [s.player_id, s.overall_rating]) || []);
        
        // Data Normalization Step during merge
        const merged = playersData?.map(p => ({ 
          ...p, 
          play_style: normalizePlayStyle(p.play_style), // Fix: Mapping consistent strings
          overall_rating: skillsMap.get(p.id) || 0 
        })) || [];
        
        setPlayers(merged as Player[]);
      } else {
        setPlayers([]);
      }
    } catch (e) { 
      console.error('Watchlist System Error:', e); 
    } finally { 
      setLoading(false); 
    }
  };

  const filterPlayers = () => {
    let res = [...players];
    if (ratingFilter > 0) res = res.filter(p => (p.overall_rating || 0) >= ratingFilter);
    res.sort((a, b) => sortBy === 'rating' ? (b.overall_rating || 0) - (a.overall_rating || 0) : a.last_name.localeCompare(b.last_name));
    setFilteredPlayers(res);
  };

  const handlePlayerClick = (playerId: string) => {
    trackEvent('watchlist_player_click', { player_id: playerId });
    onPlayerClick(playerId);
  };

  // --- 1. LOGGED OUT STATE (ELITE PRE-AUTH UI) ---
  if (!user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 animate-in fade-in duration-700">
        <div className="max-w-3xl w-full">
          <div className="relative">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-tennis-lime/5 blur-[100px] rounded-full"></div>
            
            <div className="relative bg-[#1a1d26]/40 backdrop-blur-md border border-white/5 rounded-[40px] p-8 md:p-16 text-center shadow-2xl">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-tennis-lime/10 border border-tennis-lime/20 rounded-3xl mb-8">
                <Heart className="text-tennis-lime fill-tennis-lime/20" size={40} />
              </div>

              <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-6 uppercase tracking-tighter">
                {t('watchlist.loggedOut.titleLine1')} <br />
                <span className="text-tennis-lime italic text-3xl md:text-4xl">{t('watchlist.loggedOut.titleLine2')}</span>
              </h1>

              <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed mb-12 font-medium">
                {t('watchlist.loggedOut.description')}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
                <div className="bg-black/20 p-5 rounded-2xl border border-white/5 flex flex-col items-center">
                  <Bell className="text-tennis-lime mb-2" size={20} />
                  <div className="text-white font-bold text-[10px] uppercase tracking-wider">{t('watchlist.features.alerts')}</div>
                </div>
                <div className="bg-black/20 p-5 rounded-2xl border border-white/5 flex flex-col items-center">
                  <Zap className="text-tennis-lime mb-2" size={20} />
                  <div className="text-white font-bold text-[10px] uppercase tracking-wider">{t('watchlist.features.access')}</div>
                </div>
                <div className="bg-black/20 p-5 rounded-2xl border border-white/5 flex flex-col items-center">
                  <Users className="text-tennis-lime mb-2" size={20} />
                  <div className="text-white font-bold text-[10px] uppercase tracking-wider">{t('watchlist.features.scouting')}</div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 text-gray-500 font-bold text-[10px] uppercase tracking-[0.3em]">
                  <Lock size={12} /> {t('watchlist.loggedOut.signInPrompt')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. LOADING STATE (UPDATED WITH COMPONENT) ---
  if (loading) return <LoadingScreen message={t('watchlist.loading')} />;

  // --- 3. MAIN WATCHLIST CONTENT ---
  return (
    <div className="pb-24 pt-6 px-4 max-w-7xl mx-auto animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="mt-8 md:mt-12 mb-6">
        <div className="flex items-center gap-2.5 text-tennis-lime font-black text-xs uppercase tracking-widest mb-2.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute h-full w-full rounded-full bg-tennis-lime opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-tennis-lime"></span>
          </span>
          <span>{t('watchlist.header.badge', 'WATCHLIST')}</span>
        </div>
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none mb-2">
              {t('watchlist.title')}
            </h1>
            <p className="text-gray-400 text-sm md:text-base font-medium max-w-2xl pl-1">
              {t('watchlist.loggedOut.description')}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar - REVERTED TO REQUESTED LOOK */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar mb-4">
         <div className="relative shrink-0">
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select 
                value={ratingFilter} 
                onChange={(e) => setRatingFilter(Number(e.target.value))}
                className="appearance-none bg-[#1a1d26] text-white pl-10 pr-8 py-2.5 rounded-xl border border-white/5 text-sm font-bold focus:border-tennis-lime outline-none transition-colors"
            >
                <option value="0">{t('homePage.filters.allRatings')}</option>
                <option value="90">90+ Elite</option>
                <option value="80">80+ Pro</option>
                <option value="70">70+ Challenger</option>
            </select>
         </div>

         <button 
            onClick={() => setSortBy(sortBy === 'name' ? 'rating' : 'name')}
            className="flex items-center gap-2 bg-[#1a1d26] text-white px-4 py-2.5 rounded-xl border border-white/5 text-sm font-bold hover:border-tennis-lime transition-all shrink-0 active:scale-95"
         >
            <ArrowUpDown size={16} className="text-tennis-lime" />
            {t('watchlist.sort')}: {sortBy === 'name' ? t('homePage.footer.name') : t('homePage.footer.rating')}
         </button>
      </div>

      {/* Grid: Player Monitoring Feed */}
      {filteredPlayers.length === 0 ? (
        <div className="text-center py-20 bg-[#1a1d26]/50 rounded-[40px] border border-dashed border-white/10">
          <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart size={32} className="text-gray-600" />
          </div>
          <p className="text-white font-bold text-xl uppercase tracking-tight">{t('watchlist.empty.title')}</p>
          <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">{t('watchlist.empty.message')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlayers.map((player) => (
            <PlayerCard key={player.id} player={player} onClick={() => handlePlayerClick(player.id)} />
          ))}
        </div>
      )}
      <ScrollToTop />
    </div>
  );
}