import React, { useState, useMemo } from 'react';
import { 
  Database, CalendarClock, Layers, Eye, Target, AlertTriangle, 
  Activity, Zap, Swords, Shield, Crosshair, BarChart3, ShieldCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, 
  Radar, Tooltip as RechartsTooltip 
} from 'recharts';
import { BsiSpeedPerformance } from './BsiSpeedPerformance';
import { StyleAnalysis } from './StyleAnalysis';
import { fadeUpVariant } from './animationVariants';

interface AdvancedQuantWidgetProps {
  playerName?: string;
  advancedStats?: any;
}

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const CustomRadarTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#0f1115]/95 border border-white/10 px-3 py-2 rounded-xl text-left shadow-2xl">
        <span className="text-[10px] font-black uppercase tracking-widest text-tennis-lime block mb-0.5">
          {data.subject}
        </span>
        <span className="text-xl font-black text-white">
          {Math.round(data.A)}%
        </span>
      </div>
    );
  }
  return null;
};

const QuantStatCard = ({ title, value, icon: Icon, textClass, bgClass, suffix = "" }: any) => {
  const displayValue = value !== undefined && value !== null ? value : '-';
  
  return (
    <motion.div 
      variants={fadeUpVariant}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="bg-[#0f1115] border border-white/5 rounded-2xl p-4 relative overflow-hidden group min-w-[140px] md:min-w-0 flex-1 snap-center shadow-lg h-full shrink-0 cursor-default"
    >
      <div className={`absolute -right-4 -bottom-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500 ${textClass}`}>
        <Icon size={80} />
      </div>
      
      <div className="relative z-10 flex flex-col h-full justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-white/5 ${textClass} ${bgClass} bg-opacity-10`}>
            <Icon size={14} className={textClass} />
          </div>
          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400">
            {title}
          </span>
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

export const AdvancedQuantWidget: React.FC<AdvancedQuantWidgetProps> = ({
  playerName = '',
  advancedStats = null,
}) => {
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

  const currentStats = useMemo(() => {
    if (!parsedStats) return null;
    const timeData = parsedStats[activeTime] || parsedStats['all'];
    return timeData ? timeData[activeSurface] : null;
  }, [parsedStats, activeTime, activeSurface]);

  const radarData = useMemo(() => {
    if (!currentStats) return [];
    return [
      { subject: '1st Serve In', A: currentStats.first_in_pct || 0, fullMark: 100 },
      { subject: '1st Serve Win', A: currentStats.first_win_pct || 0, fullMark: 100 },
      { subject: '2nd Serve Win', A: currentStats.second_win_pct || 0, fullMark: 100 },
      { subject: 'Return Win', A: currentStats.ret_win_pct || 0, fullMark: 100 },
      { subject: 'BP Saved', A: currentStats.bp_saved_pct || 0, fullMark: 100 },
      { subject: 'BP Conv.', A: currentStats.bp_conv_pct || 0, fullMark: 100 },
    ];
  }, [currentStats]);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={fadeUpVariant}
      className="space-y-8"
    >
      {/* Header and Filter Controls */}
      <div className="bg-[#151821]/80 backdrop-blur-md rounded-3xl p-6 border border-white/5 shadow-xl relative overflow-hidden space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-black text-sm uppercase tracking-wider flex items-center gap-2">
            <Database className="text-purple-400" size={18} />
            Quant Performance Matrix
          </h3>
        </div>

        {/* Segmented Controls */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 overflow-x-auto hide-scrollbar flex-1 relative">
            {[
              { id: 'l7', label: 'Last 7' },
              { id: '1m', label: '1 Month' },
              { id: 'ytd', label: 'Yearly' },
              { id: 'all', label: 'All Time' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTime(tab.id as any)}
                className={`flex-1 min-w-max px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative ${
                  activeTime === tab.id ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {activeTime === tab.id && (
                  <motion.div 
                    layoutId="activeTimeBg" 
                    className="absolute inset-0 bg-[#2a2d36] rounded-lg border border-white/10 z-0" 
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 overflow-x-auto hide-scrollbar flex-1 relative">
            {['overall', 'hard', 'clay', 'grass'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSurface(tab as any)}
                className={`flex-1 min-w-max px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative ${
                  activeSurface === tab ? 'text-black' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {activeSurface === tab && (
                  <motion.div 
                    layoutId="activeSurfaceBg" 
                    className="absolute inset-0 bg-white rounded-lg border border-white/10 z-0" 
                  />
                )}
                <span className="relative z-10">{tab}</span>
              </button>
            ))}
          </div>
        </div>

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
              <span className="text-[10px] uppercase font-bold tracking-widest">
                No Data for {activeTime} / {activeSurface}
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="has-data"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2"
            >
              {/* Radar Chart Container */}
              <div className="lg:col-span-1 bg-[#0f1115] rounded-2xl border border-white/5 flex flex-col items-center justify-center p-4 relative overflow-hidden shadow-inner">
                <div className="absolute inset-0 bg-gradient-to-br from-tennis-lime/5 to-transparent pointer-events-none" />
                <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 absolute top-4 left-4">
                  Player Performance Map
                </h4>
                
                <div className="w-full h-[220px] md:h-[260px] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                      <PolarGrid stroke="#374151" strokeDasharray="3 3" />
                      <PolarAngleAxis 
                        dataKey="subject" 
                        tick={{ fill: '#9ca3af', fontSize: 9, fontWeight: 'bold' }} 
                      />
                      <Radar 
                        name="Metrics" 
                        dataKey="A" 
                        stroke="#ccff00" 
                        strokeWidth={2} 
                        fill="#ccff00" 
                        fillOpacity={0.2} 
                      />
                      <RechartsTooltip content={<CustomRadarTooltip />} cursor={false} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 8 Stats Grid */}
              <div className="lg:col-span-2">
                <motion.div 
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-2 sm:grid-cols-4 gap-3 h-full"
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
          <div className="w-1.5 h-1.5 rounded-full bg-tennis-lime animate-pulse" />
          Based on {currentStats?.matches_with_stats || 0} granular matches
        </div>
      </div>

      {/* Embedded Speed and Playing Style Analysis */}
      {playerName && (
        <div className="space-y-8 pt-4">
          <div className="border-t border-white/5 pt-8">
            <h3 className="text-white font-black text-lg uppercase tracking-wider mb-4 px-2">
              BSI Court Speed Performance
            </h3>
            <div className="bg-[#151821]/60 rounded-3xl p-2 border border-white/5 overflow-hidden">
              <BsiSpeedPerformance playerName={playerName} />
            </div>
          </div>

          <div className="border-t border-white/5 pt-8">
            <h3 className="text-white font-black text-lg uppercase tracking-wider mb-4 px-2">
              Playing Style Analysis
            </h3>
            <div className="bg-[#151821]/60 rounded-3xl p-2 border border-white/5 overflow-hidden">
              <StyleAnalysis playerName={playerName} />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AdvancedQuantWidget;
