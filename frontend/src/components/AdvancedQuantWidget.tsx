import React from 'react';
import { BarChart3, ShieldCheck, Zap, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { BsiSpeedPerformance } from './BsiSpeedPerformance';
import { StyleAnalysis } from './StyleAnalysis';

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

interface AdvancedQuantWidgetProps {
  playerName?: string;
  skills?: PlayerSkills | null;
}

export const AdvancedQuantWidget: React.FC<AdvancedQuantWidgetProps> = ({
  playerName = '',
  skills = null,
}) => {
  // Generate deterministic quant stats based on skills
  const serveVal = skills?.serve || 75;
  const powerVal = skills?.power || 70;
  const speedVal = skills?.speed || 75;
  const mentalVal = skills?.mental || 70;

  const firstServeIn = Math.min(80, Math.max(50, Math.round(serveVal * 0.4 + 35)));
  const acesPerMatch = (powerVal * 0.15).toFixed(1);
  const breakPointsSaved = Math.min(85, Math.max(45, Math.round(mentalVal * 0.5 + 30)));
  const winRateOnServe = Math.min(90, Math.max(60, Math.round(serveVal * 0.6 + 30)));

  const statItems = [
    { label: 'First Serve In', value: `${firstServeIn}%`, desc: 'Ratio of successful 1st serves', icon: Zap, color: 'text-yellow-400' },
    { label: 'Aces / Match', value: acesPerMatch, desc: 'Average clean winners on serve', icon: BarChart3, color: 'text-cyan-400' },
    { label: 'Break Points Saved', value: `${breakPointsSaved}%`, desc: 'Composure when facing break points', icon: ShieldCheck, color: 'text-purple-400' },
    { label: 'Service Games Won', value: `${winRateOnServe}%`, desc: 'Percentage of hold game success', icon: Activity, color: 'text-emerald-400' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Grid of Key Quant Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="bg-[#151821]/80 backdrop-blur-md rounded-2xl p-4 border border-white/5 shadow-md flex flex-col justify-between"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {item.label}
                </span>
                <Icon size={16} className={`${item.color} opacity-80`} />
              </div>
              <div>
                <div className="text-2xl font-black text-white tracking-tight mb-1">
                  {item.value}
                </div>
                <div className="text-[10px] text-gray-500 leading-normal">
                  {item.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Embedded Deep Analytics Charts */}
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

