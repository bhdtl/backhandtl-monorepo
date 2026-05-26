import { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next'; // 1. Import

interface SkillBarProps {
  icon: LucideIcon;
  label: string;
  value: number;
  color: string;
  glowColor: string;
}

export function SkillBar({ icon: Icon, label, value, color, glowColor }: SkillBarProps) {
  const { t } = useTranslation(); // 2. Hook

  return (
    <div 
      className="group"
      // 3. Accessibility Upgrade: Semantische Beschreibung für Screenreader
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={t('skillBar.ariaLabel', { skill: label, value: value })} // "Forehand: 98 points"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Icon size={18} className={`${color}`} />
          <span className="text-sm font-semibold text-gray-300">{label}</span>
        </div>
        <span className={`text-lg font-bold ${color}`}>{Math.round(value)}</span>
      </div>
      <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
        <div
          className={`h-full rounded-full transition-all duration-500 relative ${color.replace('text-', 'bg-')}`}
          style={{ width: `${value}%` }}
        >
          <div
            className="absolute inset-0 opacity-50 blur-sm"
            style={{ backgroundColor: glowColor }}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-300"
             style={{ animation: 'shimmer 2s infinite' }}
        />
      </div>
    </div>
  );
}