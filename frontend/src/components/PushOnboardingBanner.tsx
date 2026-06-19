import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// Utility helper to convert VAPID public key
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

export function PushOnboardingBanner() {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if (!user) {
      setShowPrompt(false);
      return;
    }

    // 1. Check browser support
    const isPushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    if (!isPushSupported) return;

    // 2. Check current browser permission
    if (Notification.permission !== 'default') return;

    // 3. Check iOS standalone mode check
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (isIos && !isStandalone) return; // iOS only allows push in standalone mode

    // 4. Check dismissal cooldown (7 days)
    const lastDismissed = localStorage.getItem('push_prompt_dismissed');
    if (lastDismissed) {
      const cooldown = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
      if (Date.now() - parseInt(lastDismissed, 10) < cooldown) {
        return;
      }
    }

    // 5. Query Supabase to see if they are already subscribed on another device
    const checkDbSubscription = async () => {
      try {
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!data) {
          // Trigger the prompt after a 3-second premium delay
          const timer = setTimeout(() => {
            setShowPrompt(true);
          }, 3000);
          return () => clearTimeout(timer);
        }
      } catch (e) {
        console.error('Error checking push db status:', e);
      }
    };

    checkDbSubscription();
  }, [user]);

  const handleEnablePush = async () => {
    if (!user) return;
    setIsSubscribing(true);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        // User denied the prompt. Save to localStorage to avoid asking again
        localStorage.setItem('push_prompt_dismissed', Date.now().toString());
        setShowPrompt(false);
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

      // Upsert subscription with default 'high_value' notifications
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        subscription: subscription.toJSON(),
        push_level: 'high_value'
      });

      if (error) throw error;
      setShowPrompt(false);
    } catch (e) {
      console.error('Failed to enable push on prompt:', e);
      alert('Failed to register notifications. You can try again in Account Settings.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('push_prompt_dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <div className="fixed inset-x-0 bottom-20 md:bottom-6 z-[999] flex justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-md bg-[#15171e]/90 border border-white/10 rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-md flex flex-col gap-4 pointer-events-auto"
          >
            {/* Header / Dismiss */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-tennis-lime/10 text-tennis-lime rounded-xl">
                  <Bell size={20} className="animate-pulse" />
                </div>
                <div className="text-left">
                  <h3 className="text-white text-sm font-bold uppercase tracking-wider">Mitteilungen aktivieren</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Nie wieder einen AI Pick verpassen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-gray-500 hover:text-white transition-colors p-1"
              >
                <X size={16} />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-300 leading-relaxed text-left">
              Erhalte Echtzeit-Push-Benachrichtigungen direkt auf deinen Sperrbildschirm, sobald ein neuer High-Yield AI Pick verfügbar ist.
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDismiss}
                disabled={isSubscribing}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors border border-white/5"
              >
                Später
              </button>
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={isSubscribing}
                className="flex-1 py-3 bg-tennis-lime text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(200,250,50,0.25)] hover:scale-[1.02] flex justify-center items-center"
              >
                {isSubscribing ? 'Laden...' : 'Jetzt aktivieren'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
