import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Award, Target, Brain, Calendar, ShieldAlert, AlertTriangle, 
  TrendingUp, Newspaper, Twitter, MessageSquare, ExternalLink, ArrowLeft 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeUpVariant } from './animationVariants';

interface PlayerIntelligenceWidgetProps {
  insights?: any[];
  strengths?: string;
  weaknesses?: string;
  mentalGameNotes?: string;
  lastUpdated?: string;
  onlyScouting?: boolean;
  onlyNews?: boolean;
}

export const PlayerIntelligenceWidget: React.FC<PlayerIntelligenceWidgetProps> = ({
  insights = [],
  strengths = 'Elite baseline play, powerful first serve, and quick lateral court speed.',
  weaknesses = 'Vulnerable under pressure on second serve return; occasional unforced errors on high-bounce forehands.',
  mentalGameNotes = 'Maintains high concentration levels. Demonstrates solid resilience in tiebreaks but occasionally lacks composure when facing early breaks.',
  lastUpdated,
  onlyScouting = false,
  onlyNews = false,
}) => {
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

  const parseBulletPoints = (text: string) => {
    if (!text) return [];
    return text
      .split(/[•;\n]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  };

  const strengthList = parseBulletPoints(strengths);
  const weaknessList = parseBulletPoints(weaknesses);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={fadeUpVariant}
      className="space-y-8"
    >
      {/* AI Intelligence Briefings accordion list */}
      {!onlyScouting && (
        <div className="bg-[#1a1d26]/80 backdrop-blur-md rounded-3xl p-6 border border-white/5 shadow-xl relative overflow-hidden text-left mb-8">
        <div className="absolute top-0 right-0 w-32 h-32 bg-tennis-lime/5 opacity-10 rounded-full blur-[40px] pointer-events-none" />
        
        <div className="flex items-center justify-between gap-4 mb-4 border-b border-white/5 pb-4">
          <h3 className="text-white font-black text-sm uppercase tracking-wider flex items-center gap-2 relative z-10">
            <Brain className="text-tennis-lime" size={18}/> 
            <span>AI Intelligence Briefings</span>
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
                          {insight.key_takeaways && insight.key_takeaways.map((takeaway: string, idx: number) => (
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
      </div>
      )}

      {/* Scouting report dossier section */}
      {!onlyNews && (
        <div className="space-y-4 text-left">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-white font-black text-sm uppercase tracking-wider">
            Scouting & Composure Dossier
          </h3>
          {lastUpdated && (
            <div className="flex items-center text-[10px] text-gray-500 bg-white/5 px-3 py-1 rounded-full border border-white/5">
              <Calendar size={10} className="mr-1.5 text-gray-400" />
              <span>Updated: {new Date(lastUpdated).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths Card */}
          <div className="bg-gradient-to-br from-[#121b18]/60 to-[#0e1215]/80 p-6 rounded-2xl border border-emerald-500/10 shadow-lg shadow-black/30">
            <h3 className="text-emerald-400 font-bold text-sm uppercase tracking-wider mb-4 flex items-center">
              <Award className="mr-2 text-emerald-400" size={18} />
              Core Strengths
            </h3>
            {strengthList.length > 0 ? (
              <ul className="space-y-3">
                {strengthList.map((item, idx) => (
                  <li key={idx} className="flex items-start text-xs text-gray-300 leading-normal">
                    <span className="text-emerald-500 mr-2 font-black mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-400 italic">No strength details recorded.</p>
            )}
          </div>

          {/* Weaknesses Card */}
          <div className="bg-gradient-to-br from-[#1b1315]/60 to-[#0e1215]/80 p-6 rounded-2xl border border-rose-500/10 shadow-lg shadow-black/30">
            <h3 className="text-rose-400 font-bold text-sm uppercase tracking-wider mb-4 flex items-center">
              <Target className="mr-2 text-rose-400" size={18} />
              Development Areas
            </h3>
            {weaknessList.length > 0 ? (
              <ul className="space-y-3">
                {weaknessList.map((item, idx) => (
                  <li key={idx} className="flex items-start text-xs text-gray-300 leading-normal">
                    <span className="text-rose-500 mr-2 font-black mt-0.5">⚠</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-400 italic">No vulnerability details recorded.</p>
            )}
          </div>
        </div>

        {/* Mental Game Card */}
        <div className="bg-gradient-to-br from-[#15131b]/60 to-[#0e1215]/80 p-6 rounded-2xl border border-purple-500/10 shadow-lg shadow-black/30">
          <h3 className="text-purple-400 font-bold text-sm uppercase tracking-wider mb-3 flex items-center">
            <Brain className="mr-2 text-purple-400" size={18} />
            Psychological Profile
          </h3>
          <p className="text-xs text-gray-300 leading-relaxed">
            {mentalGameNotes || 'Mental resilience indicators are standard. No specific composure alerts generated.'}
          </p>
        </div>
        </div>
      )}
    </motion.div>
  );
};

export default PlayerIntelligenceWidget;
