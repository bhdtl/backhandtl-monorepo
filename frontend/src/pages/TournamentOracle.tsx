import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Lock, 
  Crown,
  Target,
  ArrowRight,
  Radar,
  CheckCircle2,
  User,
  Search,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAccess } from '../hooks/useAccess';
import { LoadingScreen } from '../components/LoadingScreen';
import { ScrollToTop } from '../components/ScrollToTop';
import { PremiumLock } from '../components/PremiumLock';
import { trackEvent } from '../lib/analytics'; // SOTA Telemetry

interface OracleDraw {
  id: string;
  tournament_name: string;
  match_date: string;
  player_a_name: string;
  player_b_name: string;
  predicted_winner: string;
  surface: string;
  // Computed fields
  tour_type?: string; 
  display_tournament?: string; 
}

interface PlayerInfo {
  first_name?: string; // SOTA: Added for Initial generation
  last_name: string;
  country: string;
  profile_image_url: string;
  play_style: string;
  tour: string; // ATP oder WTA aus der DB
}

// --- VETERAN UPGRADE: COMPLETE TENNIS GEO-MAP ---
const getCountryISO = (country: string) => {
  if (!country) return 'un';
  const cleanCountry = country.trim().toUpperCase();
  const map: Record<string, string> = {
    'INDIA': 'in', 'USA': 'us', 'UNITED STATES': 'us', 'GERMANY': 'de', 
    'FRANCE': 'fr', 'SPAIN': 'es', 'ITALY': 'it', 'UK': 'gb', 
    'UNITED KINGDOM': 'gb', 'GREAT BRITAIN': 'gb', 'SERBIA': 'rs', 
    'GREECE': 'gr', 'POLAND': 'pl', 'SWITZERLAND': 'ch', 'AUSTRIA': 'at', 
    'CANADA': 'ca', 'AUSTRALIA': 'au', 'CROATIA': 'hr', 'NORWAY': 'no', 
    'DENMARK': 'dk', 'JAPAN': 'jp', 'BRAZIL': 'br', 'RUSSIA': 'ru', 
    'BOSNIA': 'ba', 'BELARUS': 'by', 'CHINA': 'cn', 'KAZAKHSTAN': 'kz', 
    'BULGARIA': 'bg', 'CZECH REPUBLIC': 'cz', 'CZECHIA': 'cz', 'ARGENTINA': 'ar', 
    'NETHERLANDS': 'nl', 'BELGIUM': 'be', 'SLOVAKIA': 'sk', 'SOUTH AFRICA': 'za', 
    'ROMANIA': 'ro', 'SWEDEN': 'se', 'FINLAND': 'fi', 'PORTUGAL': 'pt', 
    'CHILE': 'cl', 'COLOMBIA': 'co', 'MEXICO': 'mx', 'HUNGARY': 'hu', 
    'TURKEY': 'tr', 'LATVIA': 'lv', 'LITHUANIA': 'lt', 'ESTONIA': 'ee', 
    'UKRAINE': 'ua', 'GEORGIA': 'ge', 'SOUTH KOREA': 'kr', 'TAIWAN': 'tw', 
    'NEW ZEALAND': 'nz', 'EGYPT': 'eg', 'TUNISIA': 'tn', 'MOROCCO': 'ma', 
    'ALGERIA': 'dz', 'PERU': 'pe', 'ECUADOR': 'ec', 'BOLIVIA': 'bo', 
    'URUGUAY': 'uy', 'UZBEKISTAN': 'uz', 'MOLDOVA': 'md', 'ISRAEL': 'il'
  };
  return map[cleanCountry] || 'un';
};

// --- CSS für Apple-like Liquid Borders & Hidden Scrollbar ---
const style = document.createElement('style');
style.textContent = `
  @keyframes border-flow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  .liquid-winner-border {
    position: relative;
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.02);
  }
  .liquid-winner-border::before {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 1.1rem;
    background: linear-gradient(90deg, rgba(132,204,22,0.1), rgba(132,204,22,0.8), rgba(132,204,22,0.1));
    background-size: 200% 200%;
    z-index: -1;
  }
  @media (min-width: 768px) {
    .liquid-winner-border::before {
      animation: border-flow 3s ease infinite;
    }
  }
  .liquid-winner-inner {
    background: #111318;
    border-radius: 1rem;
    height: 100%;
    width: 100%;
    position: relative;
    z-index: 1;
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;
document.head.appendChild(style);

export function TournamentOracle() {
  const navigate = useNavigate();
  const { isElite, loading: accessLoading } = useAccess();
  
  const [draws, setDraws] = useState<OracleDraw[]>([]);
  const [playerDict, setPlayerDict] = useState<Map<string, PlayerInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // States für Filter
  const [selectedDisplayTour, setSelectedDisplayTour] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // SOTA TELEMETRY: Track Intent & Paywall hits on mount
  useEffect(() => {
    if (!accessLoading) {
        if (!isElite) {
            trackEvent('oracle_paywall_view', {});
        } else {
            trackEvent('oracle_view', {});
        }
    }
  }, [isElite, accessLoading]);

  // Load Data independently of Admin Status now
  useEffect(() => {
    fetchOracleData();
  }, []);

  // Analytics Tracker für die Text-Suche (mit 1s Debounce)
  useEffect(() => {
    if (searchQuery.trim().length > 2) {
      const timer = setTimeout(() => {
        trackEvent('oracle_search', { 
          query: searchQuery, 
          tournament: selectedDisplayTour 
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, selectedDisplayTour]);

  const fetchOracleData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 1. Fetch Matches
      const { data: drawsData, error: drawsError } = await supabase
        .from('tournament_oracle_draws')
        .select('*')
        .gte('match_date', today)
        .order('match_date', { ascending: true });

      if (drawsError) throw drawsError;

      // 2. Fetch Player Info (Mit Tour-Zuordnung für ATP/WTA Split)
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('first_name, last_name, country, profile_image_url, play_style, tour');
        
      const dict = new Map<string, PlayerInfo>();
      if (!playersError && playersData) {
          playersData.forEach(p => {
              const lastNameKey = p.last_name.toLowerCase().trim();
              
              // 🚀 SOTA FIX: Dual-Key Dictionary Mapping
              // 1. Speichern unter reinem Nachnamen (Fallback)
              dict.set(lastNameKey, p);
              
              // 2. Speichern unter "Initiale + Nachname" (für exakte Bruder-Zuweisung, z.B. "m. mcdonald")
              if (p.first_name) {
                  const initialKey = `${p.first_name[0].toLowerCase()}. ${lastNameKey}`;
                  dict.set(initialKey, p);
              }
          });
          setPlayerDict(dict);
      }

      // 🚀 Helper Function: Sicheres Abrufen des Spielers
      const getPlayerSafely = (oracleName: string) => {
          if (!oracleName) return undefined;
          const rawName = oracleName.toLowerCase().trim();
          
          // Versuch 1: Exakter Match (inklusive Initial, z.B. "m. mcdonald")
          if (dict.has(rawName)) return dict.get(rawName);
          
          // Versuch 2: Fallback (Wir schneiden das Initial ab und suchen nur nach Nachname)
          const nameWithoutInitial = rawName.replace(/^[a-z]\.\s+/, '').trim();
          return dict.get(nameWithoutInitial);
      };

      // 3. Enrich Draws with Display Tournaments (Splitting ATP/WTA)
      const enrichedDraws: OracleDraw[] = (drawsData || []).map(draw => {
          const pInfo = getPlayerSafely(draw.player_a_name); // 🚀 Benutzt den neuen Helper
          const tourType = pInfo?.tour ? pInfo.tour.toUpperCase() : 'ATP';
          
          // Wenn der Name eh schon ATP/WTA enthält, lassen wir ihn so. Sonst append.
          const isAlreadySplit = draw.tournament_name.toUpperCase().includes('ATP') || draw.tournament_name.toUpperCase().includes('WTA');
          const displayTour = isAlreadySplit ? draw.tournament_name : `${draw.tournament_name} ${tourType}`;

          return {
              ...draw,
              tour_type: tourType,
              display_tournament: displayTour
          };
      });

      setDraws(enrichedDraws);

      // Auto-Select erstes Turnier & erstes Datum
      if (enrichedDraws.length > 0) {
        // Welches Turnier hat die meisten Matches?
        const tourCounts = enrichedDraws.reduce((acc, curr) => {
          const name = curr.display_tournament || curr.tournament_name;
          acc[name] = (acc[name] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const topTour = Object.keys(tourCounts).reduce((a, b) => tourCounts[a] > tourCounts[b] ? a : b);
        setSelectedDisplayTour(topTour);
      }
    } catch (error) {
      console.error("Error fetching oracle data:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- 🚀 SOTA FIX: HELPER ZUM ABRUFEN WÄHREND DES RENDERING ---
  const getPlayerInfoForRender = (oracleName: string) => {
      if (!oracleName) return undefined;
      const rawName = oracleName.toLowerCase().trim();
      if (playerDict.has(rawName)) return playerDict.get(rawName);
      const nameWithoutInitial = rawName.replace(/^[a-z]\.\s+/, '').trim();
      return playerDict.get(nameWithoutInitial);
  };

  // --- MEMOIZED COMPUTATIONS ---

  // 1. Alle einzigartigen Turniere (bereits aufgesplittet nach ATP/WTA)
  const availableTournaments = useMemo(() => {
    return Array.from(new Set(draws.map(d => d.display_tournament as string))).sort();
  }, [draws]);

  // 2. Matches des ausgewählten Turniers
  const tourMatches = useMemo(() => {
    return draws.filter(d => d.display_tournament === selectedDisplayTour);
  }, [draws, selectedDisplayTour]);

  // 3. Verfügbare Daten für das ausgewählte Turnier extrahieren & sortieren
  const availableDates = useMemo(() => {
    const dates = Array.from(new Set(tourMatches.map(m => m.match_date.split('T')[0])));
    return dates.sort();
  }, [tourMatches]);

  // Auto-Select des ersten Datums, wenn sich das Turnier ändert
  useEffect(() => {
      if (availableDates.length > 0 && (!selectedDate || !availableDates.includes(selectedDate))) {
          setSelectedDate(availableDates[0]);
      }
  }, [availableDates, selectedDate]);

  // 4. Matches für das ausgewählte Datum
  const dateMatches = useMemo(() => {
      return tourMatches.filter(m => m.match_date.split('T')[0] === selectedDate);
  }, [tourMatches, selectedDate]);

  // 5. Elite/Freemium Logik (Limitierung GREIFT VOR DER SUCHE!)
  const unlockedMatches = useMemo(() => {
      return isElite ? dateMatches : dateMatches.slice(0, 3);
  }, [dateMatches, isElite]);

  const hiddenMatchesCount = isElite ? 0 : Math.max(0, dateMatches.length - 3);

  // 6. Suchfilter auf die freigeschalteten Matches anwenden
  const finalDisplayMatches = useMemo(() => {
      if (!searchQuery.trim()) return unlockedMatches;
      const query = searchQuery.toLowerCase().trim();
      return unlockedMatches.filter(m => 
          m.player_a_name.toLowerCase().includes(query) || 
          m.player_b_name.toLowerCase().includes(query)
      );
  }, [unlockedMatches, searchQuery]);


  // Helper zur Datums-Formatierung (z.B. "Wed, Mar 4")
  const formatDateString = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (loading || accessLoading) return <LoadingScreen message="Consulting the Oracle..." />;

  return (
    <div className="min-h-screen bg-[#0f1115] w-full overflow-x-hidden relative selection:bg-tennis-lime/30 selection:text-tennis-lime pb-32 font-sans tracking-tight">
      <ScrollToTop />
      
      {/* Subtle Ambient Background */}
      <div className="absolute top-0 right-0 w-[50vw] h-[50vh] md:w-[80vw] md:h-[80vh] bg-tennis-lime/5 blur-[100px] md:blur-[200px] rounded-full -z-10 pointer-events-none transform-gpu" />

      <div className="pt-24 px-0 md:px-4 max-w-5xl mx-auto">
        
        {/* HERO SECTION */}
        <div className="text-center mb-10 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
            <Radar size={14} className="text-tennis-lime animate-pulse" /> Live Predictions
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-4 drop-shadow-2xl">
            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-tennis-lime to-white">Oracle</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-2xl mx-auto font-medium">
            AI predicted bracket winners. Pure logic. Zero bias.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* 🚀 SOTA FIX: PREMIUM LOCK WRAPPER */}
        {/* ========================================================================= */}
        <PremiumLock
          isLocked={!isElite}
          minTier="ELITE"
          title="Elite Oracle Intelligence"
          description="Access AI-predicted tournament brackets, match simulations, and draw analysis. Upgrade to Elite to unlock the Oracle."
          blurAmount="blur-lg"
        >
          {draws.length === 0 ? (
            <div className="text-center py-20 mx-4 bg-[#1a1d26]/50 rounded-[2.5rem] border border-dashed border-white/10">
              <Calendar className="mx-auto text-gray-600 mb-4" size={40} />
              <h3 className="text-white font-black uppercase tracking-widest mb-2">No Upcoming Draws</h3>
              <p className="text-gray-500 text-sm">The Oracle is waiting for the next brackets to be released.</p>
            </div>
          ) : (
            <>
              {/* 1. SWIPEABLE TOURNAMENT TABS */}
              <div className="relative w-full mb-6">
                  <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[#0f1115] to-transparent z-10 md:hidden pointer-events-none"></div>
                  <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[#0f1115] to-transparent z-10 md:hidden pointer-events-none"></div>
                  
                  <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 md:px-0 md:flex-wrap md:justify-center gap-2 md:gap-3 pb-2">
                    {availableTournaments.map(tour => (
                      <button
                        key={tour}
                        onClick={() => { setSelectedDisplayTour(tour); setSearchQuery(""); }}
                        className={`snap-center shrink-0 px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all border whitespace-nowrap ${
                          selectedDisplayTour === tour 
                          ? 'bg-tennis-lime text-black border-tennis-lime shadow-[0_0_15px_rgba(132,204,22,0.3)]' 
                          : 'bg-[#1a1d26] text-gray-400 border-white/5 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {tour}
                      </button>
                    ))}
                  </div>
              </div>

              {/* 2. DATE FILTER PILLS */}
              {availableDates.length > 0 && (
                  <div className="flex justify-center mb-8 px-4">
                      <div className="bg-[#1a1d26] p-1.5 rounded-full border border-white/5 flex flex-wrap shadow-lg justify-center max-w-full">
                          {availableDates.map(dateStr => (
                              <button 
                                  key={dateStr}
                                  onClick={() => { setSelectedDate(dateStr); setSearchQuery(""); }}
                                  className={`px-5 py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex-shrink-0 ${
                                      selectedDate === dateStr ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
                                  }`}
                              >
                                  {formatDateString(dateStr)}
                              </button>
                          ))}
                      </div>
                  </div>
              )}

              {/* 3. SEARCH BAR */}
              <div className="px-4 md:px-0 mb-8 max-w-md mx-auto">
                  <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-tennis-lime transition-colors" size={18} />
                      <input 
                          type="text"
                          placeholder="Search for a player..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-[#1a1d26] border border-white/10 rounded-2xl py-3.5 pl-12 pr-10 text-white text-sm font-medium focus:outline-none focus:border-tennis-lime transition-all placeholder:text-gray-600 shadow-inner"
                      />
                      {searchQuery && (
                          <button 
                              onClick={() => setSearchQuery("")}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                          >
                              <X size={16} />
                          </button>
                      )}
                  </div>
              </div>

              {/* 4. MATCH LIST (WITH ANIMATIONS) */}
              <div className="space-y-4 px-4 md:px-0 min-h-[400px]">
                  {finalDisplayMatches.length === 0 ? (
                      <motion.div 
                          initial={{ opacity: 0 }} 
                          animate={{ opacity: 1 }} 
                          className="text-center py-16 text-gray-500 font-mono text-xs uppercase tracking-widest"
                      >
                          {searchQuery ? "No matches found for this search." : "No matches scheduled."}
                      </motion.div>
                  ) : (
                      <AnimatePresence mode='popLayout'>
                          {finalDisplayMatches.map((match, idx) => {
                              const isP1Winner = match.predicted_winner === match.player_a_name;
                              // 🚀 SOTA FIX: Benutzt die neue Render-Helper-Funktion
                              const p1Info = getPlayerInfoForRender(match.player_a_name);
                              const p2Info = getPlayerInfoForRender(match.player_b_name);

                              return (
                                  <motion.div 
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.95 }}
                                      transition={isMobile 
                                          ? { duration: 0.25, ease: "easeOut", delay: Math.min(idx * 0.02, 0.2) }
                                          : { type: "spring", stiffness: 300, damping: 25, delay: idx * 0.05 }}
                                      key={match.id} 
                                      className="group bg-[#1a1d26] border border-white/5 hover:border-white/10 rounded-[2rem] p-5 md:p-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 shadow-lg"
                                  >
                                      {/* Tournament & Surface Note */}
                                      <div className="flex flex-row md:flex-col items-center md:items-start justify-between w-full md:w-24 flex-shrink-0 border-b md:border-b-0 border-white/5 pb-3 md:pb-0">
                                          <span className="text-[10px] font-black uppercase tracking-widest text-tennis-lime">
                                              {formatDateString(match.match_date.split('T')[0])}
                                          </span>
                                          <span className="text-xs text-gray-400 font-bold mt-0.5">{match.surface}</span>
                                      </div>

                                      {/* Matchup Layout */}
                                      <div className="flex-1 w-full flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6">
                                          
                                          {/* Player A */}
                                          <div className={`w-full md:flex-1 h-[72px] md:h-20 transition-all duration-500 ${isP1Winner ? 'liquid-winner-border shadow-[0_0_20px_rgba(132,204,22,0.1)] z-10' : 'opacity-60 scale-[0.98] z-0'}`}>
                                              <div className={`liquid-winner-inner flex items-center justify-between px-4 md:px-5 border ${isP1Winner ? 'border-transparent' : 'border-white/5'} rounded-[0.9rem]`}>
                                                  <div className="flex items-center gap-3">
                                                      {p1Info?.profile_image_url ? (
                                                          <img src={p1Info.profile_image_url} alt={match.player_a_name} loading="lazy" className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover bg-black/40 border border-white/10" />
                                                      ) : (
                                                          <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500"><User size={16} /></div>
                                                      )}
                                                      <div className="flex flex-col items-start">
                                                          <span className={`text-base md:text-lg font-black uppercase tracking-tighter truncate max-w-[135px] xs:max-w-[170px] md:max-w-[200px] ${isP1Winner ? 'text-white' : 'text-gray-400'}`}>
                                                              {match.player_a_name}
                                                          </span>
                                                          {p1Info && (
                                                              <div className="flex items-center gap-1.5 mt-0.5">
                                                                  <img src={`https://flagcdn.com/w20/${getCountryISO(p1Info.country)}.png`} className="w-3.5 rounded-[1px] opacity-80" alt={p1Info.country} />
                                                                  {p1Info.play_style && <span className="text-[9px] text-gray-500 uppercase font-bold tracking-widest truncate max-w-[80px]">{p1Info.play_style}</span>}
                                                              </div>
                                                          )}
                                                      </div>
                                                  </div>
                                                  {isP1Winner && <CheckCircle2 className="text-tennis-lime shrink-0 ml-2" size={20} />}
                                              </div>
                                          </div>

                                          {/* VS Badge */}
                                          <div className="text-[10px] md:text-xs font-black text-gray-600 italic tracking-[0.2em] shrink-0 absolute md:relative z-20 bg-[#1a1d26] md:bg-transparent px-2 py-1 rounded-full md:p-0">VS</div>

                                          {/* Player B */}
                                          <div className={`w-full md:flex-1 h-[72px] md:h-20 transition-all duration-500 ${!isP1Winner ? 'liquid-winner-border shadow-[0_0_20px_rgba(132,204,22,0.1)] z-10' : 'opacity-60 scale-[0.98] z-0'}`}>
                                              <div className={`liquid-winner-inner flex items-center justify-between px-4 md:px-5 border ${!isP1Winner ? 'border-transparent' : 'border-white/5'} rounded-[0.9rem]`}>
                                                  <div className="flex items-center gap-3">
                                                      {p2Info?.profile_image_url ? (
                                                          <img src={p2Info.profile_image_url} alt={match.player_b_name} loading="lazy" className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover bg-black/40 border border-white/10" />
                                                      ) : (
                                                          <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500"><User size={16} /></div>
                                                      )}
                                                      <div className="flex flex-col items-start">
                                                          <span className={`text-base md:text-lg font-black uppercase tracking-tighter truncate max-w-[135px] xs:max-w-[170px] md:max-w-[200px] ${!isP1Winner ? 'text-white' : 'text-gray-400'}`}>
                                                              {match.player_b_name}
                                                          </span>
                                                          {p2Info && (
                                                              <div className="flex items-center gap-1.5 mt-0.5">
                                                                  <img src={`https://flagcdn.com/w20/${getCountryISO(p2Info.country)}.png`} className="w-3.5 rounded-[1px] opacity-80" alt={p2Info.country} />
                                                                  {p2Info.play_style && <span className="text-[9px] text-gray-500 uppercase font-bold tracking-widest truncate max-w-[80px]">{p2Info.play_style}</span>}
                                                              </div>
                                                          )}
                                                      </div>
                                                  </div>
                                                  {!isP1Winner && <CheckCircle2 className="text-tennis-lime shrink-0 ml-2" size={20} />}
                                              </div>
                                          </div>

                                      </div>
                                  </motion.div>
                              );
                          })}
                      </AnimatePresence>
                  )}

                  {/* 5. FREEMIUM INNER LOCK (FALLBACK) */}
                  {hiddenMatchesCount > 0 && !searchQuery && (
                    <div className="relative mt-8 mb-12">
                        <div className="space-y-4 opacity-30 pointer-events-none select-none filter blur-sm">
                            {[1, 2].map(i => (
                                <div key={i} className="bg-[#1a1d26] border border-white/5 rounded-[2rem] p-6 h-32 md:h-28"></div>
                            ))}
                        </div>

                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4">
                            <div className="bg-[#15171e]/90 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] text-center max-w-md shadow-2xl shadow-black">
                                <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                                    <Lock size={24} className="text-tennis-lime" />
                                </div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
                                    +{hiddenMatchesCount} Matches Locked
                                </h3>
                                <p className="text-gray-400 text-sm font-medium mb-6">
                                    Free access is limited to the first 3 matches per day. Upgrade to Elite to see the Oracle's predictions for the entire tournament.
                                </p>
                                <button 
                                    onClick={() => navigate('/pricing')}
                                    className="w-full py-4 bg-tennis-lime text-black rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(132,204,22,0.3)]"
                                >
                                    <Crown size={16} /> Unlock Full Draw
                                </button>
                            </div>
                        </div>
                    </div>
                  )}
              </div>

              {/* VALUE SCANNER UPSELL BANNER */}
              <div className="px-4 md:px-0 mt-10">
                  <div
                    className="bg-[#15171e] border border-white/5 rounded-[2rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 opacity-80 hover:opacity-100 hover:border-white/10 transition-all cursor-pointer group"
                    onClick={() => navigate('/scanner')}
                  >
                      <div>
                          <h3 className="text-gray-300 font-bold text-sm md:text-base flex items-center justify-center md:justify-start gap-2 mb-1">
                              <Target className="text-gray-500 group-hover:text-blue-400 transition-colors" size={16} />
                              Knowing the winner isn't enough.
                          </h3>
                          <p className="text-gray-500 text-xs md:text-sm text-center md:text-left">
                              Use the Value Scanner to find mathematical mistakes in the bookmakers' odds.
                          </p>
                      </div>
                      <button className="shrink-0 px-6 py-3 w-full md:w-auto bg-white/5 group-hover:bg-blue-500/10 group-hover:text-blue-400 text-gray-400 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                          Scan for Value <ArrowRight size={14} />
                      </button>
                  </div>
              </div>
            </>
          )}
        </PremiumLock>
      </div>
    </div>
  );
}

export default TournamentOracle;