import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { 
  Brain, Search, Calendar, MessageSquare, 
  Newspaper, Twitter, ArrowRight, ShieldAlert, TrendingUp, AlertTriangle, Loader2,
  Cpu, Sparkles, ArrowUpRight, Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Insight {
  id: string;
  player_id: string | null;
  source_type: 'twitter' | 'news' | 'interview';
  source_name: string;
  url: string | null;
  headline: string;
  summary: string;
  key_takeaways: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'critical_injury';
  published_at: string;
  player?: {
    id: string;
    first_name: string;
    last_name: string;
    country: string;
    play_style: string;
  } | null;
}

export function IntelligenceHub() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'injury' | 'interview' | 'news'>('all');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  useEffect(() => {
    fetchInsights();
    
    // Subscribe to realtime database changes for live news streaming
    const channel = supabase
      .channel('live-insights')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tennis_insights' }, () => {
        fetchInsights();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tennis_insights')
        .select('*, player:players(id, first_name, last_name, country, play_style)')
        .order('published_at', { ascending: false });

      if (error) throw error;
      if (data) setInsights(data as Insight[]);
    } catch (e) {
      console.error('Error fetching insights:', e);
    } finally {
      setLoading(false);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    let injuries = 0;
    let interviews = 0;
    let generalNews = 0;

    insights.forEach(item => {
      if (item.sentiment === 'critical_injury' || item.sentiment === 'negative') injuries++;
      if (item.source_type === 'interview') interviews++;
      if (item.source_type === 'news') generalNews++;
    });

    return { injuries, interviews, generalNews, total: insights.length };
  }, [insights]);

  // Filters logic
  const filteredInsights = insights.filter(item => {
    // 1. Tab Filter
    if (selectedTab === 'injury' && item.sentiment !== 'critical_injury' && item.sentiment !== 'negative') {
      return false;
    }
    if (selectedTab === 'interview' && item.source_type !== 'interview') {
      return false;
    }
    if (selectedTab === 'news' && item.source_type !== 'news') {
      return false;
    }

    // 2. Search query (fuzzy player name match)
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const pName = item.player 
        ? `${item.player.first_name} ${item.player.last_name}`.toLowerCase()
        : '';
      const headline = item.headline.toLowerCase();
      const summary = item.summary.toLowerCase();
      
      return pName.includes(query) || headline.includes(query) || summary.includes(query);
    }

    return true;
  });

  const toggleCard = (id: string) => {
    setExpandedCardId(prev => prev === id ? null : id);
  };

  // Sentiment styling helper
  const getSentimentDetails = (sentiment: string) => {
    switch (sentiment) {
      case 'critical_injury':
        return {
          bg: 'bg-red-500/10 border-red-500/20 text-red-400',
          dot: 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]',
          label: 'Critical',
          icon: ShieldAlert,
          shadowClass: 'hover:shadow-[0_0_30px_rgba(239,68,68,0.15)]',
          borderAccent: 'border-l-4 border-l-red-500'
        };
      case 'negative':
        return {
          bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
          dot: 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]',
          label: 'Warning',
          icon: AlertTriangle,
          shadowClass: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.12)]',
          borderAccent: 'border-l-4 border-l-amber-500'
        };
      case 'positive':
        return {
          bg: 'bg-tennis-lime/10 border-tennis-lime/20 text-tennis-lime',
          dot: 'bg-tennis-lime shadow-[0_0_12px_rgba(200,250,50,0.6)]',
          label: 'Fitness',
          icon: TrendingUp,
          shadowClass: 'hover:shadow-[0_0_30px_rgba(200,250,50,0.12)]',
          borderAccent: 'border-l-4 border-l-tennis-lime'
        };
      default:
        return {
          bg: 'bg-white/[0.04] border-white/10 text-gray-400',
          dot: 'bg-gray-500',
          label: 'Briefing',
          icon: Newspaper,
          shadowClass: 'hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]',
          borderAccent: 'border-l-4 border-l-purple-500/20'
        };
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'twitter':
        return <Twitter size={13} className="text-blue-400" />;
      case 'interview':
        return <MessageSquare size={13} className="text-purple-400" />;
      default:
        return <Newspaper size={13} className="text-gray-400" />;
    }
  };

  // Format Date Helper
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
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full min-h-screen text-white flex flex-col gap-6 pb-20 relative px-1 md:px-0">
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[20%] w-[40vw] h-[40vw] bg-tennis-lime/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[10%] w-[35vw] h-[35vw] bg-purple-600/[0.03] rounded-full blur-[150px] pointer-events-none" />

      {/* HEADER HERO SECTION */}
      <div className="flex flex-col md:grid md:grid-cols-3 gap-4 md:gap-6 items-start text-left">
        <div className="md:col-span-2 flex flex-col gap-2">
          <div className="flex items-center flex-wrap gap-2">
            <span className="w-fit px-2.5 py-0.5 bg-tennis-lime/10 border border-tennis-lime/20 text-tennis-lime text-[9px] font-black uppercase tracking-[0.2em] rounded-full">
              Real-time Intelligence Feed
            </span>
            <span className="flex items-center gap-1 text-[8px] text-gray-500 font-bold uppercase tracking-wider bg-white/5 border border-white/5 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live Sync
            </span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-white leading-none">
            Intelligence <span className="text-transparent bg-clip-text bg-gradient-to-r from-tennis-lime to-emerald-400">Hub.</span>
          </h1>
          <p className="text-[11px] md:text-xs text-gray-400 max-w-xl font-medium leading-relaxed hidden md:block">
            Dynamic scouting dashboard filtering live player interviews, medical updates, and fitness reports. Spot injuries and tactical insights before they reflect in odds.
          </p>
        </div>

        {/* CRAWLER STATUS PANEL - Extremely compact on mobile */}
        <div className="w-full bg-[#1a1d26]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-3.5 md:p-4 flex md:flex-col justify-between items-center md:items-stretch shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-tennis-lime/5 rounded-full blur-[30px] pointer-events-none" />
          <div className="flex items-center gap-2 border-b border-white/5 md:pb-2 md:mb-2 border-none md:border-solid">
            <Cpu size={12} className="text-tennis-lime" />
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">AI Scout Engine</span>
          </div>
          <div className="flex md:flex-col items-center md:items-start justify-between gap-2 w-full md:w-auto">
            <div className="text-left flex items-baseline gap-1.5 md:block">
              <span className="text-lg md:text-xl font-black text-white">{stats.total}</span>
              <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Briefings (7d)</span>
            </div>
            <span className="text-[8px] font-mono text-tennis-lime bg-tennis-lime/10 px-1.5 py-0.5 rounded border border-tennis-lime/20 font-bold md:mt-2">
              ACTIVE
            </span>
          </div>
        </div>
      </div>

      {/* STATS COUNT GRID (REVOLUT STYLE) - Hidden on mobile to save vertical space */}
      <div className="hidden md:grid grid-cols-4 gap-3">
        <div className="bg-[#15171e]/60 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col justify-between text-left hover:border-white/10 transition-colors">
          <div className="flex items-center gap-2 text-gray-500 text-[9px] font-black uppercase tracking-wider">
            <ShieldAlert size={12} className="text-red-400" />
            <span>Injuries / Pain</span>
          </div>
          <div className="text-2xl font-black text-white mt-2">{stats.injuries}</div>
        </div>
        <div className="bg-[#15171e]/60 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col justify-between text-left hover:border-white/10 transition-colors">
          <div className="flex items-center gap-2 text-gray-500 text-[9px] font-black uppercase tracking-wider">
            <MessageSquare size={12} className="text-purple-400" />
            <span>Interviews</span>
          </div>
          <div className="text-2xl font-black text-white mt-2">{stats.interviews}</div>
        </div>
        <div className="bg-[#15171e]/60 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col justify-between text-left hover:border-white/10 transition-colors">
          <div className="flex items-center gap-2 text-gray-500 text-[9px] font-black uppercase tracking-wider">
            <Newspaper size={12} className="text-blue-400" />
            <span>News articles</span>
          </div>
          <div className="text-2xl font-black text-white mt-2">{stats.generalNews}</div>
        </div>
        <div className="bg-[#15171e]/60 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col justify-between text-left hover:border-white/10 transition-colors">
          <div className="flex items-center gap-2 text-gray-500 text-[9px] font-black uppercase tracking-wider">
            <Activity size={12} className="text-tennis-lime" />
            <span>Total Briefings</span>
          </div>
          <div className="text-2xl font-black text-white mt-2">{stats.total}</div>
        </div>
      </div>

      {/* FILTER & SEARCH PANEL (APPLE / REVOLUT STYLE) */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-[#15171e]/30 p-2.5 rounded-2xl border border-white/5 backdrop-blur-sm">
        
        {/* Spotlight-Style Search Bar */}
        <div className="relative w-full md:max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search players or keywords..."
            className="w-full pl-10 pr-10 py-2.5 bg-[#15171e] border border-white/5 focus:border-white/10 focus:ring-1 focus:ring-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none transition-all shadow-xl font-medium"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
            >
              Clear
            </button>
          ) : (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[8px] font-mono text-gray-600 bg-white/5 px-1 rounded border border-white/5 pointer-events-none hidden sm:inline">
              ⌘K
            </span>
          )}
        </div>

        {/* Sliding Pill Tab Picker - Swipable / scrollable on mobile */}
        <div className="flex bg-[#0A0A0A]/60 p-0.5 rounded-xl border border-white/5 w-full md:w-auto overflow-x-auto hide-scrollbar relative">
          {([
            { id: 'all', labelMobile: 'All', labelDesktop: 'All Briefings', count: stats.total },
            { id: 'injury', labelMobile: '🚨 Injuries', labelDesktop: '🚨 Injuries', count: stats.injuries },
            { id: 'interview', labelMobile: '🎤 Interviews', labelDesktop: '🎤 Interviews', count: stats.interviews },
            { id: 'news', labelMobile: '📰 News', labelDesktop: '📰 News', count: stats.generalNews }
          ] as const).map((tab) => {
            const isActive = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex-1 md:flex-initial min-w-max px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all duration-300 relative ${isActive ? 'text-black' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeIntelligenceTab" 
                    className="absolute inset-0 bg-white rounded-lg shadow-md z-0" 
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-1.5">
                  <span className="md:hidden">{tab.labelMobile}</span>
                  <span className="hidden md:inline">{tab.labelDesktop}</span>
                  <span className={`text-[8px] font-mono px-1 rounded ${isActive ? 'bg-black/10 text-black' : 'bg-white/5 text-gray-600'}`}>
                    {tab.count}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* FEED LAYOUT */}
      {loading ? (
        <div className="w-full py-24 flex flex-col items-center justify-center gap-4 bg-[#15171e]/20 border border-white/5 border-dashed rounded-3xl">
          <Loader2 className="w-8 h-8 text-tennis-lime animate-spin" />
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Querying Neural Scouting Database...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          <AnimatePresence mode="popLayout">
            {filteredInsights.length > 0 ? (
              filteredInsights.map((insight) => {
                const sStyle = getSentimentDetails(insight.sentiment);
                const isExpanded = expandedCardId === insight.id;

                return (
                  <motion.div
                    layout
                    key={insight.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    onClick={() => toggleCard(insight.id)}
                    className={`
                      w-full bg-[#1a1d26]/60 backdrop-blur-xl border border-white/5 hover:border-white/10 
                      rounded-2xl p-4 md:p-5 flex flex-col gap-3 shadow-xl transition-all duration-300 
                      relative overflow-hidden cursor-pointer ${sStyle.borderAccent} ${sStyle.shadowClass}
                    `}
                  >
                    {/* Glass sheen highlight on hover */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] via-transparent to-white/[0.03] pointer-events-none" />
                    
                    {/* Header Row */}
                    <div className="flex justify-between items-center relative z-10">
                      <div className="flex items-center gap-2 text-gray-400 text-[9px] md:text-[10px] font-bold uppercase tracking-wider">
                        <div className="p-1 rounded bg-white/[0.04] shrink-0">
                          {getSourceIcon(insight.source_type)}
                        </div>
                        <span className="opacity-80 truncate max-w-[80px] md:max-w-none">{insight.source_name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Time Ago on Header for mobile compact layout */}
                        <span className="text-[8px] font-mono text-gray-500 md:hidden">
                          {formatTimeAgo(insight.published_at)}
                        </span>
                        
                        <div className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${sStyle.bg}`}>
                          <span className={`w-1 h-1 rounded-full ${sStyle.dot}`} />
                          <span>{sStyle.label}</span>
                        </div>
                      </div>
                    </div>

                    {/* Associated Player & Headline */}
                    <div className="flex flex-col gap-1 text-left relative z-10">
                      {insight.player ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-1 py-0.2 rounded bg-white/5 border border-white/5 text-gray-500 font-mono text-[7px] font-bold uppercase">
                            {insight.player.country.substring(0, 2)}
                          </span>
                          <Link 
                            to={`/player/${insight.player.id}`}
                            className="text-[9px] font-black text-tennis-lime uppercase tracking-widest hover:underline flex items-center gap-0.5 group/p"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {insight.player.first_name} {insight.player.last_name}
                            <ArrowUpRight size={8} className="opacity-0 group-hover/p:opacity-100 transition-all" />
                          </Link>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-500">
                          <Sparkles size={8} className="text-purple-400" />
                          <span className="text-[8px] font-mono uppercase tracking-widest">Global Scouting Log</span>
                        </div>
                      )}
                      
                      <h3 className="text-xs md:text-sm font-bold tracking-tight text-white leading-snug">
                        {insight.headline}
                      </h3>
                    </div>

                    {/* Collapsed/Expanded Chevron & Tap Action Row - Visible on Mobile */}
                    <div className="flex items-center justify-between text-[8px] font-black text-gray-500 uppercase tracking-wider pt-1 border-t border-white/[0.03] md:hidden">
                      <span>{isExpanded ? 'Collapse report' : 'Tap to expand scouting report'}</span>
                      <motion.span 
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        className="text-gray-400"
                      >
                        ▼
                      </motion.span>
                    </div>

                    {/* Expandable summary and key takeaways */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden flex flex-col gap-3 pt-2"
                        >
                          <p className="text-[11px] text-gray-300 leading-relaxed text-left border-t border-white/5 pt-2">
                            {insight.summary}
                          </p>

                          {insight.key_takeaways && insight.key_takeaways.length > 0 && (
                            <div className="flex flex-col gap-1.5 text-left">
                              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Scouting Analysis</span>
                              <ul className="space-y-1.5">
                                {insight.key_takeaways.map((takeaway, idx) => (
                                  <li key={idx} className="flex gap-2 items-start text-[10px] text-gray-300 font-medium leading-relaxed">
                                    <div className="w-1 h-1 rounded-full bg-tennis-lime/40 mt-1.5 shrink-0" />
                                    <span>{takeaway}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Desktop Footer (always visible on desktop, hidden on mobile) */}
                    <div className="hidden md:flex justify-between items-center mt-auto pt-3 border-t border-white/5 relative z-10">
                      <div className="flex items-center gap-1.5 text-gray-600 text-[9px] font-mono font-bold">
                        <Calendar size={11} className="text-gray-600" />
                        <span>{formatTimeAgo(insight.published_at)}</span>
                      </div>
                      
                      {insight.url && (
                        <a 
                          href={insight.url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-tennis-lime/80 hover:text-tennis-lime transition-all group/link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Source Link <ArrowRight size={10} className="group-hover/link:translate-x-0.5 transition-transform" />
                        </a>
                      )}
                    </div>

                    {/* Mobile Footer (only visible on mobile when expanded) */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex md:hidden justify-between items-center mt-auto pt-2.5 border-t border-white/5 relative z-10"
                        >
                          <div className="flex items-center gap-1 text-gray-500 text-[8px] font-mono">
                            <Calendar size={9} />
                            <span>{formatTimeAgo(insight.published_at)}</span>
                          </div>
                          
                          {insight.url && (
                            <a 
                              href={insight.url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-tennis-lime/80 hover:text-tennis-lime transition-all"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Source <ArrowRight size={8} />
                            </a>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            ) : (
              <div className="col-span-full py-16 flex flex-col items-center justify-center gap-4 bg-[#15171e]/30 border border-white/5 rounded-3xl p-6 shadow-inner text-center">
                <div className="p-3 rounded-full bg-white/[0.02] border border-white/5 mb-1">
                  <Brain size={28} className="text-gray-500 animate-pulse" />
                </div>
                <h4 className="text-white text-xs font-black uppercase tracking-widest">No matching briefings</h4>
                <p className="text-[10px] text-gray-500 max-w-xs leading-relaxed">
                  We scanned our database but couldn't find any briefings matching your query. Try clearing search keywords or changing category.
                </p>
                <button
                  onClick={() => {
                    setSelectedTab('all');
                    setSearchQuery('');
                  }}
                  className="mt-2 px-5 py-2.5 bg-tennis-lime text-black text-[9px] font-black uppercase tracking-widest rounded-xl transition-all hover:scale-105 active:scale-95"
                >
                  Reset Dashboard
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
export default IntelligenceHub;
