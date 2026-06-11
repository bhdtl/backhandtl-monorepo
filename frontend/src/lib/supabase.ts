import { createClient } from '@supabase/supabase-js';
import { safeLocalStorage } from './storage';

// WICHTIG: Hier deine ECHTEN Daten fest eintragen, da Bolt die .env vergisst.
// Diese Keys kommen aus deinem Supabase Dashboard -> Project Settings -> API
const SUPABASE_URL = 'https://suoaznisiowoolxilaju.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b2F6bmlzaW93b29seGlsYWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNzAwNjIsImV4cCI6MjA4MTczMDA2Mn0.4fh5Unx9Gkd_NPrPnc5O8B6edkipbGnUeAIATHFnyaE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: safeLocalStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// In-memory cache for historical match data to prevent redundant large queries
export const matchDataCache: Record<string, any> = {};