import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { LoadingScreen } from '../components/LoadingScreen';
import { PlayerHeader } from '../components/PlayerHeader';
import { SectionTabs } from '../components/SectionTabs';
import { LoadManagementWidget } from '../components/LoadManagementWidget';
import { PlayerIntelligenceWidget } from '../components/PlayerIntelligenceWidget';
import { SurfaceMasteryWidget } from '../components/SurfaceMasteryWidget';
import { AdvancedQuantWidget } from '../components/AdvancedQuantWidget';
import { VegasFormWidget } from '../components/VegasFormWidget';
import { SkillRadarChart } from '../components/SkillRadarChart';
import { SkillBar } from '../components/SkillBar';
import { motion, AnimatePresence } from 'framer-motion';
import { Toast } from '../components/Toast';
import {
  Zap,
  Target,
  Shield,
  Flame,
  Brain,
  Swords,
  Award,
  Users,
  Trophy,
  Activity,
  Heart,
  Radar,
  Share2,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  country: string;
  play_style: string;
  surface_preference: string;
  profile_image_url: string;
  tour: 'ATP' | 'WTA';
  form_rating?: any;
  surface_ratings?: any;
}

interface ScoutingReport {
  id: string;
  strengths: string;
  weaknesses: string;
  mental_game_notes: string;
  last_updated: string;
  translations?: any;
}

interface PlayerSkills {
  serve: number;
  forehand: number;
  backhand: number;
  volley: number;
  speed: number;
  power: number;
  mental: number;
  stamina: number;
  overall_rating: number;
  sackmann_metrics?: any;
  elo_metrics?: any;
  advanced_stats?: any;
}



export const PlayerProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const [player, setPlayer] = useState<Player | null>(null);
  const [report, setReport] = useState<ScoutingReport | null>(null);
  const [skills, setSkills] = useState<PlayerSkills | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<string>('Overview');
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [favoritesCount, setFavoritesCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [injuryData, setInjuryData] = useState<any[]>([]);

  const touchStartX = useRef<number>(0);
  const tabs = ['Overview', 'Stats', 'Scouting', 'Load', 'Form', 'Injury'];

  useEffect(() => {
    if (id) {
      loadPlayerData();
      loadFavoritesCount();
      loadInjuryData();
      if (user) {
        checkFavoriteStatus();
      }
    }
  }, [id, user]);

  const loadPlayerData = async () => {
    try {
      setLoading(true);
      
      // Load player, skills, and report in parallel
      const [playerRes, skillsRes, reportRes] = await Promise.all([
        supabase.from('players').select('*').eq('id', id).maybeSingle(),
        supabase.from('player_skills').select('*').eq('player_id', id).maybeSingle(),
        supabase.from('scouting_reports').select('*').eq('player_id', id).maybeSingle()
      ]);

      if (playerRes.error) throw playerRes.error;
      if (!playerRes.data) {
        setPlayer(null);
        return;
      }
      
      const playerData = playerRes.data;
      setPlayer(playerData);
      setSkills(skillsRes.data || null);
      setReport(reportRes.data || null);

      // Load matches for the player based on their last name
      const lastName = (playerData.last_name || '').toLowerCase();
      const [marketRes, historyRes] = await Promise.all([
        supabase
          .from('market_odds')
          .select('player1_name, player2_name, odds1, odds2, actual_winner_name, score, tournament, created_at')
          .or(`player1_name.ilike.%${lastName}%,player2_name.ilike.%${lastName}%`)
          .not('actual_winner_name', 'is', null)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('historical_matches')
          .select('match_date, winner_name, loser_name, score, tourney_name, surface')
          .or('winner_name.ilike.%' + lastName + '%,loser_name.ilike.%' + lastName + '%')
          .order('match_date', { ascending: false })
          .limit(100)
      ]);

      const parsed: any[] = [];
      const seen = new Set<string>();

      // Process market data
      if (marketRes.data) {
        marketRes.data.forEach((m: any, idx) => {
          const isP1 = m.player1_name.toLowerCase().includes(lastName);
          const opponent = isP1 ? m.player2_name : m.player1_name;
          const isWin = m.actual_winner_name.toLowerCase().includes(lastName);
          const date = new Date(m.created_at).toISOString().split('T')[0];
          const key = `${date}-${opponent.toLowerCase()}`;

          if (!seen.has(key)) {
            seen.add(key);
            parsed.push({
              id: `market-${idx}`,
              opponent,
              isWin,
              date,
              tournament: m.tournament || 'ATP Event',
              score: m.score || undefined,
              surface: 'overall',
              odds: m.odds1 && m.odds2 ? {
                myOdds: isP1 ? parseFloat(m.odds1) : parseFloat(m.odds2),
                oppOdds: isP1 ? parseFloat(m.odds2) : parseFloat(m.odds1)
              } : undefined
            });
          }
        });
      }

      // Process historical data
      if (historyRes.data) {
        historyRes.data.forEach((h: any, idx) => {
          const isWinner = h.winner_name.toLowerCase().includes(lastName);
          const opponent = isWinner ? h.loser_name : h.winner_name;
          const key = `${h.match_date}-${opponent.toLowerCase()}`;

          if (!seen.has(key)) {
            seen.add(key);
            parsed.push({
              id: `hist-${idx}`,
              opponent,
              isWin: isWinner,
              date: h.match_date,
              score: h.score || undefined,
              tournament: h.tourney_name || 'ATP Match',
              surface: (h.surface || 'overall').toLowerCase()
            });
          }
        });
      }

      // Sort combined matches by date descending
      parsed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMatches(parsed);

    } catch (e) {
      console.error('Error fetching player profile data:', e);
      setToastMessage('Failed to load player details');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const loadInjuryData = async () => {
    try {
      const { data, error } = await supabase
        .from('player_injury_intel')
        .select('*')
        .eq('player_name', player?.last_name || '')
        .order('tweet_date', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      setInjuryData(data || []);
    } catch (e) {
      console.error('Error loading injury data:', e);
    }
  };

  const loadFavoritesCount = async () => {
    try {
      const { count, error } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', id);
      if (error) throw error;
      setFavoritesCount(count || 0);
    } catch (e) {
      console.error('Error loading favorites count:', e);
    }
  };

  const checkFavoriteStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user?.id)
        .eq('player_id', id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setIsFavorite(!!data);
    } catch (e) {
      console.error('Error checking favorite status:', e);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      setToastMessage('Please sign in to add players to your watchlist');
      setShowToast(true);
      return;
    }

    try {
      if (isFavorite) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('player_id', id);
        setIsFavorite(false);
        setFavoritesCount(prev => Math.max(0, prev - 1));
        setToastMessage('Removed from watchlist');
        setShowToast(true);
      } else {
        await supabase
          .from('favorites')
          .insert([{ user_id: user.id, player_id: id }]);
        setIsFavorite(true);
        setFavoritesCount(prev => prev + 1);
        setToastMessage('Added to watchlist');
        setShowToast(true);
      }
    } catch (e) {
      console.error('Error toggling watchlist:', e);
      setToastMessage('Could not update watchlist');
      setShowToast(true);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setToastMessage('Player profile link copied to clipboard!');
    setShowToast(true);
  };

  // Touch handlers for swipe navigation between tabs
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches && e.touches.length > 0) {
      touchStartX.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    const threshold = 60;
    const currentIndex = tabs.indexOf(activeTab);

    if (diff > threshold) {
      // Swipe left -> Next tab
      if (currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1]);
      }
    } else if (diff < -threshold) {
      // Swipe right -> Prev tab
      if (currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1]);
      }
    }
  };

  const getRadarSkills = (playerSkills: PlayerSkills | null) => {
    const keys = ['serve', 'forehand', 'backhand', 'volley', 'speed', 'power', 'mental', 'stamina'];
    const colors = ['#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'];

    return keys.map((key, index) => {
      const rawValue = playerSkills ? (playerSkills as any)[key] : 60;
      return {
        label: t(`skills.${key}`, key.charAt(0).toUpperCase() + key.slice(1)),
        value: Math.round(Number(rawValue)),
        color: colors[index]
      };
    });
  };

  const comebackStats = useMemo(() => {
    if (!matches || matches.length === 0 || !player) return { rating: 6.0, wins: 0, total: 0, rate: 0 };
    let successCount = 0;
    let failureCount = 0;

    matches.forEach(m => {
      if (!m.score) return;
      
      const firstSetMatch = m.score.match(/^(\d+)-(\d+)/);
      if (!firstSetMatch) return;

      const gamesWinner = parseInt(firstSetMatch[1]);
      const gamesLoser = parseInt(firstSetMatch[2]);

      if (m.isWin) {
        if (gamesWinner < gamesLoser) {
          successCount++;
        }
      } else {
        if (gamesWinner > gamesLoser) {
          failureCount++;
        }
      }
    });

    const totalOpp = successCount + failureCount;
    if (totalOpp === 0) return { rating: 6.0, wins: 0, total: 0, rate: 0 };
    const rate = Math.round((successCount / totalOpp) * 100);
    const rating = Number((rate / 10).toFixed(1));
    return { rating, wins: successCount, total: totalOpp, rate };
  }, [matches, player]);

  const translatedReport = useMemo(() => {
    if (!report) return null;
    let strengths = report.strengths;
    let weaknesses = report.weaknesses;
    let mentalGameNotes = report.mental_game_notes;
    
    const currentLang = i18n.language ? i18n.language.substring(0, 2).toLowerCase() : 'en';
    if (currentLang !== 'en' && report.translations && report.translations[currentLang]) {
      const trans = report.translations[currentLang];
      if (trans.strengths) strengths = trans.strengths;
      if (trans.weaknesses) weaknesses = trans.weaknesses;
      if (trans.mental) mentalGameNotes = trans.mental;
    }
    
    return { strengths, weaknesses, mentalGameNotes };
  }, [report, i18n.language]);

  if (loading) return <LoadingScreen />;

  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1115] text-white p-6">
        <Users size={64} className="text-gray-600 mb-4" />
        <h2 className="text-xl font-bold mb-2">Player Not Found</h2>
        <p className="text-sm text-gray-500 mb-6">The requested player record does not exist or has been removed.</p>
        <button
          onClick={() => navigate('/scout')}
          className="bg-tennis-lime text-[#0f1115] px-6 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-transform active:scale-95"
        >
          Back to Scout
        </button>
      </div>
    );
  }

  const radarSkills = getRadarSkills(skills);
  const overallRating = skills?.overall_rating ? Math.round(Number(skills.overall_rating)) : 70;
  const fullName = `${player.first_name} ${player.last_name}`;

  const actionButtons = [
    {
      label: isFavorite ? 'Watched' : 'Watchlist',
      icon: Heart,
      onClick: toggleFavorite,
      active: isFavorite,
      activeClass: 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20',
      inactiveClass: 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/10'
    },
    {
      label: 'Compare',
      icon: Swords,
      onClick: () => navigate(`/matchup`),
      active: false,
      inactiveClass: 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/10'
    },
    {
      label: 'Oracle',
      icon: Radar,
      onClick: () => navigate(`/oracle`),
      active: false,
      inactiveClass: 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/10'
    },
    {
      label: 'Share',
      icon: Share2,
      onClick: handleShare,
      active: false,
      inactiveClass: 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/10'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-[#0f1115] min-h-screen text-white pb-16"
    >
      {/* Dynamic Sticky Header */}
      <PlayerHeader
        playerName={fullName}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
        onShare={handleShare}
      />

      {/* Revolut-style Profile Banner Card */}
      <div className="bg-gradient-to-b from-[#161a24] to-[#0f1115] px-4 pt-6 pb-4">
        <div className="max-w-md mx-auto flex flex-col items-center text-center space-y-4">
          
          {/* Avatar Container with rating badge */}
          <div className="relative">
            {player.profile_image_url ? (
              <img
                src={player.profile_image_url}
                alt={fullName}
                className="w-24 h-24 rounded-full object-cover border-4 border-[#84cc16] shadow-2xl"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border-4 border-[#84cc16] shadow-2xl flex items-center justify-center">
                <Users size={36} className="text-gray-400" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-[#151821] border-2 border-[#84cc16] text-[#84cc16] rounded-full w-8 h-8 flex items-center justify-center font-black text-sm italic shadow-lg">
              {overallRating}
            </div>
          </div>

          {/* Player Name and Metadata */}
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight text-white">{fullName}</h2>
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              <span className="bg-white/5 border border-white/5 text-gray-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                {player.country} 🎾
              </span>
              <span className="bg-white/5 border border-white/5 text-gray-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                {player.play_style || 'Versatile'}
              </span>
              <span className="bg-[#84cc16]/10 border border-[#84cc16]/20 text-[#84cc16] text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                {player.tour} Tour
              </span>
            </div>
            <span className="text-[10px] text-gray-500 block pt-1.5">
              Favorited by {favoritesCount} Backhand {favoritesCount === 1 ? 'user' : 'users'}
            </span>
          </div>

          {/* Quick Action Pill Grid */}
          <div className="grid grid-cols-4 gap-2 w-full max-w-sm pt-2">
            {actionButtons.map((btn) => {
              const Icon = btn.icon;
              return (
                <button
                  key={btn.label}
                  onClick={btn.onClick}
                  className={`flex flex-col items-center py-2 px-1 rounded-2xl border text-center transition-all active:scale-95 duration-200 ${
                    btn.active ? btn.activeClass : btn.inactiveClass
                  }`}
                >
                  <Icon size={18} className="mb-1" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">
                    {btn.label}
                  </span>
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* Sliding Segmented Tab Navigation */}
      <SectionTabs tabs={tabs} activeTab={activeTab} onTabSelect={setActiveTab} />

      {/* Swipeable Tab Content Area */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="max-w-md md:max-w-4xl mx-auto px-4 mt-4 min-h-[300px]"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="pb-20"
          >
            {/* Overview Tab */}
            {activeTab === 'Overview' && (
              <div className="space-y-6">
                
                {/* Surface preference / details card */}
                <div className="bg-gradient-to-br from-[#161a25]/60 to-[#0f1115]/80 p-5 rounded-2xl border border-white/5 flex items-center justify-between shadow-lg">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider block">{t('playerProfile.specialty', 'Specialty')}</span>
                    <h3 className="text-base font-black text-white uppercase tracking-wider">{player.surface_preference ? t(`surfaces.${player.surface_preference.toLowerCase()}`, player.surface_preference) : t('playerProfile.allCourt', 'All Court')} {t('playerProfile.court', 'Court')}</h3>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider block">{t('playerProfile.tourRating', 'Tour Rating')}</span>
                    <span className="text-base font-black text-tennis-lime italic">{overallRating} {t('playerProfile.ovr', 'OVR')}</span>
                  </div>
                </div>

                {/* Surface Mastery Card (Prioritized ELO Focus) */}
                {player && (
                  <SurfaceMasteryWidget
                    surfacePreference={player.surface_preference}
                    surfaceRatings={player.surface_ratings}
                    eloMetrics={skills?.elo_metrics}
                  />
                )}

                {/* Radar Chart section */}
                {skills && (
                  <div className="bg-[#151821]/80 backdrop-blur-md p-6 rounded-3xl border border-white/5 shadow-xl text-center">
                    <h3 className="text-white font-black text-sm uppercase tracking-wider mb-4 flex items-center justify-center">
                      <Activity className="mr-2 text-tennis-lime" size={18} />
                      {t('playerProfile.performanceRadar', 'Performance Radar')}
                    </h3>
                    <SkillRadarChart skills={radarSkills} />
                  </div>
                )}

                {/* Core skills progress list */}
                {skills && (
                  <div className="bg-[#151821]/80 backdrop-blur-md p-6 rounded-3xl border border-white/5 shadow-xl space-y-4">
                    <h3 className="text-white font-black text-sm uppercase tracking-wider mb-2 flex items-center">
                      <Award className="mr-2 text-tennis-lime" size={18} />
                      {t('playerProfile.skillRatings', 'Skill Ratings')}
                    </h3>
                    <div className="space-y-4">
                      {radarSkills.map((skill, idx) => (
                        <SkillBar
                          key={idx}
                          icon={[Zap, Target, Shield, Flame, Brain, Swords, Award, Trophy][idx % 8]}
                          label={skill.label}
                          value={skill.value}
                          color={skill.color.startsWith('text-') ? skill.color : `text-[${skill.color}]`}
                          glowColor={skill.color}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stats Tab */}
            {activeTab === 'Stats' && (
              <AdvancedQuantWidget playerName={fullName} advancedStats={skills?.advanced_stats} />
            )}

            {/* Scouting Tab */}
            {activeTab === 'Scouting' && (
              <PlayerIntelligenceWidget
                strengths={translatedReport?.strengths}
                weaknesses={translatedReport?.weaknesses}
                mentalGameNotes={translatedReport?.mentalGameNotes}
                lastUpdated={report?.last_updated}
              />
            )}



            {/* Load Tab */}
            {activeTab === 'Load' && (
              <LoadManagementWidget
                sackmannMetrics={skills?.sackmann_metrics}
                comebackStats={comebackStats}
              />
            )}

            {/* Form Tab */}
            {activeTab === 'Form' && (
              <VegasFormWidget playerName={player.last_name} dbFormRating={player.form_rating} matches={matches} />
            )}

            {/* Injury Tab */}
            {activeTab === 'Injury' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                    <AlertTriangle size={16} className="text-red-500" />
                  </div>
                  <h3 className="text-white font-black text-sm uppercase tracking-wider">
                    {t('playerProfile.injuryIntel', 'Injury Intel')}
                  </h3>
                </div>
                
                {injuryData.length === 0 ? (
                  <div className="text-center py-12">
                    <Brain size={32} className="text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-500 font-bold text-sm">
                      {t('playerProfile.noInjuryData', 'No injury data found for this player.')}
                    </p>
                    <p className="text-gray-600 text-xs mt-1">
                      {t('playerProfile.injuryBotHint', 'The Injury Bot will automatically detect injury news.')}
                    </p>
                  </div>
                ) : (
                  injuryData.map((item: any) => (
                    <div 
                      key={item.id}
                      className="bg-[#15171e]/70 backdrop-blur-md rounded-2xl border border-white/5 p-4 hover:border-white/10 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.is_mto && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              MTO
                            </span>
                          )}
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20">
                            {item.injury_type || 'Injury'}
                          </span>
                        </div>
                        <span className="text-[9px] text-gray-600 font-mono">
                          {new Date(item.tweet_date || item.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                      
                      <p className="text-gray-300 text-sm font-semibold leading-relaxed mb-2">
                        {item.summary_kurz || item.tweet_text}
                      </p>
                      
                      {item.reasoning && (
                        <p className="text-gray-500 text-xs leading-relaxed mb-2">
                          {item.reasoning}
                        </p>
                      )}
                      
                      <a 
                        href={item.tweet_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[9px] text-gray-500 hover:text-tennis-lime transition-colors font-bold uppercase tracking-widest flex items-center gap-1"
                      >
                        <ExternalLink size={10} /> {t('injuryIntel.source', 'Source')}
                      </a>
                    </div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <Toast message={toastMessage} show={showToast} onClose={() => setShowToast(false)} />
    </motion.div>
  );
};