import { useTranslation } from 'react-i18next';
import { getSupportedLanguages, changeLanguage, getCurrentLanguage } from '../i18n';

export const useI18n = () => {
  const { t, i18n } = useTranslation();

  const switchLanguage = async (languageCode: string) => {
    try {
      await changeLanguage(languageCode);
      // Store the selected language in localStorage
      localStorage.setItem('i18nextLng', languageCode);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const getLanguageInfo = (code: string) => {
    const languages = getSupportedLanguages();
    return languages.find(lang => lang.code === code);
  };

  const isRTL = () => {
    return getCurrentLanguage() === 'ar';
  };

  return {
    t,
    currentLanguage: getCurrentLanguage(),
    supportedLanguages: getSupportedLanguages(),
    switchLanguage,
    getLanguageInfo,
    isRTL,
    i18n,
  };
};

export default useI18n;