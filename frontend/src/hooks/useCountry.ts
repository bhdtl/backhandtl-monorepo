import { useState, useEffect } from 'react';
import { safeSessionStorage } from '../lib/storage';

export function useCountry() {
  const [country, setCountry] = useState<string>(() => {
    return safeSessionStorage.getItem('bh_user_country') || '';
  });
  const [loading, setLoading] = useState(!country);

  useEffect(() => {
    if (country) return;

    const detectCountry = async () => {
      try {
        // Try Vercel API endpoint first
        const res = await fetch('/api/country');
        if (res.ok) {
          const data = await res.json();
          if (data.country) {
            const detected = data.country.toUpperCase();
            setCountry(detected);
            safeSessionStorage.setItem('bh_user_country', detected);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Vercel country lookup failed, trying backup...', err);
      }

      // Localhost/dev fallback or backup lookup
      try {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          // Dev default to DE to test the NeoBet overlay easily
          setCountry('DE');
          safeSessionStorage.setItem('bh_user_country', 'DE');
          setLoading(false);
          return;
        }

        const resBackup = await fetch('https://ipapi.co/json/');
        if (resBackup.ok) {
          const data = await resBackup.json();
          if (data.country_code) {
            const code = data.country_code.toUpperCase();
            setCountry(code);
            safeSessionStorage.setItem('bh_user_country', code);
            setLoading(false);
            return;
          }
        }
      } catch (backupErr) {
        console.warn('Backup country lookup failed:', backupErr);
      }

      // Final fallback based on browser language or US
      const lang = navigator.language || '';
      const fallback = lang.toLowerCase().includes('de') || lang.toLowerCase().includes('at') ? 'DE' : 'US';
      setCountry(fallback);
      safeSessionStorage.setItem('bh_user_country', fallback);
      setLoading(false);
    };

    detectCountry();
  }, [country]);

  return { country, loading };
}
