import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Importiere deine Übersetzungs-Dateien
import en from '../locales/en.json';
import de from '../locales/de.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import it from '../locales/it.json';

// SOTA Upgrade: Clear legacy forced English cache once to allow browser auto-detection to fire
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const detectedOnce = window.localStorage.getItem('bh_i18n_detected_v1');
    if (!detectedOnce) {
      window.localStorage.removeItem('i18nextLng');
      window.localStorage.setItem('bh_i18n_detected_v1', 'true');
    }
  }
} catch (e) {
  console.warn('LocalStorage not accessible for i18n init');
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      de: { translation: de },
      es: { translation: es },
      fr: { translation: fr },
      it: { translation: it },
    },
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;