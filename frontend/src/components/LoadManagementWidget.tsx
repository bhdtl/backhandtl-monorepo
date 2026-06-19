import React, { useMemo } from 'react';
import { HeartPulse, Battery, AlertTriangle, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoadManagementWidgetProps {
  sackmannMetrics?: any;
}

export const LoadManagementWidget: React.FC<LoadManagementWidgetProps> = ({
  sackmannMetrics = null,
}) => {
  const parsedMetrics = useMemo(() => {
    if (!sackmannMetrics) return null;
    try {
      return typeof sackmannMetrics === 'string' ? JSON.parse(sackmannMetrics) : sackmannMetrics;
    } catch (e) {
      return null;
    }
  }, [sackmannMetrics]);

  const fatigueMins = parsedMetrics?.fatigue?.recent_14d_minutes || 0;

  // Status mapping based on original logic
  let statusText = 'FRESH';
  let statusColor = 'text-tennis-lime';
  let bgColor = 'bg-tennis-lime';
  let shadowColor = 'shadow-[0_0_15px_rgba(132,204,22,0.2)]';
  let borderClass = 'border-tennis-lime/20';
  let description = 'Optimal physical condition. No signs of fatigue expected.';

  const percentage = Math.min(100, Math.max(0, (fatigueMins / 1200) * 100));

  if (fatigueMins > 900) {
    statusText = 'CRITICAL LOAD';
    statusColor = 'text-rose-500';
    bgColor = 'bg-rose-500';
    shadowColor = 'shadow-[0_0_15px_rgba(244,63,94,0.3)]';
    borderClass = 'border-rose-500/20';
    description = 'Extreme fatigue. Massive risk of performance drop in late sets.';
  } else if (fatigueMins > 600) {
    statusText = 'HEAVY LEGS';
    statusColor = 'text-amber-500';
    bgColor = 'bg-amber-500';
    shadowColor = 'shadow-[0_0_15px_rgba(245,158,11,0.2)]';
    borderClass = 'border-amber-500/20';
    description = 'Increased load over the last 2 weeks. Recovery deficit likely.';
  } else if (fatigueMins > 300) {
    statusText = 'MATCH RHYTHM';
    statusColor = 'text-sky-400';
    bgColor = 'bg-sky-400';
    shadowColor = 'shadow-[0_0_15px_rgba(56,189,248,0.2)]';
    borderClass = 'border-sky-400/20';
    description = 'Perfect match rhythm. Player is dialed in without being overworked.';
  }

  // Calculate auxiliary metrics derived from actual fatigue
  const recoveryScore = Math.max(20, Math.min(98, 100 - Math.round(percentage * 0.7)));
  const injuryRisk = Math.max(5, Math.min(95, Math.round(percentage * 0.9)));

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <div className={`bg-[#151821]/80 backdrop-blur-md rounded-3xl p-6 border ${borderClass} shadow-xl relative overflow-hidden group`}>
        <div className={`absolute top-0 right-0 w-32 h-32 ${bgColor} opacity-5 rounded-full blur-[40px] pointer-events-none`} />

        <div className="flex justify-between items-center mb-6">
          <h3 className="text-white font-black text-sm uppercase tracking-wider flex items-center gap-2">
            <HeartPulse className={statusColor} size={18} />
            Physiological Load Status
          </h3>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${borderClass} bg-black/40 ${shadowColor}`}>
            <Battery size={14} className={statusColor} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${statusColor}`}>
              {statusText}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 space-y-4">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Time on Court (Last 14 Days)
              </span>
              <span className="text-2xl font-black text-white leading-none">
                {fatigueMins} <span className="text-sm text-gray-500 ml-0.5">Min</span>
              </span>
            </div>

            <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
              <div className="absolute top-0 left-[25%] bottom-0 w-px bg-white/5 z-0" />
              <div className="absolute top-0 left-[50%] bottom-0 w-px bg-white/5 z-0" />
              <div className="absolute top-0 left-[75%] bottom-0 w-px bg-white/5 z-0" />

              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full ${bgColor} rounded-full`}
              />
            </div>

            <div className="flex justify-between text-[8px] font-mono text-gray-600">
              <span>0h</span>
              <span>5h</span>
              <span>10h</span>
              <span>15h+</span>
            </div>
          </div>

          <div className="bg-black/20 rounded-2xl p-4 border border-white/5 flex items-start space-x-2">
            <AlertTriangle className={`${statusColor} mt-0.5 shrink-0`} size={16} />
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-0.5">
                Load Assessment
              </span>
              <p className="text-xs text-gray-300 leading-snug">{description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Auxiliary Wellness Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#151821]/80 backdrop-blur-md p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Recovery Index</span>
          <div className="flex items-baseline space-x-1 mt-2">
            <span className="text-3xl font-black text-emerald-400">{recoveryScore}%</span>
            <span className="text-xs text-gray-500">HRV</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 leading-normal">
            Calculated adaptation capability based on stamina metrics.
          </p>
        </div>

        <div className="bg-[#151821]/80 backdrop-blur-md p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Injury Risk Probability</span>
          <div className="flex items-baseline space-x-1 mt-2">
            <span className="text-3xl font-black text-rose-500">{injuryRisk}%</span>
            <span className="text-xs text-gray-500">Alert</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 leading-normal">
            Accumulated tissue strain risk calculated from recent court volume.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadManagementWidget;


