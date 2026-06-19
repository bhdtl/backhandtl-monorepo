import React, { useState, useEffect, useRef } from 'react';
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
import { AchievementBadge } from '../components/AchievementBadge';
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
  TrendingUp,
  Trophy,
  Activity,
  Heart,
  Radar,
  Share2
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
}

interface ScoutingReport {
  id: string;
  strengths: string;
  weaknesses: string;
  mental_game_notes: string;
  last_updated: string;
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
}

interface PlayerAchievement {
  achievement_key: string;
  unlocked: boolean;
}

export const PlayerProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [player, setPlayer] = useState<Player | null>(null);
  const [report, setReport] = useState<ScoutingReport | null>(null);
  const [skills, setSkills] = useState<PlayerSkills | null>(null);
  const [achievements, setAchievements] = useState<PlayerAchievement[]>([]);
  
  const [activeTab, setActiveTab] = useState<string>('Overview');
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [favoritesCount, setFavoritesCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  const touchStartX = useRef<number>(0);
  const tabs = ['Overview', 'Stats', 'Intelligence', 'Load', 'Form'];

  useEffect(() => {
    if (id) {
      loadPlayerData();
      loadFavoritesCount();
      if (user) {
        checkFavoriteStatus();
      }
    }
  }, [id, user]);

  const loadPlayerData = async () => {
    try {
      setLoading(true);
      
      // Load Player details
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (playerError) throw playerError;
      if (!playerData) {
        setPlayer(null);
        return;
      }
      setPlayer(playerData);

      // Load Scouting report
      const { data: reportData } = await supabase
        .from('scouting_reports')
        .select('*')
        .eq('player_id', id)
        .maybeSingle();
      setReport(reportData);

      // Load Player Skills
      const { data: skillsData } = await supabase
        .from('player_skills')
        .select('*')
        .eq('player_id', id)
        .maybeSingle();
      setSkills(skillsData);

      // Load Achievements
      const { data: achievementsData } = await supabase
        .from('player_achievements')
        .select('*')
        .eq('player_id', id);
      setAchievements(achievementsData || []);
    } catch (e) {
      console.error('Error fetching player profile data:', e);
      setToastMessage('Failed to load player details');
      setShowToast(true);
    } finally {
      setLoading(false);
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

  const getAchievements = (playerAchievements: PlayerAchievement[]) => {
    const achievementMap: { [key: string]: { icon: any; title: string; description: string; color: string } } = {
      power_hitter: {
        icon: Zap,
        title: t('achievements.power_hitter.title', 'Power Hitter'),
        description: t('achievements.power_hitter.desc', 'Explosive groundstrokes'),
        color: 'from-yellow-600 to-orange-600'
      },
      defensive_master: {
        icon: Shield,
        title: t('achievements.defensive_master.title', 'Defensive Master'),
        description: t('achievements.defensive_master.desc', 'Elite save rate on break points'),
        color: 'from-blue-600 to-cyan-600'
      },
      hot_streak: {
        icon: Flame,
        title: t('achievements.hot_streak.title', 'Hot Streak'),
        description: t('achievements.hot_streak.desc', 'Constant performance under pressure'),
        color: 'from-red-600 to-pink-600'
      },
      tactical_genius: {
        icon: Brain,
        title: t('achievements.tactical_genius.title', 'Tactical Genius'),
        description: t('achievements.tactical_genius.desc', 'Outstanding tactical adaptations'),
        color: 'from-purple-600 to-indigo-600'
      },
      precision_pro: {
        icon: Target,
        title: t('achievements.precision_pro.title', 'Precision Pro'),
        description: t('achievements.precision_pro.desc', 'Remarkable landing accuracy'),
        color: 'from-green-600 to-emerald-600'
      },
      aggressive_play: {
        icon: Swords,
        title: t('achievements.aggressive_play.title', 'Aggressive Play'),
        description: t('achievements.aggressive_play.desc', 'Dominates play from the start'),
        color: 'from-orange-600 to-red-600'
      }
    };

    return Object.keys(achievementMap).map(key => {
      const achievement = playerAchievements.find(a => a.achievement_key === key);
      return {
        ...achievementMap[key],
        unlocked: achievement?.unlocked || false
      };
    });
  };

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
  const achievementsList = getAchievements(achievements);
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
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider block">Specialty</span>
                    <h3 className="text-base font-black text-white uppercase tracking-wider">{player.surface_preference || 'All Court'} Court</h3>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider block">Tour Rating</span>
                    <span className="text-base font-black text-tennis-lime italic">{overallRating} OVR</span>
                  </div>
                </div>

                {/* Radar Chart section */}
                {skills && (
                  <div className="bg-[#151821]/80 backdrop-blur-md p-6 rounded-3xl border border-white/5 shadow-xl text-center">
                    <h3 className="text-white font-black text-sm uppercase tracking-wider mb-4 flex items-center justify-center">
                      <Activity className="mr-2 text-tennis-lime" size={18} />
                      Performance Radar
                    </h3>
                    <SkillRadarChart skills={radarSkills} />
                  </div>
                )}

                {/* Core skills progress list */}
                {skills && (
                  <div className="bg-[#151821]/80 backdrop-blur-md p-6 rounded-3xl border border-white/5 shadow-xl space-y-4">
                    <h3 className="text-white font-black text-sm uppercase tracking-wider mb-2 flex items-center">
                      <Award className="mr-2 text-tennis-lime" size={18} />
                      Skill Ratings
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

                {/* Achievements list */}
                {achievementsList.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-white font-black text-sm uppercase tracking-wider pl-2 flex items-center">
                      <Trophy className="mr-2 text-tennis-lime" size={18} />
                      Achievements
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {achievementsList.map((achievement, idx) => (
                        <AchievementBadge key={idx} {...achievement} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stats Tab */}
            {activeTab === 'Stats' && (
              <AdvancedQuantWidget playerName={fullName} skills={skills} />
            )}

            {/* Intelligence Tab */}
            {activeTab === 'Intelligence' && (
              <PlayerIntelligenceWidget
                strengths={report?.strengths}
                weaknesses={report?.weaknesses}
                mentalGameNotes={report?.mental_game_notes}
                lastUpdated={report?.last_updated}
              />
            )}

            {/* Load Tab */}
            {activeTab === 'Load' && (
              <LoadManagementWidget
                stamina={skills?.stamina}
                speed={skills?.speed}
              />
            )}

            {/* Form Tab */}
            {activeTab === 'Form' && (
              <VegasFormWidget playerName={fullName} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <Toast message={toastMessage} show={showToast} onClose={() => setShowToast(false)} />
    </motion.div>
  );
};