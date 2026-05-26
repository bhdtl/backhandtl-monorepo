import { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AchievementBadgeProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  unlocked?: boolean;
}

export function AchievementBadge({
  icon: Icon,
  title,
  description,
  color,
  unlocked = true
}: AchievementBadgeProps) {
  const { t } = useTranslation();

  return (
    <div
      role="article"
      aria-label={`${title} - ${unlocked ? t('achievements.status.unlocked') : t('achievements.status.locked')}`}
      className={`
        relative group bg-gradient-to-br ${color} p-4 rounded-xl
        transform transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl
        ${unlocked ? 'opacity-100' : 'opacity-40 grayscale'}
        border-2 ${unlocked ? 'border-tennis-lime' : 'border-gray-700/50'}
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative z-10">
        <div className={`
          w-12 h-12 rounded-full flex items-center justify-center mb-3
          ${unlocked ? 'bg-white/20 backdrop-blur-sm' : 'bg-gray-800/50'}
        `}>
          <Icon size={24} className={unlocked ? 'text-white' : 'text-gray-600'} />
        </div>

        <h3 className={`font-black text-xs uppercase tracking-wider mb-1 ${unlocked ? 'text-white' : 'text-gray-500'}`}>
          {title}
        </h3>

        <p className={`text-[11px] leading-tight ${unlocked ? 'text-white/80' : 'text-gray-600'}`}>
          {description}
        </p>
      </div>

      {unlocked && (
        <div 
          className="absolute -top-1 -right-1 w-6 h-6 bg-tennis-lime rounded-full flex items-center justify-center border-2 border-[#0f1115] shadow-lg"
        >
          <span className="text-[#0f1115] text-[10px] font-black">✓</span>
        </div>
      )}
    </div>
  );
}