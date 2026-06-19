import React from 'react';
import { Activity, ShieldAlert, Heart, Zap } from 'lucide-react';

interface LoadManagementWidgetProps {
  stamina?: number;
  speed?: number;
}

export const LoadManagementWidget: React.FC<LoadManagementWidgetProps> = ({
  stamina = 75,
  speed = 70,
}) => {
  // Generate deterministic metrics based on player's stamina and speed
  const recoveryScore = Math.min(95, Math.max(45, Math.round(stamina * 0.9 + 20)));
  const physicalStress = Math.min(90, Math.max(30, Math.round(110 - stamina * 0.8)));
  const matchLoad = Math.min(95, Math.max(40, Math.round(speed * 0.5 + 45)));
  const injuryRisk = Math.min(85, Math.max(5, Math.round((physicalStress * 1.2 - recoveryScore * 0.5) / 2 + 15)));

  const metrics = [
    {
      label: 'Match Load',
      value: matchLoad,
      color: 'stroke-cyan-500',
      textColor: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      icon: Activity,
    },
    {
      label: 'Physical Stress',
      value: physicalStress,
      color: 'stroke-amber-500',
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      icon: Zap,
    },
    {
      label: 'Recovery Score',
      value: recoveryScore,
      color: 'stroke-emerald-500',
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      icon: Heart,
    },
    {
      label: 'Injury Risk',
      value: injuryRisk,
      color: 'stroke-rose-500',
      textColor: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      icon: ShieldAlert,
    },
  ];

  // SVG parameters for circular progress
  const radius = 36;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {metrics.map((m) => {
          const strokeDashoffset = circumference - (m.value / 100) * circumference;
          const Icon = m.icon;

          return (
            <div
              key={m.label}
              className="bg-[#151821]/80 backdrop-blur-md rounded-2xl p-4 border border-white/5 flex flex-col items-center text-center shadow-lg hover:border-white/10 transition-colors"
            >
              <div className="relative w-24 h-24 mb-3">
                {/* SVG Circle Gauge */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    className="stroke-[#222736]"
                    strokeWidth="8"
                    fill="transparent"
                    r={radius}
                    cx="50"
                    cy="50"
                  />
                  <circle
                    className={`${m.color} transition-all duration-1000 ease-out`}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    r={radius}
                    cx="50"
                    cy="50"
                  />
                </svg>
                {/* Centered Icon and Percentage */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Icon className={`w-4 h-4 ${m.textColor} opacity-80 mb-0.5`} />
                  <span className="text-lg font-black text-white leading-none">
                    {m.value}%
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                {m.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Wellness Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-[#161a25]/60 to-[#0f1115]/80 p-5 rounded-2xl border border-white/5">
          <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-2 flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
            Training Load Analysis
          </h4>
          <p className="text-xs text-gray-400 leading-relaxed">
            Biometric telemetry shows the player is within the optimal training adaptation zone. 
            HRV recovery ratios match high-intensity tennis loads, suggesting supercompensation is active. 
            No overtraining fatigue patterns detected.
          </p>
        </div>

        <div className="bg-gradient-to-br from-[#161a25]/60 to-[#0f1115]/80 p-5 rounded-2xl border border-white/5">
          <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-2 flex items-center">
            <span className="w-2 h-2 rounded-full bg-cyan-500 mr-2" />
            Physical Conditioning Notes
          </h4>
          <p className="text-xs text-gray-400 leading-relaxed">
            Stamina levels remain high with quick cardiovascular recovery. Recommended match load is standard. 
            Preventative physiotherapy protocols are active to protect shoulder and lower-back muscle tissue.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadManagementWidget;

