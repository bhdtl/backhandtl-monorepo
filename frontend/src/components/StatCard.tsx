import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color: string;
  gradient: string;
}

export function StatCard({ icon: Icon, label, value, color, gradient }: StatCardProps) {
  return (
    <div className={`bg-gradient-to-br ${gradient} p-6 rounded-xl border-2 border-gray-700 transform transition-all duration-300 hover:scale-105 hover:border-${color.split('-')[1]}-500 hover:shadow-2xl group`}>
      <div className="flex items-center justify-between mb-3">
        <Icon size={32} className={`${color} group-hover:scale-110 transition-transform`} />
        <div className="w-2 h-2 rounded-full bg-tennis-lime animate-pulse" />
      </div>

      <div className="text-3xl font-bold text-white mb-1">
        {typeof value === 'number' ? Math.round(value) : value}
      </div>

      <div className="text-sm text-gray-400 font-medium">
        {label}
      </div>

      <div className="mt-3 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color.replace('text-', 'bg-')} rounded-full`} style={{ width: '70%' }} />
      </div>
    </div>
  );
}
