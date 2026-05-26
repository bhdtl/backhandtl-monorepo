import { useState, useEffect, useMemo } from 'react';
import {
  Heart, Calendar, Zap, Target, TrendingUp,
  Award, Flame, Shield, Brain, Swords, Star,
  Activity, Users, Trophy
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { SkillRadarChart } from '../components/SkillRadarChart';
import { SkillBar } from '../components/SkillBar';
import { AchievementBadge } from '../components/AchievementBadge';
import { StatCard } from '../components/StatCard';
import { useTranslation } from 'react-i18next';

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
}

interface PlayerAchievement {
  achievement_key: string;
  unlocked: boolean;
}

interface PlayerProfileProps {
  playerId: string;
  onBack: () => void;
  onLoginClick: () => void;
}

export function PlayerProfile({ playerId, onBack, onLoginClick }: PlayerProfileProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [player, setPlayer] = useState<Player | null>(null);
  const [report, setReport] = useState<ScoutingReport | null>(null);
  const [skills, setSkills] = useState<PlayerSkills | null>(null);
  const [achievements, setAchievements] = useState<PlayerAchievement[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [realtimeIndicator, setRealtimeIndicator] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);

  useEffect(() => {
    loadPlayerData();
    loadFavoritesCount();
    if (user) {
      checkFavoriteStatus();
    }

    const handleRealtimeUpdate = () => {
      setRealtimeIndicator(true);
      setTimeout(() => setRealtimeIndicator(false), 2000);
      loadPlayerData();
    };

    const handleFavoritesUpdate = () => {
      loadFavoritesCount();
      if (user) {
        checkFavoriteStatus();
      }
    };

    const playerChannel = supabase
      .channel(`player-${playerId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players', filter: `id=eq.${playerId}` }, (payload) => {
        setPlayer(payload.new as Player);
        setRealtimeIndicator(true);
        setTimeout(() => setRealtimeIndicator(false), 2000);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scouting_reports', filter: `player_id=eq.${playerId}` }, handleRealtimeUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_skills', filter: `player_id=eq.${playerId}` }, handleRealtimeUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_achievements', filter: `player_id=eq.${playerId}` }, handleRealtimeUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'favorites', filter: `player_id=eq.${playerId}` }, handleFavoritesUpdate)
      .subscribe();

    return () => {
      supabase.removeChannel(playerChannel);
    };
  }, [playerId, user]);

  const displayReport = useMemo(() => {
    if (!report) return null;
    const lang = i18n.language.split('-')[0];

    if (lang !== 'en' && report.translations && report.translations[lang]) {
        const trans = report.translations[lang];
        return {
            ...report,
            strengths: trans.strengths || report.strengths,
            weaknesses: trans.weaknesses || report.weaknesses,
            mental_game_notes: trans.mental || report.mental_game_notes
        };
    }
    return report;
  }, [report, i18n.language]);

  const loadPlayerData = async () => {
    try {
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .maybeSingle();

      if (playerError) throw playerError;
      setPlayer(playerData);

      const { data: reportData, error: reportError } = await supabase
        .from('scouting_reports')
        .select('*')
        .eq('player_id', playerId)
        .maybeSingle();

      if (reportError && reportError.code !== 'PGRST116') throw reportError;
      setReport(reportData);

      const { data: skillsData, error: skillsError } = await supabase
        .from('player_skills')
        .select('*')
        .eq('player_id', playerId)
        .maybeSingle();

      if (skillsError && skillsError.code !== 'PGRST116') throw skillsError;
      setSkills(skillsData);

      const { data: achievementsData, error: achievementsError } = await supabase
        .from('player_achievements')
        .select('*')
        .eq('player_id', playerId);

      if (achievementsError && achievementsError.code !== 'PGRST116') throw achievementsError;
      setAchievements(achievementsData || []);
    } catch (error) {
      console.error('Error loading player:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFavoritesCount = async () => {
    try {
      const { count, error } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', playerId);

      if (error) throw error;
      setFavoritesCount(count || 0);
    } catch (error) {
      console.error('Error loading favorites count:', error);
    }
  };

  const checkFavoriteStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('player_id', playerId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setIsFavorite(!!data);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      onLoginClick();
      return;
    }

    try {
      if (isFavorite) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('player_id', playerId);
        setIsFavorite(false);
      } else {
        await supabase
          .from('favorites')
          .insert([{ user_id: user.id, player_id: playerId }]);
        setIsFavorite(true);
      }
      loadFavoritesCount();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const getRadarSkills = (playerSkills: PlayerSkills | null) => {
    const keys = ['serve', 'forehand', 'backhand', 'volley', 'speed', 'power', 'mental', 'stamina'];
    const colors = ['#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'];

    return keys.map((key, index) => {
      // WICHTIG: Hier wird der rohe DB-Float-Wert gezogen und sofort fürs UI aufgerundet/gerundet
      const rawValue = playerSkills ? (playerSkills as any)[key] : 50;
      return {
        label: t(`skills.${key}`), 
        value: Math.round(Number(rawValue)), 
        color: colors[index]
      };
    });
  };

  const getAchievements = (playerAchievements: PlayerAchievement[]) => {
    const achievementMap: { [key: string]: { icon: any; title: string; description: string; color: string } } = {
      power_hitter: {
        icon: Zap,
        title: t('achievements.power_hitter.title'),
        description: t('achievements.power_hitter.desc'),
        color: 'from-yellow-600 to-orange-600'
      },
      defensive_master: {
        icon: Shield,
        title: t('achievements.defensive_master.title'),
        description: t('achievements.defensive_master.desc'),
        color: 'from-blue-600 to-cyan-600'
      },
      hot_streak: {
        icon: Flame,
        title: t('achievements.hot_streak.title'),
        description: t('achievements.hot_streak.desc'),
        color: 'from-red-600 to-pink-600'
      },
      tactical_genius: {
        icon: Brain,
        title: t('achievements.tactical_genius.title'),
        description: t('achievements.tactical_genius.desc'),
        color: 'from-purple-600 to-indigo-600'
      },
      precision_pro: {
        icon: Target,
        title: t('achievements.precision_pro.title'),
        description: t('achievements.precision_pro.desc'),
        color: 'from-green-600 to-emerald-600'
      },
      aggressive_play: {
        icon: Swords,
        title: t('achievements.aggressive_play.title'),
        description: t('achievements.aggressive_play.desc'),
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-tennis-dark">
        <div className="text-xl text-gray-300 animate-pulse">{t('homePage.loading')}</div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-tennis-dark">
        <div className="text-xl text-gray-300">{t('playerProfile.notFound')}</div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const radarSkills = getRadarSkills(skills);
  const achievementsList = getAchievements(achievements);
  
  // WICHTIG: Hier wird das Overall Rating gerundet
  const averageSkill = skills?.overall_rating ? Math.round(Number(skills.overall_rating)) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={onBack}
        className="mb-6 text-tennis-lime hover:text-tennis-green font-medium transition-colors flex items-center space-x-2 group"
      >
        <span className="transform group-hover:-translate-x-1 transition-transform">←</span>
        <span>{t('playerProfile.gamified.backToPlayers')}</span>
      </button>

      <div className="bg-gradient-to-br from-tennis-darker to-gray-900 rounded-2xl shadow-2xl overflow-hidden border-2 border-gray-700">
        <div className="relative bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 p-8">
          <div className="flex justify-between items-start gap-8">
            <div className="flex gap-6 items-start flex-1">
              <div className="relative flex-shrink-0">
                {player.profile_image_url ? (
                  <img
                    src={player.profile_image_url}
                    alt={`${player.first_name} ${player.last_name}`}
                    className="w-40 h-40 rounded-xl object-cover border-4 border-tennis-green shadow-2xl"
                  />
                ) : (
                  <div className="w-40 h-40 rounded-xl bg-gradient-to-br from-gray-600 to-gray-700 border-4 border-tennis-green shadow-2xl flex items-center justify-center">
                    <Users size={64} className="text-gray-400" />
                  </div>
                )}
                <div className="absolute -bottom-3 -right-3 bg-tennis-darker border-4 border-tennis-green rounded-xl px-4 py-2 shadow-2xl">
                  <div className="text-tennis-lime font-bold text-4xl italic transform -skew-x-6">
                    {averageSkill}
                  </div>
                  <div className="text-xs text-gray-400 text-center font-semibold">{t('homePage.filters.rating').toUpperCase()}</div>
                </div>
              </div>
              <div className="flex-1">
                <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">
                  {player.first_name} {player.last_name}
                </h1>
                <div className="flex items-center space-x-4 mb-4">
                  <p className="text-2xl text-tennis-lime font-semibold">{player.country}</p>
                  <button
                    onClick={toggleFavorite}
                    className={`p-3 rounded-full transition-all shadow-lg ${
                      isFavorite
                        ? 'bg-tennis-lime text-tennis-dark hover:bg-tennis-green animate-glow'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <div className="flex items-center space-x-2 text-gray-300 bg-gray-800 px-4 py-2 rounded-lg border border-gray-600 w-fit">
                  <Users size={18} className="text-tennis-lime" />
                  <span className="text-sm font-medium">
                    <span className="text-tennis-lime font-bold">{favoritesCount}</span> {t('playerProfile.gamified.favoritedBy', { count: favoritesCount })}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-tennis-green px-4 py-2 rounded-full flex items-center space-x-2 shadow-lg">
              <Star size={16} className="text-white" />
              <span className="text-white font-bold">{averageSkill}</span>
            </div>
          </div>
        </div>

        <div className="p-8">
          {!user && (
            <div className="mb-8 bg-gradient-to-r from-tennis-green to-green-600 rounded-xl p-6 text-center shadow-xl transform hover:scale-105 transition-transform">
              <p className="text-white text-lg mb-3 font-semibold">{t('playerProfile.gamified.ctaTrackTitle')}</p>
              <button
                onClick={onLoginClick}
                className="bg-white text-tennis-dark px-8 py-3 rounded-lg hover:bg-gray-100 font-bold text-lg transition-all shadow-lg"
              >
                {t('playerProfile.gamified.ctaTrackButton')}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
              icon={Activity}
              label={t('homePage.filters.rating')}
              value={averageSkill}
              color="text-tennis-lime"
              gradient="from-gray-800 to-gray-900"
            />
            <StatCard
              icon={TrendingUp}
              label={t('playerCard.labels.style')}
              value={player.play_style || 'Versatile'}
              color="text-green-500"
              gradient="from-gray-800 to-gray-900"
            />
            <StatCard
              icon={Trophy}
              label={t('playerCard.labels.surface')}
              value={player.surface_preference || 'All Court'}
              color="text-yellow-500"
              gradient="from-gray-800 to-gray-900"
            />
          </div>

          {displayReport ? (
            <div className="space-y-8">
              <div className="flex items-center justify-between bg-tennis-dark px-6 py-3 rounded-lg border border-gray-700">
                <div className="flex items-center space-x-2 text-gray-400">
                  <Calendar size={18} className="text-tennis-lime" />
                  <span className="text-sm">{t('playerProfile.gamified.lastUpdated', { date: formatDate(displayReport.last_updated) })}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${realtimeIndicator ? 'bg-tennis-green animate-ping' : 'bg-tennis-lime animate-pulse'}`} />
                  <span className={`text-xs font-semibold transition-all ${realtimeIndicator ? 'text-tennis-green scale-110' : 'text-tennis-lime'}`}>
                    {realtimeIndicator ? t('playerProfile.gamified.updated') : t('playerProfile.gamified.liveData')}
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-xl border-2 border-gray-700">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
                  <Activity className="mr-3 text-tennis-lime" size={32} />
                  {t('playerProfile.gamified.performanceRadar')}
                </h2>
                <SkillRadarChart skills={radarSkills} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-green-900/30 to-gray-900 p-6 rounded-xl border-2 border-tennis-green">
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                    <Award className="mr-2 text-tennis-lime" size={28} />
                    {t('playerProfile.gamified.coreStrengths')}
                  </h2>
                  <div className="space-y-4">
                    {radarSkills.slice(0, 4).map((skill, idx) => (
                      <SkillBar
                        key={idx}
                        icon={[Zap, Target, Shield, Flame][idx]}
                        label={skill.label}
                        value={skill.value}
                        color="text-tennis-lime"
                        glowColor="#84cc16"
                      />
                    ))}
                  </div>
                  <div className="mt-6 p-4 bg-tennis-dark rounded-lg border border-tennis-green">
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {displayReport.strengths || 'No strengths data available'}
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-900/30 to-gray-900 p-6 rounded-xl border-2 border-orange-600">
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                    <Target className="mr-2 text-orange-400" size={28} />
                    {t('playerProfile.gamified.developmentAreas')}
                  </h2>
                  <div className="space-y-4">
                    {radarSkills.slice(4, 8).map((skill, idx) => (
                      <SkillBar
                        key={idx}
                        icon={[Activity, Users, Brain, TrendingUp][idx]}
                        label={skill.label}
                        value={skill.value}
                        color="text-orange-400"
                        glowColor="#fb923c"
                      />
                    ))}
                  </div>
                  <div className="mt-6 p-4 bg-tennis-dark rounded-lg border border-orange-600">
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {displayReport.weaknesses || 'No weaknesses data available'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-900/30 to-gray-900 p-6 rounded-xl border-2 border-purple-600">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <Brain className="mr-2 text-purple-400" size={28} />
                  {t('playerProfile.gamified.mentalAnalysis')}
                </h2>
                <div className="p-6 bg-tennis-dark rounded-lg border border-purple-600">
                  <p className="text-gray-300 leading-relaxed">
                    {displayReport.mental_game_notes || 'No mental game analysis available'}
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
                  <Trophy className="mr-3 text-tennis-lime" size={32} />
                  {t('playerProfile.headers.achievements')}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {achievementsList.map((achievement, idx) => (
                    <AchievementBadge key={idx} {...achievement} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border-2 border-gray-700">
              <Award size={64} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg">{t('playerProfile.gamified.noDataTitle')}</p>
              <p className="text-gray-500 text-sm mt-2">{t('playerProfile.gamified.noDataDesc')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}