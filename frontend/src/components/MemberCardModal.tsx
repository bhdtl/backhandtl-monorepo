import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Settings, LogOut, ExternalLink, AlertTriangle, Trash2, ChevronRight, Bell } from 'lucide-react';
import { useAccess } from '../hooks/useAccess'; 
import { MemberCard } from './MemberCard'; 
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface MemberCardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MemberCardModal({ isOpen, onClose }: MemberCardModalProps) {
  const { user, signOut } = useAuth();
  const { credits, isElite, refreshAccess, loading } = useAccess();
  const navigate = useNavigate();

  // --- SETTINGS STATE ---
  const [showSettings, setShowSettings] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // --- PUSH NOTIFICATION STATE ---
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLevel, setPushLevel] = useState<'potd' | 'high_value' | 'all'>('high_value');
  const [isPushLoading, setIsPushLoading] = useState(false);
  const [showIosInstruction, setShowIosInstruction] = useState(false);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
        refreshAccess();
        setShowSettings(false);
        setShowDeleteConfirm(false);
        setShowIosInstruction(false);
        if (user) {
            checkSubscriptionStatus();
        }
    }
  }, [isOpen, user]);

  const checkSubscriptionStatus = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('push_subscriptions')
        .select('push_level')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setPushEnabled(true);
        setPushLevel(data.push_level as 'potd' | 'high_value' | 'all');
      } else {
        setPushEnabled(false);
      }
    } catch (e) {
      console.error('Error checking push status:', e);
    }
  };

  // --- HANDLERS ---
  const handleSignOut = async () => {
    await signOut();
    onClose();
    navigate('/');
  };

  const handleManageSubscription = () => {
      // 🚀 SOTA: Direct link to Lemon Squeezy Customer Portal
      window.open('https://backhandtl.lemonsqueezy.com/billing', '_blank');
  };

  const handlePushToggle = async () => {
    if (!user) return;
    setIsPushLoading(true);

    try {
      if (pushEnabled) {
        // Unsubscribe
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await subscription.unsubscribe();
          }
        } catch (e) {
          console.warn('Browser unsubscribe failed or not supported:', e);
        }
        
        const { error } = await supabase.from('push_subscriptions').delete().eq('user_id', user.id);
        if (error) throw error;
        
        setPushEnabled(false);
      } else {
        // Subscribe
        const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

        if (isIos && !isStandalone) {
          setShowIosInstruction(true);
          setIsPushLoading(false);
          return;
        }

        if (!('Notification' in window)) {
          alert('This browser does not support notifications.');
          setIsPushLoading(false);
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          alert('Notification permission denied. Please allow notifications in browser settings.');
          setIsPushLoading(false);
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        const vapidPublicKey = 'BM_dk2077mt3YTvUPGOliX5NDezbvp0gjZyigyEy3G6Y8PMD3PqFSvWrc-XL4z7ZjTWMEcHXzzkozVXEG1IwLug';
        
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
          });
        }

        const { error } = await supabase.from('push_subscriptions').upsert({
          user_id: user.id,
          subscription: subscription.toJSON(),
          push_level: pushLevel
        });
        if (error) throw error;

        setPushEnabled(true);
      }
    } catch (e: any) {
      console.error('Push toggle failed:', e);
      alert('Failed to register notifications: ' + (e.message || e));
    } finally {
      setIsPushLoading(false);
    }
  };

  const handlePushLevelChange = async (newLevel: 'potd' | 'high_value' | 'all') => {
    if (!user) return;
    setPushLevel(newLevel);
    
    if (pushEnabled) {
      try {
        const { error } = await supabase
          .from('push_subscriptions')
          .update({ push_level: newLevel })
          .eq('user_id', user.id);
        if (error) throw error;
      } catch (e) {
        console.error('Failed to update push level:', e);
      }
    }
  };

  const handleDeleteAccount = async () => {
      setIsDeleting(true);
      try {
          // Ruft die SQL-Funktion auf, die wir in Supabase erstellt haben
          const { error } = await supabase.rpc('delete_my_account');
          if (error) throw error;
          
          await signOut();
          onClose();
          navigate('/');
      } catch (e: any) {
          console.error("Deletion failed:", e);
          alert("Could not delete account. Please contact support.");
          setIsDeleting(false);
          setShowDeleteConfirm(false);
      }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop mit Blur */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container - FIX: Added pb-8 so there's always space at the bottom */}
          <motion.div 
            initial={{ scale: 0.9, y: 20, opacity: 0 }} 
            animate={{ scale: 1, y: 0, opacity: 1 }} 
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar z-10 flex flex-col gap-4 pb-8"
          >
            {/* Close Button out-of-bounds for clean UI */}
            <div className="flex justify-end w-full px-2 mt-2">
                <button 
                    onClick={onClose} 
                    className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors backdrop-blur-md"
                >
                  <X size={20} />
                </button>
            </div>

            {loading ? (
                // Loading State
                <div className="w-full aspect-[1.586/1] bg-[#0A0A0A] border border-white/10 rounded-[24px] flex flex-col items-center justify-center shadow-2xl">
                    <Loader2 className="w-10 h-10 text-tennis-lime animate-spin mb-4" />
                    <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Loading Pass...</span>
                </div>
            ) : (
                <>
                    {/* 💳 DIE KARTE */}
                    <MemberCard 
                        user={user} 
                        profile={{ 
                            tier: isElite ? 'elite' : 'free', 
                            credits: credits 
                        }} 
                        onRefresh={refreshAccess} 
                    />

                    {/* ⚙️ ACCOUNT SETTINGS TOGGLE */}
                    <button 
                      onClick={() => setShowSettings(!showSettings)}
                      className="mx-auto mt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors bg-[#15171e] px-6 py-3 rounded-full border border-white/5 shadow-xl hover:bg-white/5"
                    >
                        <Settings size={14} /> {showSettings ? 'Hide Settings' : 'Account Settings'}
                    </button>

                    {/* 🎛️ SETTINGS PANEL (Animated Expand) */}
                    {/* FIX: Animation container is now separate from the styling container to prevent squishing */}
                    <AnimatePresence>
                        {showSettings && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden shrink-0 w-full"
                            >
                                <div className="w-full bg-[#15171e] border border-white/5 rounded-3xl p-5 shadow-2xl flex flex-col gap-3 mt-2">
                                    {/* Subscription Management */}
                                    <button 
                                        onClick={handleManageSubscription}
                                        className="w-full flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-2xl transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
                                                <ExternalLink size={16} />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-white text-xs font-bold uppercase tracking-wider mb-0.5">Manage Subscription</div>
                                                <div className="text-gray-500 text-[10px] font-medium">Cancel or update billing details</div>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-600 group-hover:text-white transition-colors" />
                                    </button>

                                    {/* Notification Settings */}
                                    <div className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2.5 rounded-xl transition-transform ${pushEnabled ? 'bg-tennis-lime/10 text-tennis-lime' : 'bg-gray-500/10 text-gray-400'}`}>
                                                    <Bell size={16} />
                                                </div>
                                                <div className="text-left">
                                                    <div className="text-white text-xs font-bold uppercase tracking-wider mb-0.5">App Notifications</div>
                                                    <div className="text-gray-500 text-[10px] font-medium">Get live alerts for AI Picks</div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handlePushToggle}
                                                disabled={isPushLoading}
                                                className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none flex items-center ${pushEnabled ? 'bg-tennis-lime justify-end' : 'bg-white/10 justify-start'}`}
                                            >
                                                <motion.div 
                                                    layout
                                                    className="w-5 h-5 rounded-full bg-black shadow-md"
                                                />
                                            </button>
                                        </div>

                                        {/* Show Preferences only if notifications are active */}
                                        {pushEnabled && (
                                            <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
                                                <div className="text-gray-400 text-[9px] font-black uppercase tracking-wider">Alert Frequency</div>
                                                <div className="grid grid-cols-3 gap-1 bg-black/40 p-0.5 rounded-xl border border-white/5">
                                                    {(['potd', 'high_value', 'all'] as const).map((level) => (
                                                        <button
                                                            key={level}
                                                            type="button"
                                                            onClick={() => handlePushLevelChange(level)}
                                                            className={`py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${
                                                                pushLevel === level
                                                                    ? 'bg-[#15171e] text-tennis-lime shadow-md border border-white/5'
                                                                    : 'text-gray-500 hover:text-gray-300'
                                                            }`}
                                                        >
                                                            {level === 'potd' ? 'POTD Only' : level === 'high_value' ? 'High-Yield' : 'All'}
                                                        </button>
                                                    ))}
                                                </div>
                                                {pushLevel === 'all' && (
                                                    <div className="text-[9px] font-medium text-amber-500/80 bg-amber-500/5 border border-amber-500/10 rounded-lg p-2 leading-relaxed mt-1">
                                                        ⚠️ Warning: High frequency alerts (up to 100+ daily picks possible).
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* iOS Instructions popup inline if triggered */}
                                        {showIosInstruction && (
                                            <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-3 mt-2 text-left animate-in zoom-in-95 duration-200">
                                                <div className="text-white text-xs font-bold uppercase tracking-wider mb-1">Add to Home Screen</div>
                                                <p className="text-[10px] text-gray-400 leading-relaxed mb-2">
                                                    iOS requires this Web App to be added to your Home Screen first to enable notifications.
                                                </p>
                                                <ol className="text-[9px] text-gray-400 list-decimal pl-4 space-y-1">
                                                    <li>Tap the Safari <strong>Share</strong> button.</li>
                                                    <li>Scroll down and select <strong>"Add to Home Screen"</strong>.</li>
                                                    <li>Open the app from your home screen and enable notifications here.</li>
                                                </ol>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowIosInstruction(false)}
                                                    className="w-full mt-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors"
                                                >
                                                    Got it
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Sign Out */}
                                    <button 
                                        onClick={handleSignOut}
                                        className="w-full flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-2xl transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 bg-gray-500/10 text-gray-400 rounded-xl group-hover:scale-110 transition-transform">
                                                <LogOut size={16} />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-white text-xs font-bold uppercase tracking-wider">Sign Out</div>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Danger Zone: Delete Account */}
                                    <div className="mt-4 pt-4 border-t border-white/5">
                                        {!showDeleteConfirm ? (
                                            <button 
                                                onClick={() => setShowDeleteConfirm(true)}
                                                className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-red-500 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Trash2 size={14} /> Delete Account
                                            </button>
                                        ) : (
                                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                                                <AlertTriangle size={24} className="text-red-500 mb-3" />
                                                <h4 className="text-red-500 text-xs font-black uppercase tracking-widest mb-1.5">Are you absolutely sure?</h4>
                                                <p className="text-[10px] text-gray-400 mb-5 leading-relaxed">
                                                    This will permanently erase your profile, tracked players, and active passes. Active subscriptions via Lemon Squeezy must be canceled separately.
                                                </p>
                                                <div className="flex w-full gap-3">
                                                    <button 
                                                        onClick={() => setShowDeleteConfirm(false)}
                                                        disabled={isDeleting}
                                                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button 
                                                        onClick={handleDeleteAccount}
                                                        disabled={isDeleting}
                                                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                                                    >
                                                        {isDeleting ? <Loader2 size={14} className="animate-spin" /> : 'Yes, Delete'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}