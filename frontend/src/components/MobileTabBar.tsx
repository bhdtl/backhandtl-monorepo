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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      
      {/* 🚀 SCHWEBENDER ADMIN COMMAND BUTTON (NUR FÜR DICH AUF MOBILE) */}
      <AdminNotificationWidget isMobile={true} />

      <div className="px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <nav className="liquid-glass-bar pointer-events-auto">
          <div className="liquid-glass-inner">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = location.pathname.startsWith(tab.path);
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className="liquid-tab-item group"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabBg"
                      className="liquid-tab-active-bg"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <div className={`liquid-tab-content ${isActive ? 'liquid-tab-active' : 'liquid-tab-inactive'}`}>
                    <Icon
                      size={20}
                      strokeWidth={isActive ? 2.5 : 1.8}
                    />
                    <span className="liquid-tab-label">
                      {t(`mobileTabBar.${tab.key}`, tab.key.charAt(0).toUpperCase() + tab.key.slice(1))}
                    </span>
                  </div>
                </Link>
              );
            })}

            <div className="liquid-tab-divider" />

            <button
              onClick={onMenuAction}
              className="liquid-tab-item liquid-tab-menu group"
            >
              <div className="liquid-tab-content liquid-tab-inactive">
                <div className={`liquid-tab-avatar ${isLoggedIn ? 'liquid-tab-avatar-active' : ''}`}>
                  <UserIcon size={14} />
                </div>
                <span className="liquid-tab-label">
                  {t(isLoggedIn ? 'mobileTabBar.menu' : 'mobileTabBar.login', isLoggedIn ? 'Menu' : 'Login')}
                </span>
              </div>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}