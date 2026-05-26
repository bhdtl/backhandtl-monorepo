import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, Gauge, Loader2, TrendingUp, Zap } from 'lucide-react';

// --- HELPER: CUSTOM RADAR CHART (Zero Dependencies) ---
const RadarChart = ({ p1, p2, stats1, stats2 }: { p1: string, p2: string, stats1: any, stats2: any }) => {
    const metrics = ['Serve', 'Power', 'Speed', 'Mental', 'Stamina', 'IQ'];
    const radius = 80;
    const center = 100;
    
    // Fallback auf 50, falls keine Skills in DB
    const getVal = (obj: any, key: string) => obj?.[key] || 50;

    const d1 = [
        getVal(stats1, 'serve'), getVal(stats1, 'power'), getVal(stats1, 'speed'), 
        getVal(stats1, 'mental'), getVal(stats1, 'stamina'), getVal(stats1, 'overall_rating')
    ];
    const d2 = [
        getVal(stats2, 'serve'), getVal(stats2, 'power'), getVal(stats2, 'speed'), 
        getVal(stats2, 'mental'), getVal(stats2, 'stamina'), getVal(stats2, 'overall_rating')
    ];

    const getCoords = (value: number, index: number) => {
        const angle = (Math.PI * 2 * index) / metrics.length - Math.PI / 2;
        const r = (value / 100) * radius;
        return [center + r * Math.cos(angle), center + r * Math.sin(angle)];
    };

    const poly1 = d1.map((v, i) => getCoords(v, i).join(',')).join(' ');
    const poly2 = d2.map((v, i) => getCoords(v, i).join(',')).join(' ');

    return (
        <div className="flex flex-col items-center my-8 select-none">
            <div className="relative w-[280px] h-[220px]">
                <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible drop-shadow-xl">
                    {/* Grid Levels */}
                    {[20, 40, 60, 80, 100].map((level, i) => (
                        <circle key={i} cx={center} cy={center} r={(level/100)*radius} fill="#15171e" fillOpacity="0.5" stroke="rgba(255,255,255,0.05)" />
                    ))}
                    {/* Axis Lines */}
                    {metrics.map((m, i) => {
                        const [x, y] = getCoords(110, i);
                        const [ix, iy] = getCoords(100, i);
                        return (
                            <g key={i}>
                                <line x1={center} y1={center} x2={ix} y2={iy} stroke="rgba(255,255,255,0.1)" />
                                <text x={x} y={y} dx={x > center ? 0 : 0} dy={y > center ? 5 : 0} textAnchor="middle" fill="#666" fontSize="7" fontWeight="900" className="uppercase tracking-widest">{m}</text>
                            </g>
                        );
                    })}
                    {/* P1 Polygon (Blue) */}
                    <polygon points={poly1} fill="rgba(59, 130, 246, 0.4)" stroke="#3b82f6" strokeWidth="2" />
                    {/* P2 Polygon (Lime) */}
                    <polygon points={poly2} fill="rgba(204, 255, 0, 0.4)" stroke="#ccff00" strokeWidth="2" />
                </svg>
            </div>
            
            {/* Legend */}
            <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest mt-2">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span> {p1}
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-tennis-lime shadow-[0_0_8px_rgba(204,255,0,0.6)]"></span> {p2}
                </div>
            </div>
        </div>
    );
};

// --- WIDGET 1: MATCHUP CARD (SMART) ---
const MatchupWidget = ({ p1Name, p2Name }: { p1Name: string; p2Name: string }) => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const { data: players } = await supabase.from('players')
                    .select('id, first_name, last_name, play_style, country, profile_image_url')
                    .or(`last_name.ilike.${p1Name},last_name.ilike.${p2Name}`);
                
                if (players && players.length >= 2) {
                    const p1 = players.find(p => p.last_name.toLowerCase() === p1Name.toLowerCase()) || players[0];
                    const p2 = players.find(p => p.last_name.toLowerCase() === p2Name.toLowerCase()) || players[1];

                    const { data: skills } = await supabase.from('player_skills').select('*').in('player_id', [p1.id, p2.id]);
                    
                    const s1 = skills?.find(s => s.player_id === p1.id) || {};
                    const s2 = skills?.find(s => s.player_id === p2.id) || {};
                    
                    setStats({ p1, p2, s1, s2 });
                }
            } catch(e) { console.error(e); }
            setLoading(false);
        }
        load();
    }, [p1Name, p2Name]);

    if (loading) return <div className="p-8 border border-white/10 rounded-3xl bg-[#1a1d26] flex justify-center my-8"><Loader2 className="animate-spin text-tennis-lime"/></div>;
    if (!stats) return null; 

    return (
        <div className="my-12 relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-tennis-lime/20 rounded-[2rem] blur opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative bg-[#15171e] border border-white/10 rounded-[1.8rem] p-1 overflow-hidden shadow-2xl">
                <div className="bg-[#1a1d26] rounded-[1.5rem] p-6 relative overflow-hidden">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4 relative z-10">
                        <div className="flex items-center gap-2 text-white">
                            <div className="bg-white/10 p-1.5 rounded-lg"><Activity size={14} /></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Neural Matchup</span>
                        </div>
                        <div className="text-[10px] font-mono text-gray-500 flex items-center gap-1"><Zap size={10} className="text-yellow-400 fill-yellow-400"/> LIVE INTEL</div>
                    </div>

                    {/* Players Header */}
                    <div className="flex justify-between items-start px-2 relative z-10">
                        <div className="flex flex-col items-start w-[40%]">
                            <div className="text-2xl md:text-3xl font-black text-white uppercase italic leading-none">{stats.p1.last_name}</div>
                            <div className="text-xs text-gray-500 font-bold mb-2">{stats.p1.first_name}</div>
                            <div className="text-[9px] font-black text-blue-400 uppercase tracking-wider bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded">
                                {stats.p1.play_style || 'Balanced'}
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-center justify-center w-[20%] pt-2">
                             <div className="text-gray-700 font-black italic text-xl">VS</div>
                        </div>

                        <div className="flex flex-col items-end text-right w-[40%]">
                            <div className="text-2xl md:text-3xl font-black text-white uppercase italic leading-none">{stats.p2.last_name}</div>
                            <div className="text-xs text-gray-500 font-bold mb-2">{stats.p2.first_name}</div>
                            <div className="text-[9px] font-black text-tennis-lime uppercase tracking-wider bg-tennis-lime/10 border border-tennis-lime/20 px-2 py-1 rounded">
                                {stats.p2.play_style || 'Balanced'}
                            </div>
                        </div>
                    </div>

                    {/* The Radar Chart */}
                    <RadarChart p1={stats.p1.last_name} p2={stats.p2.last_name} stats1={stats.s1} stats2={stats.s2} />
                    
                    {/* Background Noise */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none mix-blend-overlay" style={{backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 0%, transparent 50%)'}}></div>
                </div>
            </div>
        </div>
    );
};

// --- WIDGET 2: BSI CARD (SMART COLORS) ---
const BSIWidget = ({ tournament, value, surface }: { tournament: string; value: string, surface?: string }) => {
    const val = parseFloat(value);
    const percentage = (val / 10) * 100;
    
    // SMART COLOR LOGIC
    let colorClass = 'text-blue-400';
    let bgClass = 'bg-blue-500/10 border-blue-500/20';
    let strokeClass = '#60a5fa'; // Blue
    let label = 'Hard Court';

    const s = (surface || '').toLowerCase();
    const t = tournament.toLowerCase();

    if (s.includes('clay') || t.includes('clay') || t.includes('garros') || t.includes('rome') || t.includes('monte') || t.includes('madrid')) {
        colorClass = 'text-orange-500';
        bgClass = 'bg-orange-500/10 border-orange-500/20';
        strokeClass = '#f97316';
        label = 'Clay Court (Slow)';
    } else if (s.includes('grass') || t.includes('grass') || t.includes('wimbledon') || t.includes('halle') || t.includes('queens')) {
        colorClass = 'text-tennis-lime';
        bgClass = 'bg-tennis-lime/10 border-tennis-lime/20';
        strokeClass = '#ccff00';
        label = 'Grass Court (Fast)';
    } else if (val > 8.0) {
        colorClass = 'text-cyan-400';
        bgClass = 'bg-cyan-500/10 border-cyan-500/20';
        strokeClass = '#22d3ee';
        label = 'Indoor / Fast Hard';
    }

    return (
        <div className="my-10 p-1 bg-[#15171e] rounded-3xl border border-white/10 shadow-xl max-w-md mx-auto">
            <div className="bg-[#111318] p-5 rounded-[1.3rem] flex items-center gap-6 relative overflow-hidden">
                {/* Glow Effect */}
                <div className={`absolute -right-4 -top-4 w-24 h-24 ${bgClass} rounded-full blur-[40px] opacity-40`}></div>

                <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="#2a2d36" strokeWidth="4" fill="none" />
                        <circle cx="32" cy="32" r="28" stroke={strokeClass} strokeWidth="4" fill="none" 
                            strokeDasharray="175" strokeDashoffset={175 - (175 * percentage) / 100}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <span className={`absolute text-xl font-black ${colorClass}`}>{val}</span>
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${bgClass} ${colorClass}`}>
                            BSI Rating
                        </div>
                    </div>
                    <div className="text-white font-black text-lg leading-tight mb-0.5">{tournament}</div>
                    <div className="text-xs text-gray-500 font-medium flex items-center gap-1">
                        <TrendingUp size={12} /> {label}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- WIDGET 3: IMAGE RENDERER ---
const ImageWidget = ({ src, alt }: { src: string, alt: string }) => (
    <div className="my-10 rounded-3xl overflow-hidden border border-white/10 shadow-2xl group bg-[#111318]">
        <div className="relative aspect-[16/9]">
            <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f1115] via-transparent to-transparent opacity-80"></div>
            <div className="absolute bottom-4 left-5 right-5">
                <span className="inline-block text-[9px] font-mono text-white/70 bg-black/60 px-2 py-1 rounded backdrop-blur-md border border-white/5">
                    FIGURE 1: {alt}
                </span>
            </div>
        </div>
    </div>
);

// --- HELPER: MARKDOWN PARSER (BOLD TEXT) ---
const parseMarkdown = (text: string) => {
    // Split by bold syntax: **bold**
    // Captures the delimiters to rebuild, or use regex to isolate content
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="text-white font-black">{part.slice(2, -2)}</strong>;
        }
        return part;
    });
};

// --- MAIN RENDERER LOGIC ---
export function SmartArticleRenderer({ content }: { content: string }) {
  if (!content) return null;

  // Split content by our custom widgets or standard markdown images
  const parts = content.split(/(\{\{.*?\}\}|!\[.*?\]\(.*?\))/);

  return (
    <div className="prose prose-invert prose-lg max-w-none">
      {parts.map((part, idx) => {
        // 1. MATCHUP WIDGET
        if (part.startsWith('{{match:')) {
            const clean = part.replace(/[{}]/g, '');
            const [_, p1, p2] = clean.split(':');
            return <MatchupWidget key={idx} p1Name={p1} p2Name={p2} />;
        }
        
        // 2. BSI WIDGET
        if (part.startsWith('{{bsi:')) {
            const clean = part.replace(/[{}]/g, '');
            const segments = clean.split(':');
            const tour = segments[1];
            const val = segments[2];
            const surface = segments[3] || ''; 
            return <BSIWidget key={idx} tournament={tour} value={val} surface={surface} />;
        }

        // 3. IMAGE WIDGET
        if (part.startsWith('![') && part.includes('](')) {
            const match = part.match(/!\[(.*?)\]\((.*?)\)/);
            if (match) {
                return <ImageWidget key={idx} alt={match[1]} src={match[2]} />;
            }
        }
        
        // 4. STANDARD TEXT (Parsed for Bold)
        if (part.trim() === '') return null;
        
        return (
            <div key={idx} className="text-gray-300 leading-relaxed mb-6 font-sans text-[16px] md:text-[18px] whitespace-pre-wrap">
                {parseMarkdown(part)}
            </div>
        );
      })}
    </div>
  );
}