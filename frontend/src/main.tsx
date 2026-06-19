import './lib/i18n'; // Ganz oben hinzufügen
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css'; // <--- DIESE ZEILE IST ENTSCHEIDEND!

// Service Worker aufräumen (nur einmalig nötig, aber schadet nicht)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[Service Worker] Registered successfully:', reg.scope))
      .catch(err => console.error('[Service Worker] Registration failed:', err));
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
// Trigger Vercel rebuild to restore pre-chatbot deployment state