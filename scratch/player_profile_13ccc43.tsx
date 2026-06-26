import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Shield, Swords, Zap, Activity, Trophy, MapPin, Brain,
  ArrowLeft, Flame, Target, TrendingUp, TrendingDown,
  Minus, Layers, ClipboardList, Database, Lock, Crosshair, Battery,
  AlertTriangle, Eye, CalendarClock, HeartPulse,
  ShieldAlert, Newspaper, Twitter, MessageSquare, ExternalLink
} from 'lucide-react';
import { AchievementBadge } from '../components/AchievementBadge';
import { useAuth } from '../contexts/AuthContext';
import { ScrollToTop } from '../components/ScrollToTop';
import { LoadingScreen } from '../components/LoadingScreen'; 
import { StyleAnalysis } from '../components/StyleAnalysis'; 
import { useTranslation } from 'react-i18next';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// --- ACCESS CONTROL (VETERAN UPGRADE) ---
import { useAccess } from '../hooks/useAccess';
import { PremiumLock } from '../components/PremiumLock';

// ­ƒÜÇ SOTA: IMPORTIERTE NEUE INTELLIGENCE COMPONENTS
import { BsiSpeedPerformance } from '../components/BsiSpeedPerformance';
import { MarketOddsPerformance } from '../components/MarketOddsPerformance';

// --- STYLES ---
const style = document.createElement('style');
style.textContent = `
  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;
document.head.appendChild(style);

// --- FRAMER MOTION VARIANTS (APPLE STYLE) ---
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const fadeUpVariant = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } }
};

// --- TYPES ---
interface MatchData {
    odds1: number;
    odds2: number;
    player1_name: string;
    player2_name: string;
    actual_winner_name: string | null;
    score: string | null;
    created_at: string;
}

// --- HELPER: COLOR MAPPING ---
const BAR_COLORS: { [key: string]: string } = {
    'text-yellow-400': 'bg-yellow-400',
    'text-blue-400':   'bg-blue-400',
    'text-red-400':    'bg-red-400',
    'text-green-400':  'bg-green-400',
    'text-purple-400': 'bg-purple-400',
    'text-orange-400': 'bg-orange-400',
    'text-indigo-400': 'bg-indigo-400',
    'text-pink-400':   'bg-pink-400',
};

// ============================================================================
// ­ƒöï SOTA: LOAD MANAGEMENT & FATIGUE WIDGET
// ============================================================================
const LoadManagementWidget = ({ sackmannMetrics }: { sackmannMetrics: any }) => {
    const parsedMetrics = useMemo(() => {
        if (!sackmannMetrics) return null;
        try {
            return typeof sackmannMetrics === 'string' ? JSON.parse(sackmannMetrics) : sackmannMetrics;
        } catch (e) {
            return null;
        }
    }, [sackmannMetrics]);

    const fatigueMins = parsedMetrics?.fatigue?.recent_14d_minutes || 0;
    
    // ­ƒÜÇ SOTA FIX: Translated descriptions to English for consistency
    let statusText = "FRESH";
    let statusColor = "text-tennis-lime";
    let bgColor = "bg-tennis-lime";
    let shadowColor = "shadow-[0_0_15px_rgba(132,204,22,0.3)]";
    let description = "Optimal physical condition. No signs of fatigue expected.";
    
    // Max Scale = 1200 minutes for the bar (approx. 10-12 hard matches in 14 days)
    const percentage = Math.min(100, Math.max(0, (fatigueMins / 1200) * 100));

    if (fatigueMins > 900) {
        statusText = "CRITICAL LOAD";
        statusColor = "text-red-500";
        bgColor = "bg-red-500";
        shadowColor = "shadow-[0_0_15px_rgba(239,68,68,0.4)]";
        description = "Extreme fatigue. Massive risk of performance drop in late sets.";
    } else if (fatigueMins > 600) {
        statusText = "HEAVY LEGS";
        statusColor = "text-orange-500";
        bgColor = "bg-orange-500";
        shadowColor = "shadow-[0_0_15px_rgba(249,115,22,0.3)]";
        description = "Increased load over the last 2 weeks. Recovery deficit likely.";
    } else if (fatigueMins > 300) {
        statusText = "MATCH RHYTHM";
        statusColor = "text-blue-400";
        bgColor = "bg-blue-400";
        shadowColor = "shadow-[0_0_15px_rgba(96,165,250,0.3)]";
        description = "Perfect match rhythm. Player is dialed in without being overworked.";
    }

    return (
        <motion.div variants={fadeUpVariant} className="bg-[#1a1d26]/80 backdrop-blur-xl rounded-3xl p-6 border border-white/5 shadow-2xl relative overflow-hidden group mb-6">
            <div className={`absolute top-0 right-0 w-32 h-32 ${bgColor} opacity-5 rounded-full blur-[50px] pointer-events-none transition-colors duration-500`} />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <h3 className="text-white font-black text-lg flex items-center gap-2 relative z-10">
                    <HeartPulse className={statusColor} size={20}/> 
                    <span className="uppercase tracking-widest text-sm bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Load Management
                    </span>
                </h3>
                
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${statusColor.replace('text-', 'border-')}/30 bg-black/40 ${shadowColor}`}>
                    <Battery size={14} className={statusColor} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${statusColor}`}>{statusText}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="col-span-1 md:col-span-2">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Time on Court (Last 14 Days)</span>
                        <span className="text-xl md:text-2xl font-black text-white leading-none">
                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>{fatigueMins}</motion.span> 
                            <span className="text-sm text-gray-500 ml-1">Min</span>
                        </span>
                    </div>
                    
                    <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
                        {/* Zone Markers */}
                        <div className="absolute top-0 left-[25%] bottom-0 w-px bg-white/10 z-0"></div>
                        <div className="absolute top-0 left-[50%] bottom-0 w-px bg-white/10 z-0"></div>
                        <div className="absolute top-0 left-[75%] bottom-0 w-px bg-white/10 z-0"></div>
                        
                        {/* ­ƒÜÇ APPLE STYLE: Framer Motion Bar Fill */}
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            className={`h-full ${bgColor} relative z-10`} 
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer" />
                        </motion.div>
                    </div>
                    
                    <div className="flex justify-between mt-1 text-[8px] font-mono text-gray-600">
                        <span>0h</span>
                        <span>5h</span>
                        <span>10h</span>
                        <span>15h+</span>
                    </div>
                </div>

                <div className="col-span-1 bg-black/20 rounded-xl p-4 border border-white/5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Physiological Impact</span>
                    <p className="text-xs text-gray-300 leading-snug">{description}</p>
                </div>
            </div>
        </motion.div>
    );
};

// ============================================================================
// ­ƒºá AI INTELLIGENCE BRIEFINGS WIDGET
// ============================================================================
interface PlayerIntelligenceWidgetProps {
  insights: any[];
}

const PlayerIntelligenceWidget = ({ insights }: PlayerIntelligenceWidgetProps) => {
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  const getSentimentDetails = (sentiment: string) => {
    switch (sentiment) {
      case 'critical_injury':
        return {
          bg: 'bg-red-500/10 border-red-500/20 text-red-400',
          dot: 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]',
          label: 'Critical Injury',
          icon: ShieldAlert
        };
      case 'negative':
        return {
          bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
          dot: 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]',
          label: 'Injury / Minor Pain',
          icon: AlertTriangle
        };
      case 'positive':
        return {
          bg: 'bg-tennis-lime/10 border-tennis-lime/20 text-tennis-lime',
          dot: 'bg-tennis-lime shadow-[0_0_12px_rgba(200,250,50,0.5)]',
          label: 'Fit & Confident',
          icon: TrendingUp
        };
      default:
        return {
          bg: 'bg-white/[0.03] border-white/5 text-gray-400',
          dot: 'bg-gray-500',
          label: 'General Briefing',
          icon: Newspaper
        };
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'twitter':
        return <Twitter size={14} className="text-blue-400" />;
      case 'interview':
        return <MessageSquare size={14} className="text-purple-400" />;
      default:
        return <Newspaper size={14} className="text-gray-400" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = new Date();
      const date = new Date(dateStr);
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      
      if (diffHours < 1) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `${diffMins}m ago`;
      }
      if (diffHours < 24) {
        return `${diffHours}h ago`;
      }
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <motion.div 
      variants={fadeUpVariant} 
      className="bg-[#1a1d26]/80 backdrop-blur-xl rounded-3xl p-6 border border-white/5 shadow-2xl relative overflow-hidden group mb-6 text-left"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-tennis-lime/5 opacity-10 rounded-full blur-[50px] pointer-events-none" />
      
      <div className="flex items-center justify-between gap-4 mb-4 border-b border-white/5 pb-4">
        <h3 className="text-white font-black text-lg flex items-center gap-2 relative z-10">
          <Brain className="text-tennis-lime" size={20}/> 
          <span className="uppercase tracking-widest text-sm bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            AI Intelligence Briefings
          </span>
        </h3>
        <Link 
          to="/intelligence" 
          className="text-[10px] font-black uppercase tracking-widest text-tennis-lime hover:underline flex items-center gap-1 transition-all"
        >
          View Hub <ArrowLeft size={10} className="rotate-180" />
        </Link>
      </div>

      {insights.length === 0 ? (
        <div className="text-center py-6 text-gray-500 text-xs font-semibold">
          No recent intelligence alerts found. The player appears physically and mentally stable.
        </div>
      ) : (
        <div className="flex flex-col gap-3 relative z-10">
          {insights.map((insight) => {
            const details = getSentimentDetails(insight.sentiment);
            const isExpanded = expandedInsight === insight.id;
            
            return (
              <div 
                key={insight.id} 
                className="bg-[#0f1115]/50 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-all cursor-pointer text-left"
                onClick={() => setExpandedInsight(isExpanded ? null : insight.id)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold border ${details.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${details.dot}`} />
                      {details.label}
                    </span>
                    <span className="flex items-center gap-1 text-[9px] font-bold text-gray-500 uppercase">
                      {getSourceIcon(insight.source_type)}
                      {insight.source_name}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-gray-500">
                    {formatTimeAgo(insight.published_at)}
                  </span>
                </div>

                <h4 className="text-white text-xs font-bold leading-snug">
                  {insight.headline}
                </h4>
                
                <p className="text-gray-400 text-[11px] mt-1.5 leading-relaxed font-medium">
                  {insight.summary}
                </p>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden mt-3 pt-3 border-t border-white/5 text-left"
                    >
                      <h5 className="text-[9px] font-black uppercase text-tennis-lime tracking-widest mb-1.5">
                        Key Takeaways:
                      </h5>
                      <ul className="list-disc list-inside text-gray-300 text-[11px] space-y-1 pl-1">
                        {insight.key_takeaways.map((takeaway: string, idx: number) => (
                          <li key={idx} className="leading-relaxed">
                            {takeaway}
                          </li>
                        ))}
                      </ul>
                      {insight.url && (
                        <a 
                          href={insight.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="mt-3 inline-flex items-center gap-1 text-[10px] font-black uppercase text-tennis-lime/80 hover:text-tennis-lime tracking-wider"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Read Original Source <ExternalLink size={10} />
                        </a>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

// ============================================================================
// ­ƒîè SURFACE MASTERY HUD (TRUE ELO SCALING ENGINE)
// ============================================================================
const SurfaceMasteryWidget = ({ surfaceRatings, eloMetrics }: { surfaceRatings: any, eloMetrics?: any }) => {
    if (!surfaceRatings) return null;

    const parsedElo = useMemo(() => {
        if (!eloMetrics) return null;
        try {
            return typeof eloMetrics === 'string' ? JSON.parse(eloMetrics) : eloMetrics;
        } catch (e) {
            return null;
        }
    }, [eloMetrics]);

    const getRatingColorClass = (rating: number) => {
        if (rating >= 8.5) return 'text-[#FF00FF] border-[#FF00FF] shadow-[0_0_15px_rgba(255,0,255,0.4)]'; 
        if (rating >= 7.0) return 'text-[#3366FF] border-[#3366FF] shadow-[0_0_15px_rgba(51,102,255,0.4)]'; 
        if (rating >= 5.5) return 'text-[#00B25B] border-[#00B25B] shadow-[0_0_10px_rgba(0,178,91,0.3)]'; 
        if (rating >= 4.0) return 'text-[#F0C808] border-[#F0C808]'; 
        return 'text-[#CC0000] border-[#CC0000] shadow-[0_0_10px_rgba(204,0,0,0.3)]'; 
    };

    const surfaces = [
        { key: 'hard', label: 'HARD COURT', baseColor: 'from-blue-600 to-cyan-400', bgGlow: 'shadow-[0_0_20px_rgba(59,130,246,0.2)]' },
        { key: 'grass', label: 'GRASS', baseColor: 'from-green-600 to-emerald-400', bgGlow: 'shadow-[0_0_20px_rgba(16,185,129,0.2)]' },
        { key: 'clay', label: 'RED CLAY', baseColor: 'from-orange-600 to-red-500', bgGlow: 'shadow-[0_0_20px_rgba(249,115,22,0.2)]' }
    ];

    return (
        <motion.div variants={fadeUpVariant} className="bg-[#1a1d26]/80 backdrop-blur-xl rounded-3xl p-6 border border-white/5 shadow-2xl relative overflow-hidden group mb-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] pointer-events-none" />
            
            <h3 className="text-white font-black text-lg mb-6 flex items-center gap-2 relative z-10">
                <Layers className="text-white/80" size={20}/> 
                <span className="uppercase tracking-widest text-sm bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                    Surface Mastery
                </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                {surfaces.map((surf) => {
                    const data = surfaceRatings[surf.key] || { rating: 5.0, matches_tracked: 0 };
                    const trueElo = parsedElo && parsedElo[surf.key] ? Math.round(parsedElo[surf.key]) : null;
                    const matchesTracked = parsedElo ? parsedElo[`matches_${surf.key}`] : data.matches_tracked;
                    
                    let rating = Number(data.rating || 5.0);
                    let textLabel = data.text || "Average";

                    if (trueElo) {
                        rating = ((trueElo - 1400) / (2100 - 1400)) * 9.0 + 1.0;
                        rating = Math.max(1.0, Math.min(10.0, rating));
                        
                        if (rating >= 8.5) textLabel = "­ƒöÑ ELITE";
                        else if (rating >= 7.0) textLabel = "­ƒôê STRONG";
                        else if (rating >= 5.5) textLabel = "Ô£à SOLID";
                        else if (rating >= 4.0) textLabel = "ÔÜá´©Å VULNERABLE";
                        else textLabel = "ÔØä´©Å WEAKNESS";
                    }

                    const percentage = Math.min(100, Math.max(10, rating * 10)); 
                    const ratingColor = getRatingColorClass(rating);

                    return (
                        <div key={surf.key} className="flex flex-col gap-3">
                            <div className="flex justify-between items-end px-1">
                                <span className="text-[10px] font-bold text-gray-400 tracking-[0.2em]">{surf.label}</span>
                                <div className="flex flex-col items-end">
                                    {trueElo && (
                                        <span className="text-[10px] font-black text-tennis-lime tracking-widest mb-0.5">ELO: {trueElo}</span>
                                    )}
                                    <span className="text-[8px] text-gray-600 font-mono">{matchesTracked || 0} MATCHES</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <div className="flex-1 h-3 bg-gray-800/50 rounded-full overflow-hidden relative border border-white/5">
                                    {/* ­ƒÜÇ APPLE STYLE: Framer Motion Bar Fill */}
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentage}%` }}
                                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                                        className={`absolute top-0 left-0 h-full rounded-full bg-gradient-to-r ${surf.baseColor} relative overflow-hidden`}
                                    >
                                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer" />
                                        <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
                                    </motion.div>
                                </div>

                                <div className="flex flex-col items-center gap-1">
                                    <motion.div 
                                        whileHover={{ scale: 1.1 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                        className={`
                                            w-12 h-10 flex items-center justify-center rounded-lg
                                            bg-[#0f1115] border-2 ${ratingColor}
                                            text-lg font-black tracking-tighter backdrop-blur-md cursor-default
                                        `}
                                    >
                                        {rating.toFixed(1)}
                                    </motion.div>
                                    <span className={`text-[8px] uppercase font-bold tracking-widest ${ratingColor.split(' ')[0]}`}>{textLabel}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
};

// ============================================================================
// ­ƒÜÇ THE NEW GOD-MODE METRICS WIDGET (RADAR CHART + APPLE CARDS)
// ============================================================================
const CustomRadarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-[#15171e]/95 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{data.subject}</span>
                <span className="text-lg font-black text-tennis-lime">{data.A}%</span>
            </div>
        );
    }
    return null;
};

// ­ƒÜÇ SOTA FIX: Getrennte Text & Background Klassen zur Verhinderung unsichtbarer Schrift
const QuantStatCard = ({ title, value, icon: Icon, textClass, bgClass, suffix = "" }: any) => {
    const displayValue = value !== undefined && value !== null ? value : '-';
    
    return (
        <motion.div 
            variants={fadeUpVariant}
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="bg-[#0f1115] border border-white/5 rounded-2xl p-4 relative overflow-hidden group min-w-[150px] md:min-w-0 flex-1 snap-center shadow-lg h-full shrink-0 cursor-default"
        >
            <div className={`absolute -right-4 -bottom-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500 ${textClass}`}>
                <Icon size={80} />
            </div>
            
            <div className="relative z-10 flex flex-col h-full justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg bg-white/5 ${textClass} ${bgClass} bg-opacity-10`}>
                        <Icon size={14} className={textClass} />
                    </div>
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400">{title}</span>
                </div>
                
                <div className={`text-2xl md:text-3xl font-black tracking-tight ${textClass}`}>
                    {displayValue}
                    {displayValue !== '-' && (
                        <span className="text-sm ml-0.5 text-gray-500 font-bold">{suffix}</span>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

const AdvancedQuantWidget = ({ advancedStats }: { advancedStats: any }) => {
    const [activeSurface, setActiveSurface] = useState<'overall' | 'hard' | 'clay' | 'grass'>('overall');
    const [activeTime, setActiveTime] = useState<'all' | 'ytd' | '1m' | 'l7'>('all');

    const parsedStats = useMemo(() => {
        if (!advancedStats) return null;
        try {
            const parsed = typeof advancedStats === 'string' ? JSON.parse(advancedStats) : advancedStats;
            if (!parsed['all'] && (parsed['overall'] || parsed['hard'])) {
                return { all: parsed };
            }
            return parsed;
        } catch (e) {
            return null;
        }
    }, [advancedStats]);

    if (!parsedStats) return null;

    const timeData = parsedStats[activeTime] || parsedStats['all'];
    const currentStats = timeData ? timeData[activeSurface] : null;

    const radarData = currentStats ? [
        { subject: '1st Serve In', A: currentStats.first_in_pct || 0, fullMark: 100 },
        { subject: '1st Serve Win', A: currentStats.first_win_pct || 0, fullMark: 100 },
        { subject: '2nd Serve Win', A: currentStats.second_win_pct || 0, fullMark: 100 },
        { subject: 'Return Win', A: currentStats.ret_win_pct || 0, fullMark: 100 },
        { subject: 'BP Saved', A: currentStats.bp_saved_pct || 0, fullMark: 100 },
        { subject: 'BP Conv.', A: currentStats.bp_conv_pct || 0, fullMark: 100 },
    ] : [];

    return (
        <motion.div variants={fadeUpVariant} className="bg-[#1a1d26] rounded-3xl p-5 md:p-6 border border-white/5 shadow-xl mb-6 relative overflow-hidden">
            <div className="flex flex-col gap-4 mb-6">
                
                <div className="flex items-center justify-between">
                    <h3 className="text-white font-black text-lg flex items-center gap-2">
                        <Database className="text-purple-400" size={20}/> 
                        <span className="uppercase tracking-widest text-sm bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
                            Quant Performance Matrix
                        </span>
                    </h3>
                </div>

                {/* ­ƒÜÇ APPLE-LIKE SEGMENTED CONTROLS */}
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 overflow-x-auto hide-scrollbar flex-1 relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-30 md:hidden">
                            <CalendarClock size={12} className="text-white" />
                        </div>
                        {[
                            { id: 'l7', label: 'Last 7' },
                            { id: '1m', label: '1 Month' },
                            { id: 'ytd', label: 'Yearly' },
                            { id: 'all', label: 'All Time' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTime(tab.id as any)}
                                className={`flex-1 min-w-max px-3 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all duration-300 relative ${activeTime === tab.id ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                {activeTime === tab.id && (
                                    <motion.div layoutId="activeTimeBg" className="absolute inset-0 bg-[#2a2d36] rounded-lg border border-white/10 z-0" />
                                )}
                                <span className="relative z-10">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 overflow-x-auto hide-scrollbar flex-1 relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-30 md:hidden">
                            <Layers size={12} className="text-white" />
                        </div>
                        {['overall', 'hard', 'clay', 'grass'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveSurface(tab as any)}
                                className={`flex-1 min-w-max px-3 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all duration-300 relative ${activeSurface === tab ? 'text-black shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                {activeSurface === tab && (
                                    <motion.div layoutId="activeSurfaceBg" className="absolute inset-0 bg-white rounded-lg border border-white/10 z-0" />
                                )}
                                <span className="relative z-10">{tab}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ­ƒÜÇ APPLE STYLE: Animate Presence for Tab Swapping */}
            <AnimatePresence mode="wait">
                {!currentStats ? (
                    <motion.div 
                        key="no-data"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="h-48 flex flex-col items-center justify-center opacity-30 bg-black/20 rounded-2xl border border-white/5 border-dashed"
                    >
                        <Eye size={24} className="mb-2" />
                        <span className="text-[10px] uppercase font-bold tracking-widest">No Data for {activeTime} / {activeSurface}</span>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="has-data"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                    >
                        
                        <div className="lg:col-span-1 bg-[#0f1115] rounded-2xl border border-white/5 flex flex-col items-center justify-center p-4 relative overflow-hidden shadow-inner">
                            <div className="absolute inset-0 bg-gradient-to-br from-tennis-lime/5 to-transparent pointer-events-none" />
                            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 absolute top-4 left-4">Player Profile Map</h4>
                            
                            <div className="w-full h-[220px] md:h-[260px] mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                                        <PolarGrid stroke="#374151" strokeDasharray="3 3" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 9, fontWeight: 'bold' }} />
                                        <Radar name="Metrics" dataKey="A" stroke="#ccff00" strokeWidth={2} fill="#ccff00" fillOpacity={0.2} />
                                        <RechartsTooltip content={<CustomRadarTooltip />} cursor={false} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="lg:col-span-2">
                            <motion.div 
                                variants={staggerContainer}
                                initial="hidden"
                                animate="show"
                                className="flex overflow-x-auto pb-4 gap-3 md:gap-4 -mx-5 px-5 md:mx-0 md:px-0 md:pb-0 snap-x snap-mandatory hide-scrollbar md:grid md:grid-cols-4 md:grid-rows-2 h-full"
                            >
                                <QuantStatCard title="Aces" value={currentStats.aces_per_match} suffix="/m" icon={Target} textClass="text-yellow-400" bgClass="bg-yellow-400" />
                                <QuantStatCard title="DFs" value={currentStats.df_per_match} suffix="/m" icon={AlertTriangle} textClass="text-red-500" bgClass="bg-red-500" />
                                <QuantStatCard title="1st In" value={currentStats.first_in_pct} suffix="%" icon={Activity} textClass="text-blue-400" bgClass="bg-blue-400" />
                                <QuantStatCard title="1st Win" value={currentStats.first_win_pct} suffix="%" icon={Zap} textClass="text-tennis-lime" bgClass="bg-tennis-lime" />
                                <QuantStatCard title="2nd Win" value={currentStats.second_win_pct} suffix="%" icon={Activity} textClass="text-orange-400" bgClass="bg-orange-400" />
                                <QuantStatCard title="Return" value={currentStats.ret_win_pct} suffix="%" icon={Swords} textClass="text-pink-400" bgClass="bg-pink-400" />
                                <QuantStatCard title="BP Saved" value={currentStats.bp_saved_pct} suffix="%" icon={Shield} textClass="text-blue-500" bgClass="bg-blue-500" />
                                <QuantStatCard title="BP Conv" value={currentStats.bp_conv_pct} suffix="%" icon={Crosshair} textClass="text-red-500" bgClass="bg-red-500" />
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <div className="mt-4 flex items-center justify-end gap-2 text-[8px] text-gray-600 font-bold uppercase tracking-widest border-t border-white/5 pt-4">
                <div className="w-1.5 h-1.5 rounded-full bg-tennis-lime animate-pulse"></div>
                Based on {currentStats?.matches_with_stats || 0} granular matches
            </div>
        </motion.div>
    );
};

// ============================================================================
// ­ƒºá QUANTUM FORM ENGINE
// ============================================================================

const getVegasVisuals = (rating: number) => {
    if (rating >= 9.5) return { bg: 'bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 animate-gradient-xy', text: 'text-white', label: 'MYTHICAL', glow: 'shadow-[0_0_20px_rgba(236,72,153,0.6)]' };
    if (rating >= 9.0) return { bg: 'bg-[#800080]', text: 'text-white', label: 'GODLIKE', glow: 'shadow-[0_0_15px_rgba(128,0,128,0.5)]' };
    if (rating >= 8.5) return { bg: 'bg-[#00008B]', text: 'text-white', label: 'ELITE', glow: 'shadow-[0_0_15px_rgba(0,0,139,0.5)]' };
    if (rating >= 8.0) return { bg: 'bg-[#0000FF]', text: 'text-white', label: 'COLD BLOODED', glow: 'shadow-[0_0_15px_rgba(0,0,255,0.4)]' };
    if (rating >= 7.5) return { bg: 'bg-[#006400]', text: 'text-white', label: 'PEAK', glow: 'shadow-[0_0_15px_rgba(0,100,0,0.4)]' };
    if (rating >= 7.0) return { bg: 'bg-[#008000]', text: 'text-white', label: 'SOLID', glow: 'shadow-[0_0_15px_rgba(0,128,0,0.4)]' };
    if (rating >= 6.0) return { bg: 'bg-[#FFFF00]', text: 'text-black', label: 'AVERAGE', glow: 'shadow-[0_0_15px_rgba(255,255,0,0.3)]' };
    if (rating >= 5.0) return { bg: 'bg-[#FF0000]', text: 'text-white', label: 'STRUGGLING', glow: 'shadow-[0_0_15px_rgba(255,0,0,0.4)]' };
    return { bg: 'bg-[#8B0000]', text: 'text-white', label: 'DISASTER', glow: 'shadow-[0_0_15px_rgba(139,0,0,0.5)]' };
};

const parseScoreDetails = (scoreStr: string | null, playerWon: boolean): number => {
    if (!scoreStr || scoreStr.toLowerCase().includes('ret') || scoreStr.toLowerCase().includes('wo')) return 0.5;

    const matches = scoreStr.match(/(\d+)-(\d+)/g);
    if (!matches) return 0.5;

    let gamesWon = 0;
    let totalGames = 0;
    let setsLost = 0;
    let setsWon = 0;

    matches.forEach(m => {
        const parts = m.split('-');
        const l = parseInt(parts[0]);
        const r = parseInt(parts[1]);
        const pGames = playerWon ? l : r;
        const oGames = playerWon ? r : l;

        gamesWon += pGames;
        totalGames += (l + r);
        
        if (pGames < oGames) setsLost++;
        if (pGames > oGames) setsWon++;
    });

    if (totalGames === 0) return 0.5;

    let dominance = gamesWon / totalGames;
    if (playerWon && setsLost === 0) dominance += 0.10;
    if (!playerWon && setsWon > 0) dominance += 0.15;

    return Math.min(Math.max(dominance, 0.0), 1.0);
};

const calculateQuantumRating = (matches: MatchData[], playerName: string) => {
    let currentRating = 6.5; 
    const historyLog: { res: 'W'|'L', odds: number, delta: number, tooltip: string }[] = [];
    const sortedMatches = [...matches].reverse();

    sortedMatches.forEach((m, idx) => {
        const isP1 = m.player1_name.toLowerCase().includes(playerName.toLowerCase());
        let odds = isP1 ? m.odds1 : m.odds2;
        if (odds <= 1.0) odds = 1.01;

        const winner = m.actual_winner_name || "";
        const won = winner.toLowerCase().includes(playerName.toLowerCase());
        const dominance = parseScoreDetails(m.score, won);
        let delta = 0.0;

        if (won) {
            if (odds < 1.20) delta = 0.1 + (dominance * 0.1);
            else if (odds <= 2.00) delta = 0.3 + (dominance * 0.2);
            else if (odds <= 3.00) delta = 0.8 + (dominance * 0.3);
            else {
                const logBoost = Math.log2(odds);
                delta = 1.0 + (logBoost * 0.3);
            }
        } else {
            if (odds < 1.20) delta = -1.5 - (1.0 - dominance);
            else if (odds <= 2.00) delta = -0.6 - (0.5 - dominance);
            else if (odds <= 3.00) {
                 if (dominance > 0.45) delta = +0.1;
                 else delta = -0.2;
            } else {
                 if (dominance > 0.4) delta = +0.2; 
                 else delta = 0.0;
            }
        }

        const weight = 0.5 + (idx * 0.2); 
        currentRating += (delta * weight);
        
        const opponent = isP1 ? m.player2_name : m.player1_name;
        historyLog.push({
            res: won ? 'W' : 'L',
            odds: odds,
            delta: delta,
            tooltip: `${won ? 'WIN' : 'LOSS'} vs ${opponent} (@${odds})\nScore: ${m.score || 'N/A'}`
        });
    });

    const finalRating = Math.max(0.0, Math.min(10.0, currentRating));
    return { 
        rating: Number(finalRating.toFixed(1)), 
        history: historyLog.reverse()
    };
};

function VegasFormWidget({ playerName, dbFormRating }: { playerName: string, dbFormRating?: any }) {
    const [stats, setStats] = useState<{ rating: number, history: any[] } | null>(null);
    const [loading, setLoading] = useState(true);

    const dbScore = useMemo(() => {
        if (!dbFormRating) return null;
        try {
            const parsed = typeof dbFormRating === 'string' ? JSON.parse(dbFormRating) : dbFormRating;
            return parsed && typeof parsed.score === 'number' ? parsed.score : null;
        } catch(e) {
            return null;
        }
    }, [dbFormRating]);

    useEffect(() => {
        const fetchMatches = async () => {
            if (!playerName) return;
            const { data } = await supabase
                .from('market_odds')
                .select('odds1, odds2, player1_name, player2_name, actual_winner_name, score, created_at')
                .or(`player1_name.ilike.%${playerName}%,player2_name.ilike.%${playerName}%`) 
                .not('actual_winner_name', 'is', null)
                .order('created_at', { ascending: false })
                .limit(8);

            if (data && data.length > 0) {
                const calculated = calculateQuantumRating(data.slice(0, 5), playerName);
                setStats(calculated);
            } else {
                setStats({ rating: 6.5, history: [] });
            }
            setLoading(false);
        };
        fetchMatches();
    }, [playerName]);

    if (loading) return <div className="animate-pulse w-20 h-20 bg-gray-800 rounded-2xl border border-white/5"></div>;

    const { rating: calcRating, history } = stats || { rating: 6.5, history: [] };
    const displayRating = dbScore !== null ? Number(dbScore.toFixed(1)) : calcRating;
    const visuals = getVegasVisuals(displayRating);
    const trend = history.length >= 2 ? (history[0].delta > history[1].delta ? 'up' : 'down') : 'flat';

    return (
        <motion.div variants={fadeUpVariant} className="flex flex-col items-center gap-3 group relative z-10">
            <div className={`relative w-20 h-20 md:w-24 h-24 ${visuals.bg} rounded-2xl ${visuals.glow} flex flex-col items-center justify-center border-[3px] border-[#0f1115] transform transition-all duration-500 hover:scale-110 cursor-help overflow-hidden`}>
                {displayRating >= 9.5 && (
                     <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-30 animate-shimmer" />
                )}
                <span className={`text-[10px] md:text-[11px] uppercase font-black ${visuals.text} opacity-90 tracking-tighter mb-[-2px]`}>
                    FORM
                </span>
                <span className={`text-3xl md:text-4xl font-black ${visuals.text} leading-none drop-shadow-md`}>
                    {displayRating}
                </span>
                <div className="absolute top-1 right-1">
                    {trend === 'up' && <TrendingUp size={12} className="text-white/80" />}
                    {trend === 'down' && <TrendingDown size={12} className="text-white/80" />}
                    {trend === 'flat' && <Minus size={12} className="text-white/80" />}
                </div>
            </div>
            <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 border border-white/10 ${visuals.text} tracking-wider`}>
                {visuals.label}
            </div>
            <div className="flex gap-1.5 absolute -bottom-8 bg-[#0f1115]/90 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 shadow-lg">
                {history.map((h, i) => (
                    <div key={i} className="group/dot relative">
                        <div className={`w-2 h-2 rounded-full transition-all duration-300 ${h.res === 'W' ? 'bg-tennis-lime shadow-[0_0_6px_#ccff00]' : 'bg-red-500 opacity-80'}`} />
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

function StatCard({ icon: Icon, color, label, value }: any) {
    const numericValue = Number(value);
    const safeValue = isNaN(numericValue) ? 0 : Math.min(100, Math.max(0, numericValue));
    const displayValue = isNaN(numericValue) || value === null || value === undefined ? '-' : Math.round(numericValue);
    const bgClass = BAR_COLORS[color] || 'bg-gray-600';

    return (
        <motion.div 
            variants={fadeUpVariant}
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="bg-[#1a1d26] p-3 md:p-4 rounded-2xl border border-white/5 flex flex-col justify-between shadow-lg hover:border-white/10"
        >
            <div className={`flex items-center gap-2 text-gray-400 text-[10px] md:text-xs font-bold uppercase mb-2`}>
                <Icon size={12} className={color}/> {label}
            </div>
            <div>
                <div className="text-2xl md:text-3xl font-black text-white">
                    {displayValue}
                </div>
                <div className="w-full h-1.5 bg-gray-800 rounded-full mt-3 overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: `${safeValue}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full ${bgClass}`} 
                    />
                </div>
            </div>
        </motion.div>
    );
}

const renderPlayStyleTags = (playStyleString: string) => {
    if (!playStyleString) return <span className="text-gray-500">Unknown Style</span>;
    const styles = playStyleString.split(',').map(s => s.trim());
    return (
        <div className="flex flex-wrap gap-2 justify-center">
            {styles.map((style, idx) => {
                const parts = style.split('(');
                const main = parts[0].trim();
                const sub = parts.length > 1 ? parts[1].replace(')', '').trim() : null;
                return (
                    <div key={idx} className="flex items-center bg-gray-800/80 border border-gray-700 rounded-full px-3 py-1 text-xs backdrop-blur-sm">
                        <span className="font-bold text-white mr-1.5">{main}</span>
                        {sub && (
                            <span className="bg-tennis-lime/20 text-tennis-lime text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide">{sub}</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ============================================================================
// MAIN COMPONENT: PLAYER PROFILE
// ============================================================================

export function PlayerProfile() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const { isElite } = useAccess(); 
  
  const [player, setPlayer] = useState<any>(null);
  const [skills, setSkills] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]); 
  const [insights, setInsights] = useState<any[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      try {
          const [p, s, r, a, ins] = await Promise.all([
              supabase.from('players').select('*').eq('id', id).single(),
              supabase.from('player_skills').select('*').eq('player_id', id).maybeSingle(),
              supabase.from('scouting_reports').select('*').eq('player_id', id).maybeSingle(),
              supabase.from('player_achievements').select('*').eq('player_id', id),
              supabase.from('tennis_insights')
                .select('*')
                .eq('player_id', id)
                .order('published_at', { ascending: false })
                .limit(5)
          ]);
          
          if (p.data) setPlayer(p.data);
          setSkills(s.data || {}); 
          if (r.data) setReport(r.data);
          if (a.data) setAchievements(a.data);
          if (ins.data) setInsights(ins.data);
      } catch (error) {
          console.error("Error loading player data:", error);
      } finally {
          setLoading(false);
      }
    };
    loadData();
  }, [id]);

  useEffect(() => { 
      if(user && player && id) checkFavorite(); 
  }, [user, player, id]);

  const displayReport = useMemo(() => {
    if (!report) return null;
    const lang = i18n.language ? i18n.language.split('-')[0] : 'en'; 
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

  const checkFavorite = async () => {
    if (!user || !id) return;
    const { data } = await supabase.from('favorites').select('id').eq('user_id', user.id).eq('player_id', id).maybeSingle();
    setIsFavorite(!!data);
  };

  const toggleFavorite = async () => {
    if (!user) {
        alert("Please login to track players");
        return;
    }
    if (!id) return;
    if (isFavorite) {
        await supabase.from('favorites').delete().eq('user_id', user.id).eq('player_id', id);
        setIsFavorite(false);
    } else {
        await supabase.from('favorites').insert([{ user_id: user.id, player_id: id }]);
        setIsFavorite(true);
    }
  };

  const getAchievementsList = (playerAchievements: any[]) => {
    const achievementMap: { [key: string]: { icon: any; title: string; description: string; color: string } } = {
      power_hitter: { icon: Zap, title: t('achievements.power_hitter.title'), description: t('achievements.power_hitter.desc'), color: 'from-yellow-600 to-orange-600' },
      defensive_master: { icon: Shield, title: t('achievements.defensive_master.title'), description: t('achievements.defensive_master.desc'), color: 'from-blue-600 to-cyan-600' },
      hot_streak: { icon: Flame, title: t('achievements.hot_streak.title'), description: t('achievements.hot_streak.desc'), color: 'from-red-600 to-pink-600' },
      tactical_genius: { icon: Brain, title: t('achievements.tactical_genius.title'), description: t('achievements.tactical_genius.desc'), color: 'from-purple-600 to-indigo-600' },
      precision_pro: { icon: Target, title: t('achievements.precision_pro.title'), description: t('achievements.precision_pro.desc'), color: 'from-green-600 to-emerald-600' },
      aggressive_play: { icon: Swords, title: t('achievements.aggressive_play.title'), description: t('achievements.aggressive_play.desc'), color: 'from-orange-600 to-red-600' }
    };
    return Object.keys(achievementMap).map(key => {
      const achievement = playerAchievements?.find(a => a.achievement_key === key);
      return {
        ...achievementMap[key],
        unlocked: achievement?.unlocked || false
      };
    });
  };

  const achievementsList = getAchievementsList(achievements);

  if (loading) return <LoadingScreen message={t('matchup.loading')} />;
  if (!player) return <div className="p-8 text-center text-white mt-20">{t('playerProfile.notFound')}</div>;

  return (
    <div className="pb-24 bg-[#0f1115] min-h-screen relative overflow-x-hidden">
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      <ScrollToTop /> 

      {/* HEADER HERO SECTION */}
      <div className="relative h-[45vh] md:h-[55vh] w-full">
          <div className="absolute inset-0">
              {player.profile_image_url ? (
                 <motion.img 
                    initial={{ opacity: 0, scale: 1.05 }} 
                    animate={{ opacity: 0.3, scale: 1 }} 
                    transition={{ duration: 1 }} 
                    src={player.profile_image_url} 
                    className="w-full h-full object-cover blur-sm" 
                    alt="Player BG" 
                 />
              ) : (
                 <div className="w-full h-full bg-gray-900 opacity-30" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f1115] via-[#0f1115]/80 to-transparent" />
          </div>
          
          <div className="absolute top-4 left-4 z-20">
              <button 
                onClick={() => navigate(-1)} 
                className="bg-black/40 backdrop-blur-md p-2 rounded-full border border-white/10 text-white hover:bg-white/10 transition-colors inline-block cursor-pointer"
              >
                  <ArrowLeft size={24} />
              </button>
          </div>
          
          {/* PROFILE INFO & WIDGET */}
          <div className="absolute -bottom-16 left-0 right-0 flex flex-col items-center z-10 px-4">
              
              <div className="flex items-end gap-6 md:gap-10 mb-4">
                  <div className="hidden md:block w-20"></div>

                  {/* Profile Image */}
                  <motion.div 
                      initial={{ y: 50, opacity: 0 }} 
                      animate={{ y: 0, opacity: 1 }} 
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                      className="relative w-28 h-28 md:w-36 md:h-36 rounded-full p-1.5 bg-gradient-to-br from-gray-700 to-black shadow-2xl z-20"
                  >
                      {player.profile_image_url ? (
                        <img src={player.profile_image_url} className="w-full h-full object-cover rounded-full border-4 border-[#0f1115]" alt={player.last_name} />
                      ) : (
                        <div className="w-full h-full rounded-full border-4 border-[#0f1115] bg-gray-800 flex items-center justify-center text-gray-500 text-xs">NO IMG</div>
                      )}
                      
                      <div className="absolute bottom-0 right-0 bg-[#0f1115] border-2 border-tennis-lime text-tennis-lime font-black text-xs md:text-sm px-2.5 py-1 rounded-full shadow-lg z-30">
                        {skills?.overall_rating != null ? Math.round(Number(skills.overall_rating)) : '-'}
                      </div>
                  </motion.div>

                  <div className="mb-2 z-10">
                      <VegasFormWidget 
                          playerName={player.last_name} 
                          dbFormRating={player.form_rating} 
                      />
                  </div>
              </div>

              <motion.h1 
                  initial={{ y: 10, opacity: 0 }} 
                  animate={{ y: 0, opacity: 1 }} 
                  transition={{ delay: 0.1 }}
                  className="text-3xl md:text-4xl font-black text-white mt-2 uppercase tracking-tighter text-center leading-none drop-shadow-xl"
              >
                {player.first_name} <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">{player.last_name}</span>
              </motion.h1>
              
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-col items-center gap-3 mt-3">
                  <div className="flex items-center gap-2 text-gray-400 text-xs md:text-sm font-bold bg-black/40 px-3 py-1 rounded-full border border-white/5 backdrop-blur-sm">
                      <MapPin size={12} className="text-tennis-lime" /> {player.country}
                  </div>
                  {renderPlayStyleTags(player.play_style)}
              </motion.div>

              <motion.button 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  onClick={toggleFavorite} 
                  className={`mt-5 px-8 py-2.5 rounded-full text-xs md:text-sm font-bold transition-all shadow-[0_0_20px_rgba(204,255,0,0.15)] hover:shadow-[0_0_30px_rgba(204,255,0,0.3)] flex items-center gap-2 ${isFavorite ? 'bg-tennis-lime text-black' : 'bg-gray-800/80 backdrop-blur text-gray-300 border border-gray-700 hover:bg-gray-700'}`}
              >
                  <Trophy size={14} className={isFavorite ? 'fill-black' : ''} />{isFavorite ? t('playerProfile.tracking') : t('playerProfile.track')}
              </motion.button>
          </div>
      </div>

      <div className="mt-24 md:mt-28 px-4 max-w-5xl mx-auto space-y-6 md:space-y-8">
          
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col gap-6 md:gap-8">
              
              {/* ­ƒöï SOTA: LOAD MANAGEMENT WIDGET */}
              <LoadManagementWidget sackmannMetrics={skills?.sackmann_metrics} />

              {/* ­ƒºá AI INTELLIGENCE BRIEFINGS */}
              <PlayerIntelligenceWidget insights={insights} />

              {/* SURFACE MASTERY WIDGET (WITH TRUE ELO) */}
              <SurfaceMasteryWidget 
                  surfaceRatings={player.surface_ratings} 
                  eloMetrics={skills?.elo_metrics} 
              />

              {/* ­ƒÜÇ SOTA: THE NEW ADVANCED QUANT METRICS WIDGET */}
              <AdvancedQuantWidget advancedStats={skills?.advanced_stats} />

              {/* STATS GRID */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  <StatCard icon={Zap} color="text-yellow-400" label={t('skills.forehand')} value={skills?.forehand} />
                  <StatCard icon={Shield} color="text-blue-400" label={t('skills.backhand')} value={skills?.backhand} />
                  <StatCard icon={Flame} color="text-red-400" label={t('skills.power')} value={skills?.power} />
                  <StatCard icon={Activity} color="text-green-400" label={t('skills.speed')} value={skills?.speed} />
                  <StatCard icon={Brain} color="text-purple-400" label={t('skills.mental')} value={skills?.mental} />
                  <StatCard icon={Target} color="text-orange-400" label={t('skills.serve')} value={skills?.serve} />
                  <StatCard icon={Trophy} color="text-indigo-400" label={t('skills.volley')} value={skills?.volley} />
                  <StatCard icon={Activity} color="text-pink-400" label={t('skills.stamina')} value={skills?.stamina} />
              </div>

              {/* DOSSIER: SCOUTING & MENTAL (Grid on Desktop) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  
                  {/* SCOUTING REPORT */}
                  {displayReport && (
                      <motion.div variants={fadeUpVariant} className="lg:col-span-2 bg-[#1a1d26] rounded-3xl p-5 md:p-6 border border-white/5 shadow-xl overflow-hidden flex flex-col">
                          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 md:mb-6">
                              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                  <Target className="text-tennis-lime" size={20}/> 
                                  <span className="uppercase tracking-widest text-sm">{t('playerProfile.headers.scoutingReport')}</span>
                              </h3>
                              <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                                  <ClipboardList size={12} className="text-gray-400" />
                                  <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Dossier</span>
                              </div>
                          </div>
                          
                          <div className="flex md:grid md:grid-cols-2 gap-4 md:gap-8 overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-4 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 hide-scrollbar">
                              <div className="min-w-[85%] md:min-w-0 snap-center h-full">
                                  <h4 className="text-[10px] font-black text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div> {t('playerProfile.sections.strengths')}
                                  </h4>
                                  <div className="bg-black/20 md:bg-transparent p-4 md:p-0 rounded-xl md:rounded-none border border-white/5 md:border-0 h-full">
                                     <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">{displayReport.strengths}</p>
                                  </div>
                              </div>

                              <div className="min-w-[85%] md:min-w-0 snap-center h-full">
                                  <h4 className="text-[10px] font-black text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div> {t('playerProfile.sections.weaknesses')}
                                  </h4>
                                  <div className="bg-black/20 md:bg-transparent p-4 md:p-0 rounded-xl md:rounded-none border border-white/5 md:border-0 h-full">
                                      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">{displayReport.weaknesses}</p>
                                  </div>
                              </div>
                          </div>
                      </motion.div>
                  )}

                  {/* MENTAL GAME */}
                  {displayReport && (
                      <motion.div variants={fadeUpVariant} className="lg:col-span-1 bg-[#1a1d26] rounded-3xl p-6 border border-white/5 shadow-xl flex flex-col">
                          <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                              <Brain className="text-purple-400" size={20}/> 
                              <span className="text-sm uppercase tracking-widest">{t('playerProfile.headers.psychological')}</span>
                          </h3>
                          <div className="bg-black/20 p-5 rounded-2xl text-gray-300 text-sm leading-relaxed border border-white/5 whitespace-pre-wrap break-words flex-1">
                              {displayReport.mental_game_notes || t('playerProfile.noMentalData')}
                          </div>
                      </motion.div>
                  )}
              </div>

              {/* ­ƒÜÇ SOTA: APPLE-LIKE SWIPEABLE ANALYTICS SECTION (Full Bleed Layout) */}
              <div className="mb-10 w-full overflow-visible relative">
                  
                  <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2 px-1 relative z-10">
                      <Activity className="text-tennis-lime" size={20}/> 
                      <span className="uppercase tracking-widest text-sm">Deep Dive Intelligence</span>
                  </h3>
                  
                  {/* SOTA FIX: Container "bricht aus" um Full-Bleed Scrolling auf Desktop zu garantieren */}
                  <div className="relative w-[100vw] left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
                    <div className="flex overflow-x-auto gap-4 md:gap-6 pb-8 px-4 md:px-[calc(50vw-490px)] xl:px-[calc(50vw-512px)] snap-x snap-mandatory hide-scrollbar">
                        
                        {/* STYLE ANALYSIS CARD */}
                        <div className="w-[88vw] md:w-[440px] snap-center shrink-0 flex flex-col">
                            <PremiumLock 
                                isLocked={false}
                                minTier="ELITE"
                                title={t('premium.styleAnalysis.title') || "ELITE ANALYSIS"}
                                description=""
                            >
                                <StyleAnalysis playerName={player.last_name} />
                            </PremiumLock>
                        </div>
                        
                        {/* BSI SPEED PERFORMANCE CARD */}
                        <div className="w-[88vw] md:w-[440px] snap-center shrink-0 flex flex-col">
                            <BsiSpeedPerformance playerName={player.last_name} />
                        </div>
                        
                        {/* MARKET ODDS PERFORMANCE CARD */}
                        <div className="w-[88vw] md:w-[440px] snap-center shrink-0 flex flex-col">
                            <MarketOddsPerformance playerName={player.last_name} />
                        </div>

                    </div>
                  </div>
              </div>

              {/* ACHIEVEMENTS */}
              <motion.div variants={fadeUpVariant} className="bg-[#1a1d26] rounded-3xl p-6 border border-white/5 w-full overflow-hidden shadow-xl mb-12">
                <h4 className="text-white font-bold text-md mb-4 flex items-center gap-2"><Trophy className="text-yellow-500" size={18}/> {t('playerProfile.headers.achievements')}</h4>
                <div className="flex overflow-x-auto gap-3 pb-2 w-full hide-scrollbar snap-x p-1">
                    {achievementsList.map((achievement, idx) => (
                        <motion.div whileHover={{ y: -2 }} key={idx} className="min-w-[130px] w-[130px] snap-center shrink-0">
                            <AchievementBadge {...achievement} />
                        </motion.div>
                    ))}
                </div>
              </motion.div>

          </motion.div>
      </div>
    </div>
  );
}

export default PlayerProfile;
