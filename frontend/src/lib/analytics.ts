import { supabase } from './supabase';

/**
 * Silicon Valley Grade Tracker
 * Geschützt gegen Abstürze, damit die App niemals wegen Analytics stehen bleibt.
 */
export const trackEvent = async (eventName: string, metadata: object = {}) => {
  try {
    // 1. Session prüfen (ohne zu warten, falls es klemmt)
    const { data: { session } } = await supabase.auth.getSession();
    
    // 2. Event senden
    const { error } = await supabase.from('user_events').insert([
      {
        user_id: session?.user?.id || null,
        event_name: eventName,
        metadata: metadata
      }
    ]);

    if (error) {
       // Wir loggen es nur als Warnung, damit die App nicht crasht
       console.warn(`Analytics (${eventName}) skipped:`, error.message);
    }
  } catch (error) {
    // Absoluter Schutz: Fehler in Analytics dürfen niemals den Main-Thread stoppen
    console.warn('Analytics engine background error:', error);
  }
};