import { useState } from 'react';
import { User, MoreVertical, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { MobileMenu } from './MobileMenu';
import { BrandLogo } from './BrandLogo';
import { AdminNotificationWidget } from './AdminNotificationWidget'; // 🚀 SOTA: Admin Widget Import
import { useTranslation } from 'react-i18next';

interface HeaderProps {
  onLoginClick: () => void;
  onNavigate?: (page: string) => void;
  onMemberClick?: () => void;
  currentPage?: string;
}

export function Header({ onLoginClick, onNavigate, onMemberClick, currentPage = 'home' }: HeaderProps) {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useTranslation();

  const handleNavClick = (page: string) => {
    onNavigate?.(page);
    setIsMenuOpen(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3">
          <div className="liquid-glass-header">
            <div className="liquid-glass-header-inner">
              <button
                onClick={() => handleNavClick('home')}
                className="flex items-center group transition-transform hover:scale-[1.02] focus:outline-none h-10"
              >
                <BrandLogo className="h-8 text-white" withText={true} />
              </button>

              <div className="flex items-center gap-2">
                
                {/* 🚀 NUR FÜR DESKTOP SICHTBAR */}
                <AdminNotificationWidget isMobile={false} />

                {!user ? (
                  <button
                    onClick={onLoginClick}
                    className="mr-1 px-4 py-1.5 bg-tennis-lime text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-tennis-lime/20 flex items-center gap-2"
                  >
                    <LogIn size={14} />
                    <span>{t('auth.links.login', 'Login')}</span>
                  </button>
                ) : (
                  <button
                    onClick={onMemberClick}
                    className="hidden md:flex items-center gap-3 mr-1 pr-3 border-r border-white/10 hover:opacity-80 transition-opacity cursor-pointer focus:outline-none group"
                  >
                    <div className="liquid-header-avatar">
                      <User size={15} className="text-gray-400 group-hover:text-tennis-lime transition-colors" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-white transition-colors">{t('header.member', 'Member')}</span>
                  </button>
                )}

                <button
                  onClick={() => setIsMenuOpen(true)}
                  className="liquid-header-btn group"
                  aria-label="Open Navigation"
                >
                  <MoreVertical className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:rotate-90 transition-all duration-300" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <MobileMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        currentPage={currentPage}
        onNavigate={handleNavClick}
      />
    </>
  );
}