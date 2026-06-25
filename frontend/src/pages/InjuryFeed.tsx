import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  AlertTriangle, Shield, ExternalLink, Clock, 
  Filter, TrendingUp, AlertCircle, CheckCircle2,
  Brain, MessageCircle, RefreshCw
} from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';

interface InjuryIntel {
  id: string;
  tweet_id: string;
  tweet_text: string;
  tweet_author: string;
  tweet_url: string;
  tweet_date: string;
  likes: number;
  retweets: number;
  is_tennis_related: boolean;
  is_injury_news: boolean;
  credibility: number;
  player_name: string | null;
  injury_type: string | null;
  severity: string;
  summary_kurz: string;
  is_mto: boolean;
  reasoning: string;
  source: string;
  created_at: string;
}

type FilterType = 'all' | 'verified' | 'mto' | 'injury' | 'recovery';

const severityConfig: Record<string, { color: string; bg: string; label: string }> = {
  minor: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', label: 'Minor' },
  moderate: { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', label: 'Moderate' },
  severe: { color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20', label: 'Severe' },
  unknown: { color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20', label: 'Unknown' },
};

const injuryTypeConfig: Record<string, { icon: string; label: string; color: string }> = {
  withdrawal: { icon: '🚪', label: 'Withdrawal', color: 'text-red-400' },
  injury: { icon: '🏥', label: 'Injury', color: 'text-orange-400' },
  medical: { icon: '🩺', label: 'Medical', color: 'text-blue-400' },
  recovery: { icon: '💪', label: 'Recovery', color: 'text-green-400' },
  rumor: { icon: '❓', label: 'Rumor', color: 'text-yellow-400' },
};

function CredibilityBadge({ credibility }: { credibility: number }) {
  if (credibility >= 80) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-green-500/10 text-green-400 border border-green-500/20">
        <CheckCircle2 size={10} /> Verified
      </span>
    );
  }
  if (credibility >= 50) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20">
        <Shield size={10} /> Reliable
      </span>
    );
  }
  if (credibility >= 20) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
        <AlertCircle size={10} /> Unconfirmed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20">
      <AlertTriangle size={10} /> Low Credibility
    </span>
  );
}

function InjuryCard({ item }: { item: InjuryIntel }) {
  const severity = severityConfig[item.severity] || severityConfig.unknown;
  const injuryType = item.injury_type ? injuryTypeConfig[item.injury_type] : null;
  const timeAgo = getTimeAgo(item.tweet_date || item.created_at);

  return (
    <div className="bg-[#15171e]/70 backdrop-blur-md rounded-3xl border border-white/5 p-5 md:p-6 hover:border-white/10 hover:shadow-2xl transition-all duration-300 group">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <CredibilityBadge credibility={item.credibility} />
          {item.is_mto && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <TrendingUp size={10} /> MTO
            </span>
          )}
          {injuryType && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/10 ${injuryType.color}`}>
              {injuryType.icon} {injuryType.label}
            </span>
          )}
          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${severity.bg} ${severity.color}`}>
            {severity.label}
          </span>
        </div>
        <div className="flex items-center gap-1 text-gray-600 shrink-0">
          <Clock size={10} />
          <span className="text-[9px] font-mono">{timeAgo}</span>
        </div>
      </div>

      {/* Player Name */}
      {item.player_name && (
        <div className="mb-2">
          <span className="text-tennis-lime font-black text-sm uppercase tracking-wide">
            {item.player_name}
          </span>
        </div>
      )}

      {/* Summary */}
      <p className="text-gray-300 text-sm font-semibold leading-relaxed mb-3">
        {item.summary_kurz || item.tweet_text}
      </p>

      {/* Reasoning */}
      {item.reasoning && (
        <div className="bg-black/30 rounded-xl p-3 mb-3 border border-white/5">
          <div className="flex items-center gap-1.5 mb-1">
            <Brain size={10} className="text-purple-400" />
            <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">AI Analysis</span>
          </div>
          <p className="text-gray-500 text-xs leading-relaxed">{item.reasoning}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-gray-600 font-mono">@{item.tweet_author}</span>
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-[9px] font-mono">❤️ {item.likes}</span>
            <span className="text-[9px] font-mono">🔁 {item.retweets}</span>
          </div>
        </div>
        <a 
          href={item.tweet_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[9px] text-gray-500 hover:text-tennis-lime transition-colors font-bold uppercase tracking-widest"
        >
          <ExternalLink size={10} /> Source
        </a>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD < 7) return `${diffD}d ago`;
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}

export function InjuryFeed() {
  const [items, setItems] = useState<InjuryIntel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInjuryData();
  }, []);

  const loadInjuryData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('player_injury_intel')
        .select('*')
        .eq('is_tennis_related', true)
        .order('tweet_date', { ascending: false })
        .limit(100);

      if (fetchError) {
        console.warn('Injury intel fetch error:', fetchError);
        setError('Injury Intel Tabelle existiert noch nicht. Führe den Injury Bot aus.');
        setItems([]);
      } else {
        setItems(data || []);
      }
    } catch (e) {
      console.error('Load error:', e);
      setError('Failed to load injury data');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    switch (activeFilter) {
      case 'verified': return item.credibility >= 70;
      case 'mto': return item.is_mto;
      case 'injury': return item.is_injury_news && item.injury_type !== 'recovery';
      case 'recovery': return item.injury_type === 'recovery';
      default: return true;
    }
  });

  const filters: { id: FilterType; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: items.length },
    { id: 'verified', label: 'Verified', count: items.filter(i => i.credibility >= 70).length },
    { id: 'injury', label: 'Injuries', count: items.filter(i => i.is_injury_news && i.injury_type !== 'recovery').length },
    { id: 'mto', label: 'MTO', count: items.filter(i => i.is_mto).length },
    { id: 'recovery', label: 'Recovery', count: items.filter(i => i.injury_type === 'recovery').length },
  ];

  if (loading) {
    return <LoadingScreen message="Loading Injury Intel..." />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10 pb-32">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase italic">
              Injury Intel
            </h1>
            <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">
              AI-powered tennis injury intelligence from Twitter
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 mb-8 pb-1">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap active:scale-95 duration-200 flex items-center gap-2 ${
              activeFilter === f.id
                ? 'bg-white text-black border-white shadow-xl'
                : 'bg-white/5 text-gray-500 border-white/5 hover:text-white'
            }`}
          >
            {f.label}
            <span className={`text-[8px] px-1.5 py-0.5 rounded ${activeFilter === f.id ? 'bg-black/10' : 'bg-white/10'}`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 mb-8 text-center">
          <AlertCircle size={24} className="text-yellow-500 mx-auto mb-3" />
          <p className="text-yellow-400 text-sm font-bold">{error}</p>
          <p className="text-gray-500 text-xs mt-2 font-mono">
            Führe aus: python scraper/injury_scraper.py --once
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="bg-[#15171e]/50 border border-white/5 p-4 rounded-2xl">
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Total Intel</span>
          <span className="text-white font-black text-xl">{items.length}</span>
        </div>
        <div className="bg-[#15171e]/50 border border-white/5 p-4 rounded-2xl">
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Verified</span>
          <span className="text-green-400 font-black text-xl">{items.filter(i => i.credibility >= 70).length}</span>
        </div>
        <div className="bg-[#15171e]/50 border border-white/5 p-4 rounded-2xl">
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">MTO Alerts</span>
          <span className="text-purple-400 font-black text-xl">{items.filter(i => i.is_mto).length}</span>
        </div>
        <div className="bg-[#15171e]/50 border border-white/5 p-4 rounded-2xl">
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Recoveries</span>
          <span className="text-tennis-lime font-black text-xl">{items.filter(i => i.injury_type === 'recovery').length}</span>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <Brain size={48} className="text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 font-bold text-lg">No injury intel found</p>
            <p className="text-gray-600 text-sm mt-2">
              {items.length === 0 
                ? "The Injury Bot hasn't run yet. Start it with: python scraper/injury_scraper.py --once"
                : "No items match this filter."
              }
            </p>
          </div>
        ) : (
          filteredItems.map(item => (
            <InjuryCard key={item.id} item={item} />
          ))
        )}
      </div>

      {/* Refresh Button */}
      <div className="mt-8 text-center">
        <button
          onClick={loadInjuryData}
          className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 flex items-center gap-2 mx-auto"
        >
          <RefreshCw size={14} /> Refresh Feed
        </button>
      </div>
    </div>
  );
}