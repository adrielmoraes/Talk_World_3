import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import en from './locales/en.json';
import zh from './locales/zh.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';
import ar from './locales/ar.json';

const resources = {
  en: { translation: en },
  zh: { translation: zh },
  es: { translation: es },
  fr: { translation: fr },
  pt: { translation: pt },
  ar: { translation: ar },
};

// Language mapping for system language detection
const languageMap: { [key: string]: string } = {
  'en': 'en',
  'en-US': 'en',
  'en-GB': 'en',
  'zh': 'zh',
  'zh-CN': 'zh',
  'zh-TW': 'zh',
  'es': 'es',
  'es-ES': 'es',
  'es-MX': 'es',
  'fr': 'fr',
  'fr-FR': 'fr',
  'fr-CA': 'fr',
  'pt': 'pt',
  'pt-BR': 'pt',
  'pt-PT': 'pt',
  'ar': 'ar',
  'ar-SA': 'ar',
  'ar-EG': 'ar',
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      convertDetectedLanguage: (lng: string) => {
        // Map detected language to supported language
        return languageMap[lng] || languageMap[lng.split('-')[0]] || 'en';
      },
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false,
    },
    
    // Supported languages
    supportedLngs: ['en', 'zh', 'es', 'fr', 'pt', 'ar'],
    nonExplicitSupportedLngs: true,
  });

export default i18n;

// Export utility functions
export const getSupportedLanguages = () => [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
];

export const changeLanguage = (lng: string) => {
  return i18n.changeLanguage(lng);
};

export const getCurrentLanguage = () => {
  return i18n.language;
};

// Language configuration
export const supportedLanguages = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
];

export const getLanguageByCode = (code: string) => {
  return supportedLanguages.find(lang => lang.code === code) || supportedLanguages[0];
};