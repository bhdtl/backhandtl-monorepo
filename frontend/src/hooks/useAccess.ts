import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// SOTA: Erweitertes Subscription Model für das neue Pricing
export type SubscriptionTier = 'FREE' | 'WEEKEND' | 'ELITE' | 'PREMIUM' | 'ADMIN';

export function useAccess() {
  const { user } = useAuth();
  
  // State Management
  const [tier, setTier] = useState<SubscriptionTier>('FREE');
  const [role, setRole] = useState<string>('USER'); 
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // --- 1. THE FOUNDER SWITCH (Bulletproof Edition v3) ---
  const emailSafe = (user?.email ?? '').toLowerCase().trim();
  const isFounder = emailSafe === 'bh.dtl@web.de';

  // --- SOTA HILFSFUNKTION: KUGELSICHERER DATE PARSER FÜR IOS/SAFARI ---
  const parseSafeDate = (dateString: string | null | undefined) => {
      if (!dateString) return null;
      // Ersetzt das Leerzeichen durch ein 'T', damit Safari/iOS nicht abstürzt
      const safeString = dateString.replace(' ', 'T');
      const time = new Date(safeString).getTime();
      return isNaN(time) ? null : time;
  };

  // --- 2. DATA FETCHER & TIME-LOCK ENGINE ---
  const refreshAccess = useCallback(async () => {
    if (!user) {
      setTier('FREE');
      setRole('USER');
      setCredits(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('tier, credits, role, premium_until, special_badge') 
        .eq('id', user.id)
        .single();

      if (data) {
        let dbTier = (data.tier || 'FREE').toString().toUpperCase().trim();
        const expiryDate = data.premium_until;
        const isAdminRole = data.role === 'admin' || data.role === 'ADMIN' || data.special_badge === 'ADMIN';

        // THE TIME-LOCK: Ablaufdatum prüfen (mit sicherem Safari-Parser)
        let isExpired = false;
        const expiryTime = parseSafeDate(expiryDate);
        if (expiryTime) {
           const now = new Date().getTime();
           if (expiryTime < now) {
               isExpired = true;
           }
        }

        // Degradierungs-Logik: Wenn abgelaufen und kein Admin/Founder -> Zurück auf FREE
        if (isExpired && !isAdminRole && !isFounder) {
            console.warn("Local Auth Check: Subscription has expired. Downgrading to FREE.");
            dbTier = 'FREE';
        }

        // Fallback: Falls ein ungültiger Wert in der DB steht
        if (!['FREE', 'WEEKEND', 'ELITE', 'PREMIUM', 'ADMIN'].includes(dbTier)) {
            dbTier = 'FREE';
        }
        
        setTier(dbTier as SubscriptionTier);
        setCredits(data.credits ?? 0);
        setRole(data.role || 'USER'); 
      }
      
      if (error && error.code !== 'PGRST116') {
          console.error("Access Fetch Error:", error);
      }
    } catch (e) {
      console.error("Critical Access Error:", e);
    } finally {
      setLoading(false);
    }
  }, [user, isFounder]);

  // --- 3. REALTIME SYNC ---
  useEffect(() => {
    refreshAccess();

    if (!user) return;

    const channel = supabase
      .channel(`profile_changes_${user.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'profiles', 
          filter: `id=eq.${user.id}` 
        },
        (payload) => {
          const newData = payload.new;
          if (newData) {
            // 🚀 THE FIX: Verhindert das "Phantom Downgrade" durch partielle Payloads
            if (newData.tier !== undefined) {
                let dbTier = (newData.tier || 'FREE').toString().toUpperCase().trim();
                const isAdminRole = newData.role === 'admin' || newData.role === 'ADMIN' || newData.special_badge === 'ADMIN';

                // 🚀 SOTA FIX: Wir prüfen das Ablaufdatum NUR, wenn es auch wirklich im Payload enthalten ist!
                // Wenn es nicht enthalten ist, vertrauen wir dem initialen Check von refreshAccess()
                if (newData.premium_until !== undefined) {
                    let isExpired = false;
                    const expiryTime = parseSafeDate(newData.premium_until);
                    if (expiryTime) {
                       if (expiryTime < new Date().getTime()) {
                           isExpired = true;
                       }
                    }

                    if (isExpired && !isAdminRole && !isFounder) {
                        dbTier = 'FREE';
                    }
                }

                if (!['FREE', 'WEEKEND', 'ELITE', 'PREMIUM', 'ADMIN'].includes(dbTier)) {
                    dbTier = 'FREE';
                }
                
                setTier(dbTier as SubscriptionTier);
            }
            
            // Andere Felder nur updaten, wenn sie im Payload existieren
            if (newData.credits !== undefined) setCredits(newData.credits ?? 0);
            if (newData.role !== undefined) setRole(newData.role || 'USER');
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, refreshAccess, isFounder]);

  // --- 4. LOGIC GATES ---
  
  // A) ADMIN STATUS
  const isAdmin = isFounder || role === 'ADMIN' || role === 'admin';

  // B) ELITE STATUS (Paywall Gatekeeper)
  const isElite = isAdmin || tier === 'WEEKEND' || tier === 'ELITE' || tier === 'PREMIUM' || tier === 'ADMIN';
  
  // C) FREE STATUS
  const isFree = !isElite;

  return {
    isElite,   
    isFree,    
    isAdmin,   
    isFounder, 
    
    // Daten für UI & MemberCard
    credits: isElite ? 9999 : credits,
    userTier: isAdmin ? 'ADMIN' : tier, 
    
    refreshAccess, 
    loading
  };
}