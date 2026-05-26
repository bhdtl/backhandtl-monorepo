import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  User,
  ShieldCheck,
  Settings,
  ChevronRight,
  Star,
  Search
} from 'lucide-react';
import { MetricsDashboard } from '../pages/MetricsDashboard';
import { useTranslation } from 'react-i18next';

export function Dashboard() {
  const { t } = useTranslation();
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-4">
        <div className="text-center bg-[#1a1d26] p-8 rounded-3xl border border-white/5 shadow-2xl">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="text-gray-500" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{t('dashboard.accessDenied.title')}</h2>
          <p className="text-gray-400 mb-6">{t('dashboard.accessDenied.message')}</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-tennis-lime text-black px-8 py-3 rounded-full font-black uppercase tracking-wider hover:scale-105 transition-transform transform-gpu will-change-transform"
          >
            {t('dashboard.accessDenied.loginButton')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1115] pt-12 pb-24 px-4">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* HEADER SECTION */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">
              {t('dashboard.header.title')}
            </h1>
            <p className="text-gray-500 text-sm font-medium">{t('dashboard.header.subtitle')}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="p-3 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-colors transform-gpu will-change-transform group"
            title={t('dashboard.header.logout')}
          >
            <LogOut size={22} />
          </button>
        </div>

        {/* USER PROFILE CARD */}
        <div className="bg-[#1a1d26] p-6 rounded-[2rem] border border-white/5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-tennis-lime/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none"></div>

          <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-700 to-black p-1 shadow-2xl">
              <div className="w-full h-full rounded-full bg-[#0f1115] flex items-center justify-center border border-white/10">
                <User className="text-gray-400" size={40} />
              </div>
            </div>

            <div className="text-center md:text-left flex-1">
              <div className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                {t('dashboard.profile.authorizedUser')}
              </div>
              <h2 className="text-white font-bold text-xl md:text-2xl break-all">
                {user.email}
              </h2>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
                {isAdmin && (
                  <span className="inline-flex items-center gap-1.5 bg-tennis-lime/10 text-tennis-lime px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-tennis-lime/20">
                    <ShieldCheck size={12} /> {t('dashboard.profile.adminAccess')}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-blue-500/20">
                  ID: {user.id.substring(0, 8)}...
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* --- ADMIN METRICS SECTION --- */}
        {isAdmin && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <MetricsDashboard />
          </div>
        )}

        {/* QUICK ACTIONS / SETTINGS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/watchlist')}
            className="group flex items-center justify-between p-5 bg-[#1a1d26] rounded-2xl border border-white/5 hover:border-tennis-lime/30 transition-colors text-left transform-gpu will-change-transform"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-tennis-lime/10 text-tennis-lime rounded-xl transform-gpu will-change-transform group-hover:scale-110 transition-transform">
                <Star size={20} />
              </div>
              <div>
                <span className="block text-white font-bold text-sm">{t('dashboard.actions.watchlist.title')}</span>
                <span className="text-gray-500 text-xs">{t('dashboard.actions.watchlist.desc')}</span>
              </div>
            </div>
            <ChevronRight className="text-gray-600 group-hover:text-tennis-lime transition-colors" />
          </button>

          <button
            onClick={() => navigate('/')}
            className="group flex items-center justify-between p-5 bg-[#1a1d26] rounded-2xl border border-white/5 hover:border-blue-500/30 transition-colors text-left transform-gpu will-change-transform"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl transform-gpu will-change-transform group-hover:scale-110 transition-transform">
                <Search size={20} />
              </div>
              <div>
                <span className="block text-white font-bold text-sm">{t('dashboard.actions.discovery.title')}</span>
                <span className="text-gray-500 text-xs">{t('dashboard.actions.discovery.desc')}</span>
              </div>
            </div>
            <ChevronRight className="text-gray-600 group-hover:text-blue-400 transition-colors" />
          </button>
        </div>

        {/* SETTINGS SECTION */}
        <div className="pt-4">
          <h3 className="text-gray-500 font-black text-[10px] uppercase tracking-[0.3em] mb-4 px-2">{t('dashboard.settings.title')}</h3>
          <div className="bg-[#1a1d26] rounded-3xl border border-white/5 divide-y divide-white/5">
            <button className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <Settings size={18} className="text-gray-400" />
                <span className="text-sm font-bold text-gray-200">{t('dashboard.settings.preferences')}</span>
              </div>
              <ChevronRight size={16} className="text-gray-700" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
