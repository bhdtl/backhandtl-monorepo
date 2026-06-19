import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { 
  Brain, Search, Bell, ExternalLink, Calendar, MessageSquare, 
  Newspaper, Twitter, ArrowRight, ShieldAlert, Heart, TrendingUp, AlertTriangle, Loader2 
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

  // Sentiment styling helper
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
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#0A0A0A] text-white flex flex-col gap-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-2 md:gap-3 text-left">
        <span className="w-fit px-3 py-1 bg-tennis-lime/10 border border-tennis-lime/20 text-tennis-lime text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
          Scout Intelligence
        </span>
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white leading-none">
          Intelligence <span className="text-tennis-lime">Hub.</span>
        </h1>
        <p className="text-xs md:text-sm text-gray-400 max-w-xl font-medium leading-relaxed">
          Real-time AI briefings parsed from player interviews, medical alerts, and scout logs. Spot critical injury withdrawals and mental state changes before the odds drop.
        </p>
      </div>

      {/* CONTROLS (Spotlight Search + iOS Segmented Picker) */}
      <div className="flex flex-col gap-4">
        {/* Spotlight Search Bar */}
        <div className="relative w-full">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by player name or keyword..."
            className="w-full pl-12 pr-4 py-3.5 bg-[#15171e] border border-white/5 focus:border-white/10 rounded-2xl text-xs text-white placeholder-gray-500 focus:outline-none transition-all shadow-xl font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* iOS Segmented Selector */}
        <div className="grid grid-cols-4 gap-1 bg-black/40 p-0.5 rounded-2xl border border-white/5">
          {(['all', 'injury', 'interview', 'news'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`py-3 text-[9px] md:text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                selectedTab === tab
                  ? 'bg-[#15171e] text-tennis-lime shadow-md border border-white/5'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'all' ? 'All Intel' : tab === 'injury' ? '🚨 Injuries' : tab === 'interview' ? '🎤 Interviews' : '📰 News'}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CARDS GRID */}
      {loading ? (
        <div className="w-full py-20 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 text-tennis-lime animate-spin" />
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Compiling Intelligence...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredInsights.length > 0 ? (
              filteredInsights.map((insight) => {
                const sStyle = getSentimentDetails(insight.sentiment);
                const IconComp = sStyle.icon;

                return (
                  <motion.div
                    layout
                    key={insight.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="w-full bg-[#15171e] border border-white/5 hover:border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 transition-all group relative overflow-hidden"
                  >
                    {/* Header: Source type & badge */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-wider">
                        {getSourceIcon(insight.source_type)}
                        <span>{insight.source_name}</span>
                      </div>
                      
                      {/* Sentiment / Severity Badge */}
                      <div className={`px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ${sStyle.bg}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${sStyle.dot}`} />
                        <span>{sStyle.label}</span>
                      </div>
                    </div>

                    {/* Headline & Player Association */}
                    <div className="flex flex-col gap-1 text-left">
                      {insight.player ? (
                        <Link 
                          to={`/player/${insight.player.id}`}
                          className="w-fit text-[9px] font-mono text-tennis-lime uppercase tracking-widest hover:underline flex items-center gap-1 group/p"
                        >
                          {insight.player.first_name} {insight.player.last_name}
                          <ArrowRight size={10} className="opacity-0 group-hover/p:opacity-100 group-hover/p:translate-x-0.5 transition-all" />
                        </Link>
                      ) : (
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">General Tennis Intel</span>
                      )}
                      
                      <h3 className="text-sm font-bold uppercase tracking-tight text-white line-clamp-2">
                        {insight.headline}
                      </h3>
                    </div>

                    {/* Summary */}
                    <p className="text-xs text-gray-400 leading-relaxed text-left">
                      {insight.summary}
                    </p>

                    {/* Bullet Takeaways */}
                    {insight.key_takeaways && insight.key_takeaways.length > 0 && (
                      <div className="flex flex-col gap-2 pt-3 border-t border-white/5 text-left">
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-wider">Tactical Impact / Takeaways</span>
                        <ul className="space-y-1.5">
                          {insight.key_takeaways.map((takeaway, idx) => (
                            <li key={idx} className="flex gap-2 items-start text-[10px] text-gray-300 font-medium">
                              <span className="text-tennis-lime mt-1 font-mono text-[8px]">▶</span>
                              <span>{takeaway}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Footer: Date & Link Out */}
                    <div className="flex justify-between items-center mt-auto pt-3 border-t border-white/5">
                      <div className="flex items-center gap-1.5 text-gray-600 text-[9px] font-mono">
                        <Calendar size={10} />
                        <span>{formatTimeAgo(insight.published_at)}</span>
                      </div>
                      
                      {insight.url && (
                        <a 
                          href={insight.url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors group/link"
                        >
                          Source <ExternalLink size={10} className="text-gray-600 group-hover/link:text-white transition-colors" />
                        </a>
                      )}
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="col-span-full py-16 flex flex-col items-center justify-center gap-3 bg-[#15171e] border border-white/5 rounded-3xl p-8">
                <Brain size={32} className="text-gray-600" />
                <h4 className="text-white text-xs font-black uppercase tracking-widest">No briefings found</h4>
                <p className="text-[10px] text-gray-500 max-w-xs leading-relaxed">
                  We couldn't find any intelligence items matching your search or filters. Try checking another category.
                </p>
                <button
                  onClick={() => {
                    setSelectedTab('all');
                    setSearchQuery('');
                  }}
                  className="mt-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-colors border border-white/5"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
