import { useTranslation } from 'react-i18next';
import 'flag-icons/css/flag-icons.min.css';

const languages = [
  { code: 'en', flag: 'gb', name: 'English' },
  { code: 'es', flag: 'es', name: 'Español' },
  { code: 'fr', flag: 'fr', name: 'Français' },
  { code: 'de', flag: 'de', name: 'Deutsch' },
  { code: 'it', flag: 'it', name: 'Italiano' },
];

export function LanguageSelector() {
  const { i18n } = useTranslation();

  return (
    <div className="flex justify-center gap-1 py-2 mb-2"> 
      {/* gap-1 (statt 2) und weniger padding */}
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
          className={`
            p-1.5 rounded-md transition-all duration-200 
            ${i18n.language === lang.code 
              ? 'bg-tennis-lime/20 text-tennis-lime ring-1 ring-tennis-lime/50 opacity-100 scale-105' 
              : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 opacity-50 hover:opacity-100'}
          `}
          title={lang.name}
        >
          {/* Kleinere Flaggen (text-base statt text-xl) */}
          <span className={`fi fi-${lang.flag} text-base rounded-[2px] block`} />
        </button>
      ))}
    </div>
  );
}