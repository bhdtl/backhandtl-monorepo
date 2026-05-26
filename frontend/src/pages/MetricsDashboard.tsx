import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Activity, Users, Crown, Zap, Swords, TrendingUp, AlertTriangle, Lock, Database
} from 'lucide-react';
import { 
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend 
} from 'recharts';
import { LoadingScreen } from '../components/LoadingScreen'; 
import { useTranslation } from 'react-i18next';

// --- INTERFACES ---
interface KPICardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: any;
  color: string;
  description: string;
}

interface Profile {
  id: string;
  created_at: string;
  tier: string;
}

interface UserEvent {
  id: string;
  user_id: string;
  event_name: string;
  created_at: string;
}

// --- SOTA TOOLTIP COMPONENT ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0a0c10]/95 border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-xl min-w-[200px] z-50">
        <p className="text-white font-black mb-3 uppercase tracking-widest text-[10px] pb-2 border-b border-white/10">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-6 mb-1.5 text-xs">
            <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shadow-lg" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-400 uppercase font-bold tracking-wider">{entry.name}</span>
            </div>
            <span className="text-white font-mono font-black">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// --- KPI CARD COMPONENT ---
const KPICard = ({ title, value, subValue, icon: Icon, color, description }: KPICardProps) => (
  <div className="bg-[#1a1d26] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden group hover:border-white/10 transition-all min-w-[85vw] md:min-w-0 snap-center shrink-0">
    <div className={`absolute -right-6 -top-6 p-4 opacity-5 group-hover:opacity-10 transition-transform duration-700 group-hover:scale-110 ${color}`}>
      <Icon size={140} />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-xl bg-opacity-10 border border-current/20 ${color} bg-current`}>
          <Icon size={18} className={color.replace('text-', '')} strokeWidth={2.5} />
        </div>
        <span className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">{title}</span>
      </div>
      <div className="text-4xl font-black text-white mb-2 tracking-tighter">{value}</div>
      {subValue && <div className={`text-xs font-black uppercase tracking-widest ${color}`}>{subValue}</div>}
      <div className="mt-5 text-[10px] text-gray-500 border-t border-white/5 pt-4 font-medium leading-relaxed">
        {description}
      </div>
    </div>
  </div>
);

// --- MAIN DASHBOARD COMPONENT ---
export function MetricsDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchRawTelemetry();
  }, [user]);

  const fetchRawTelemetry = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const thirtyDaysAgoMs = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgoISO = new Date(thirtyDaysAgoMs).toISOString();
      
      // 1. Fetch Profiles (Standard, since it's far below 1000 limits)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, created_at, tier');
        
      if (profilesError) throw profilesError;

      // 2. VETERAN FIX: The Auto-Pagination Engine
      // Bypasses Supabase 1000-row limit by fetching chunks recursively
      let allEvents: UserEvent[] = [];
      let fetchMore = true;
      let step = 0;
      const stepSize = 1000;

      while (fetchMore) {
        const { data: eventsChunk, error: eventsError } = await supabase
          .from('user_events')
          .select('id, user_id, event_name, created_at')
          .gte('created_at', thirtyDaysAgoISO)
          .order('created_at', { ascending: false }) // Critical: Always pull latest first
          .range(step * stepSize, (step + 1) * stepSize - 1);

        if (eventsError) throw eventsError;

        if (eventsChunk && eventsChunk.length > 0) {
          allEvents = [...allEvents, ...eventsChunk];
          step++;
          // If we got exactly 1000, there's likely more. If less, we hit the end.
          if (eventsChunk.length < stepSize) {
            fetchMore = false;
          }
        } else {
          fetchMore = false;
        }
        
        // Circuit Breaker (Max 50.000 Events / 50 Iterations) to prevent infinite loops
        if (step > 50) fetchMore = false; 
      }

      setProfiles(profilesData || []);
      setEvents(allEvents);
    } catch (err: any) {
      console.error("Telemetry Sync Failed:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // SV SOTA: O(N) Matrix Aggregation
  const analytics = useMemo(() => {
    if (!profiles.length && !events.length) return null;

    // --- 1. CORE ASSET KPIs ---
    const totalUsers = profiles.length;
    const premiumUsers = profiles.filter(p => p.tier === 'premium' || p.tier === 'pro' || p.tier === 'elite').length;
    const conversionRate = totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(1) : '0';

    // --- 2. TIME SERIES MATRIX (Last 30 Days) ---
    const now = new Date();
    const daysMap = new Map();
    
    // Pure UTC millisecond math & .substring(0, 10)
    for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().substring(0, 10); 
        daysMap.set(dateStr, { 
            dateStr, 
            displayDate: dateStr.slice(5).replace('-', '/'), 
            dauSet: new Set(), 
            newUsers: 0, 
            matchups: 0, 
            profileViews: 0, 
            searches: 0,
            tourToggles: 0,
            valueScannerIntents: 0,
            courtDbIntents: 0,
            paywallHits: 0
        });
    }

    const startDateStr = Array.from(daysMap.keys())[0]; 
    let currentTotalUsers = 0;

    // Populate Users Growth 
    profiles.forEach(p => {
        const pDateStr = String(p.created_at).substring(0, 10);
        if (pDateStr < startDateStr) {
            currentTotalUsers++; 
        } else if (daysMap.has(pDateStr)) {
            daysMap.get(pDateStr).newUsers += 1;
        }
    });

    // Populate Events & Feature Adoptions
    let totalMatchupRuns = 0;
    let totalPaywallHits = 0;
    const matchupUsersSet = new Set();

    events.forEach(e => {
        // Safe substring extraction
        const dateStr = String(e.created_at).substring(0, 10);
        
        // Track global metrics
        if (e.event_name === 'matchup_analysis_start') {
            totalMatchupRuns++;
            if (e.user_id) matchupUsersSet.add(e.user_id);
        }
        
        // Aggregate all paywall hits globally
        if (e.event_name.includes('paywall')) {
            totalPaywallHits++;
        }

        // Track daily temporal data
        if (daysMap.has(dateStr)) {
            const dayData = daysMap.get(dateStr);
            if (e.user_id) dayData.dauSet.add(e.user_id); 
            
            // Matchup & Core
            if (e.event_name === 'matchup_analysis_start') dayData.matchups += 1;
            else if (e.event_name === 'player_card_open') dayData.profileViews += 1;
            else if (e.event_name === 'global_search') dayData.searches += 1;
            else if (e.event_name === 'tour_toggle') dayData.tourToggles += 1;
            
            // Value Scanner Engagement
            else if (e.event_name === 'value_scanner_view' || e.event_name === 'value_scanner_match_open' || e.event_name === 'value_scanner_sort_change') {
                dayData.valueScannerIntents += 1;
            }
            
            // Court DB Engagement
            else if (e.event_name === 'court_database_view' || e.event_name === 'court_search' || e.event_name === 'court_profile_view') {
                dayData.courtDbIntents += 1;
            }
            
            // Paywall Leaks (Daily)
            else if (e.event_name.includes('paywall')) {
                dayData.paywallHits += 1;
            }
        }
    });

    // Generate Final Recharts Array
    const timeSeriesData = Array.from(daysMap.values()).map(d => {
        currentTotalUsers += d.newUsers; 
        return {
            date: d.displayDate,
            TotalUsers: currentTotalUsers,
            DAU: d.dauSet.size,
            Matchups: d.matchups,
            ProfileViews: d.profileViews,
            Searches: d.searches, 
            TourToggles: d.tourToggles,
            ValueScanner: d.valueScannerIntents,
            CourtDB: d.courtDbIntents,
            PaywallLeaks: d.paywallHits
        };
    });

    const matchupAdoptionRate = totalUsers > 0 ? ((matchupUsersSet.size / totalUsers) * 100).toFixed(1) : '0';
    const lastDayDAU = timeSeriesData[timeSeriesData.length - 1]?.DAU || 0;

    return {
        totalUsers,
        premiumUsers,
        conversionRate,
        matchupAdoptionRate,
        totalMatchupRuns,
        uniqueMatchupUsers: matchupUsersSet.size,
        totalPaywallHits,
        timeSeriesData,
        currentDAU: lastDayDAU
    };
  }, [profiles, events]);

  if (loading) {
      return (
          <div className="h-[60vh] flex flex-col items-center justify-center w-full bg-[#15171e] rounded-[3rem] border border-white/5 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
              <Activity size={48} className="text-tennis-lime animate-pulse mb-6"/>
              <div className="text-white font-black tracking-[0.3em] uppercase text-xs">Aggregating Live Telemetry...</div>
              <div className="text-gray-600 font-mono text-[10px] mt-2">Processing Data Vectors</div>
          </div>
      );
  }

  if (error) {
      return (
          <div className="h-[60vh] flex flex-col items-center justify-center w-full bg-[#15171e] rounded-[3rem] border border-red-500/20 shadow-2xl">
              <AlertTriangle size={48} className="text-red-500 mb-6"/>
              <div className="text-white font-black tracking-widest uppercase text-sm mb-2">Telemetry Failure</div>
              <div className="text-gray-500 font-mono text-xs">{error}</div>
          </div>
      );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      
      {/* 1. KPI CARDS LAYER - SOTA SNAP SCROLL */}
      <div className="flex overflow-x-auto pb-4 gap-4 snap-x snap-mandatory no-scrollbar md:grid md:grid-cols-2 lg:grid-cols-5 md:overflow-visible md:pb-0">
        
        <KPICard 
          title={t('metrics.cards.users.title', 'Total Registry')} 
          value={analytics.totalUsers} 
          subValue={`${analytics.premiumUsers} Premium Assets`}
          icon={Users} 
          color="text-blue-500" 
          description="Cumulative user base across all temporal data points."
        />

        <KPICard 
          title={t('metrics.cards.conversion.title', 'Premium Conversion')} 
          value={`${analytics.conversionRate}%`} 
          subValue="Free to Paid Ratio"
          icon={Crown} 
          color="text-yellow-500" 
          description="Percentage of active registry converted to premium tier billing."
        />

        <KPICard 
          title={t('metrics.cards.dau.title', 'Daily Active (DAU)')} 
          value={analytics.currentDAU} 
          subValue="Last 24 Hours Unique"
          icon={Activity} 
          color="text-tennis-lime" 
          description="Core stickiness metric. High DAU indicates product necessity."
        />

        <KPICard 
          title={t('metrics.cards.matchup.title', 'Matchup Analyzer')} 
          value={`${analytics.totalMatchupRuns} Runs`} 
          subValue={`By ${analytics.uniqueMatchupUsers} Unique User(s)`}
          icon={Swords} 
          color="text-pink-500" 
          description={`Adoption rate is ${analytics.matchupAdoptionRate}%. Indicates high retention but poor discovery.`}
        />

        <KPICard 
          title="Paywall Leaks" 
          value={analytics.totalPaywallHits} 
          subValue="High Intent, Unconverted"
          icon={Lock} 
          color="text-red-500" 
          description="Free users trying to access Premium features (Value Scanner, Court DB). Massive Upsell Potential."
        />

      </div>

      {/* 2. CHARTS LAYER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        
        {/* CHART A: GROWTH ENGINE (DAU vs TOTAL) */}
        <div className="bg-[#15171e] border border-white/5 rounded-[2rem] p-6 md:p-8 shadow-2xl flex flex-col">
          <div className="flex justify-between items-start mb-8 shrink-0">
            <div>
              <h3 className="text-xl font-black text-white uppercase italic tracking-tighter outline-text mb-1">Growth Engine Matrix</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Total Users vs Daily Active Users (30 Days)</p>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10"><TrendingUp size={20} className="text-tennis-lime" /></div>
          </div>
          
          <div className="h-72 md:h-80 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={analytics.timeSeriesData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2e3d" vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={10} fontFamily="monospace" tickLine={false} axisLine={false} dy={10} />
                <YAxis yAxisId="left" stroke="#6b7280" fontSize={10} fontFamily="monospace" tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#84cc16" fontSize={10} fontFamily="monospace" tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', paddingTop: '20px' }} iconType="circle"/>
                
                <Area yAxisId="left" type="monotone" dataKey="TotalUsers" name="Total Registry" fill="url(#colorUsers)" stroke="#3b82f6" strokeWidth={3} />
                <Line yAxisId="right" type="monotone" dataKey="DAU" name="Active (DAU)" stroke="#84cc16" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#84cc16', stroke: '#000', strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART B: FEATURE ENGAGEMENT DISTRIBUTION */}
        <div className="bg-[#15171e] border border-white/5 rounded-[2rem] p-6 md:p-8 shadow-2xl flex flex-col">
          <div className="flex justify-between items-start mb-8 shrink-0">
            <div>
              <h3 className="text-xl font-black text-white uppercase italic tracking-tighter outline-text mb-1">Feature Telemetry</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Daily Actions & Paywall Hits (30 Days)</p>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10"><Database size={20} className="text-purple-500" /></div>
          </div>
          
          <div className="h-72 md:h-80 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={analytics.timeSeriesData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2e3d" vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={10} fontFamily="monospace" tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#6b7280" fontSize={10} fontFamily="monospace" tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', paddingTop: '20px' }} iconType="circle"/>
                
                {/* Product Features Stacked */}
                <Bar dataKey="ProfileViews" name="Profile Views" stackId="a" fill="#3b82f6" maxBarSize={40} />
                <Bar dataKey="Searches" name="Searches" stackId="a" fill="#a855f7" maxBarSize={40} />
                <Bar dataKey="CourtDB" name="Court DB Usage" stackId="a" fill="#f59e0b" maxBarSize={40} />
                <Bar dataKey="ValueScanner" name="Value Scanner" stackId="a" fill="#10b981" maxBarSize={40} />
                <Bar dataKey="Matchups" name="Matchup Runs" stackId="a" fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={40} />
                
                {/* The Leak Metric mapped as a harsh red line over the usage */}
                <Line type="monotone" dataKey="PaywallLeaks" name="Paywall Hits (Lost Conv.)" stroke="#ef4444" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}