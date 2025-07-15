import { useCallback, useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence?: number;
}

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
}

export interface SupportedLanguage {
  code: string;
  name: string;
  flag: string;
}

export function useTranslation() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  // Get supported languages
  const { data: supportedLanguages, isLoading: isLoadingLanguages } = useQuery({
    queryKey: ['/api/translation/languages'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Translate text
  const translateText = useCallback(async (
    text: string,
    targetLanguage: string,
    sourceLanguage?: string,
    context?: string
  ): Promise<TranslationResult | null> => {
    if (!text.trim()) return null;

    setIsTranslating(true);
    setTranslationError(null);

    try {
      const response = await apiRequest('POST', '/api/translation/translate', {
        text: text.trim(),
        targetLanguage,
        sourceLanguage,
        context,
      });

      const result = await response.json();
      return result.translation;
    } catch (error) {
      console.error('Translation error:', error);
      setTranslationError('Falha na tradução. Tente novamente.');
      return null;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Detect language
  const detectLanguage = useCallback(async (
    text: string
  ): Promise<LanguageDetectionResult | null> => {
    if (!text.trim()) return null;

    try {
      const response = await apiRequest('POST', '/api/translation/detect', {
        text: text.trim(),
      });

      const result = await response.json();
      return result.detection;
    } catch (error) {
      console.error('Language detection error:', error);
      return null;
    }
  }, []);

  // Batch translate multiple texts
  const translateBatch = useCallback(async (
    texts: string[],
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<TranslationResult[]> => {
    if (texts.length === 0) return [];

    setIsTranslating(true);
    setTranslationError(null);

    try {
      const response = await apiRequest('POST', '/api/translation/batch', {
        texts: texts.filter(text => text.trim()),
        targetLanguage,
        sourceLanguage,
      });

      const result = await response.json();
      return result.translations;
    } catch (error) {
      console.error('Batch translation error:', error);
      setTranslationError('Falha na tradução em lote. Tente novamente.');
      return [];
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Auto-translate text if different from target language
  const autoTranslate = useCallback(async (
    text: string,
    targetLanguage: string,
    context?: string
  ): Promise<TranslationResult | null> => {
    // First detect the language
    const detection = await detectLanguage(text);
    
    if (!detection) return null;

    // Skip translation if already in target language
    if (detection.language === targetLanguage) {
      return {
        originalText: text,
        translatedText: text,
        sourceLanguage: detection.language,
        targetLanguage,
        confidence: 1.0,
      };
    }

    // Translate if different language
    return translateText(text, targetLanguage, detection.language, context);
  }, [detectLanguage, translateText]);

  // Get language name by code
  const getLanguageName = useCallback((languageCode: string): string => {
    const language = supportedLanguages?.languages?.find(
      (lang: SupportedLanguage) => lang.code === languageCode
    );
    return language?.name || languageCode;
  }, [supportedLanguages]);

  // Get language flag by code
  const getLanguageFlag = useCallback((languageCode: string): string => {
    const language = supportedLanguages?.languages?.find(
      (lang: SupportedLanguage) => lang.code === languageCode
    );
    return language?.flag || '🌐';
  }, [supportedLanguages]);

  // Check if translation is available for language pair
  const isTranslationSupported = useCallback((
    sourceLanguage: string,
    targetLanguage: string
  ): boolean => {
    const supportedCodes = supportedLanguages?.languages?.map(
      (lang: SupportedLanguage) => lang.code
    ) || [];
    
    return supportedCodes.includes(sourceLanguage) && 
           supportedCodes.includes(targetLanguage);
  }, [supportedLanguages]);

  return {
    // Translation functions
    translateText,
    detectLanguage,
    translateBatch,
    autoTranslate,
    
    // Helper functions
    getLanguageName,
    getLanguageFlag,
    isTranslationSupported,
    
    // State
    isTranslating,
    translationError,
    supportedLanguages: supportedLanguages?.languages || [],
    isLoadingLanguages,
    
    // Actions
    clearError: () => setTranslationError(null),
  };
}