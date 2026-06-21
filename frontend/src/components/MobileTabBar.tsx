import { useLocation, Link } from 'react-router-dom';
import { Users, Zap, Swords, User as UserIcon, Radar, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { AdminNotificationWidget } from './AdminNotificationWidget'; // 🚀 Import

interface MobileTabBarProps {
  onMenuAction: () => void;
  isLoggedIn: boolean;
}

const tabs = [
  { path: '/scout', key: 'scout', icon: Users },
  { path: '/scanner', key: 'scanner', icon: Zap },
  { path: '/picks', key: 'picks', icon: Target },
  { path: '/matchup', key: 'analyze', icon: Swords },
  { path: '/oracle', key: 'oracle', icon: Radar },
];

export function MobileTabBar({ onMenuAction, isLoggedIn }: MobileTabBarProps) {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      
      {/* 🚀 SCHWEBENDER ADMIN COMMAND BUTTON (NUR FÜR DICH AUF MOBILE) */}
      <AdminNotificationWidget isMobile={true} />

      <nav className="ios-tab-bar pointer-events-auto">
        <div className="ios-tab-inner">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname.startsWith(tab.path);
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className="ios-tab-item group relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-x-1.5 inset-y-1 bg-white/[0.06] border border-white/[0.04] rounded-xl z-0"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <div className={`ios-tab-content relative z-10 ${isActive ? 'ios-tab-active' : 'ios-tab-inactive'}`}>
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                  <span className="ios-tab-label">
                    {t(`mobileTabBar.${tab.key}`, tab.key.charAt(0).toUpperCase() + tab.key.slice(1))}
                  </span>
                </div>
              </Link>
            );
          })}

          <button
            onClick={onMenuAction}
            className="ios-tab-item group"
          >
            <div className="ios-tab-content ios-tab-inactive">
              <div className={`ios-tab-avatar ${isLoggedIn ? 'ios-tab-avatar-active' : ''}`}>
                <UserIcon size={14} />
              </div>
              <span className="ios-tab-label">
                {t(isLoggedIn ? 'mobileTabBar.menu' : 'mobileTabBar.login', isLoggedIn ? 'Menu' : 'Login')}
              </span>
            </div>
          </button>
        </div>
      </nav>
    </div>
  );
}