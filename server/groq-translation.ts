import Groq from 'groq-sdk';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'gemma2-9b-it'; // Provide a default value

// Debug logging
console.log('[GroqTranslation] API Key loaded:', GROQ_API_KEY ? `${GROQ_API_KEY.substring(0, 10)}...` : 'NOT FOUND');
console.log('[GroqTranslation] Model:', GROQ_MODEL);

if (!GROQ_API_KEY) {
  console.error('[GroqTranslation] ERROR: GROQ_API_KEY is not set in environment variables');
  throw new Error('GROQ_API_KEY is required but not found in environment variables');
}

const groq = new Groq({
  apiKey: GROQ_API_KEY,
});

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

export class GroqTranslationService {
  private readonly TEMPERATURE = 0.1;
  private readonly MAX_TOKENS = 1000;

  constructor() {
    console.log('[GroqTranslation] Service initialized');
  }

  /**
   * Detect the language of a given text
   */
  async detectLanguage(text: string): Promise<LanguageDetectionResult> {
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a language detection expert. Analyze the given text and return the language code and confidence score. 
            Return ONLY a JSON object in this format: {"language": "pt-BR", "confidence": 0.95}
            Use these language codes: pt-BR (Portuguese), en-US (English), es-ES (Spanish), fr-FR (French), de-DE (German), it-IT (Italian), ja-JP (Japanese), ko-KR (Korean), zh-CN (Chinese), ar-SA (Arabic).`
          },
          {
            role: 'user',
            content: `Detect the language of this text: "${text}"`
          }
        ],
        model: GROQ_MODEL,
        temperature: this.TEMPERATURE,
        max_tokens: 500,
      });

      const result = completion.choices[0].message.content?.trim();
      if (result) {
        try {
          const parsed = JSON.parse(result);
          return {
            language: parsed.language || 'en-US',
            confidence: parsed.confidence || 0.5
          };
        } catch {
          // Fallback language detection
          return this.fallbackLanguageDetection(text);
        }
      }

      return this.fallbackLanguageDetection(text);
    } catch (error) {
      console.error('[GroqTranslation] Language detection error:', error);
      return this.fallbackLanguageDetection(text);
    }
  }

  /**
   * Translate text from one language to another
   */
  async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<TranslationResult> {
    try {
      // Skip translation for emoji-only messages
      if (this.isEmojiOnly(text)) {
        return {
          originalText: text,
          translatedText: text,
          sourceLanguage: sourceLanguage || 'unknown',
          targetLanguage,
          confidence: 1.0
        };
      }

      // Detect source language if not provided
      let detectedSourceLang = sourceLanguage;
      if (!sourceLanguage) {
        const detection = await this.detectLanguage(text);
        detectedSourceLang = detection.language;
      }

      // Skip translation if source and target are the same
      if (detectedSourceLang === targetLanguage) {
        return {
          originalText: text,
          translatedText: text,
          sourceLanguage: detectedSourceLang || 'unknown',
          targetLanguage,
          confidence: 1.0
        };
      }

      const sourceLanguageName = this.getLanguageName(detectedSourceLang || 'en-US');
      const targetLanguageName = this.getLanguageName(targetLanguage);

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a professional translator specializing in ${sourceLanguageName} to ${targetLanguageName} translation.
            Provide accurate, natural translations maintaining the original tone, context, and meaning.
            Return ONLY the translated text without explanations, quotes, or additional commentary.
            Preserve formatting, emoticons, and special characters when appropriate.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        model: GROQ_MODEL,
        temperature: this.TEMPERATURE,
        max_tokens: this.MAX_TOKENS,
      });

      const translatedText = completion.choices[0].message.content?.trim() || text;

      return {
        originalText: text,
        translatedText,
        sourceLanguage: detectedSourceLang || 'unknown',
        targetLanguage,
        confidence: 0.9 // Groq generally provides high-quality translations
      };

    } catch (error) {
      console.error('[GroqTranslation] Translation error:', error);

      // Return original text if translation fails
      return {
        originalText: text,
        translatedText: text,
        sourceLanguage: sourceLanguage || 'unknown',
        targetLanguage,
        confidence: 0.0
      };
    }
  }

  /**
   * Translate text with additional context for better accuracy
   */
  async translateWithContext(params: {
    text: string;
    targetLanguage: string;
    sourceLanguage?: string;
    context?: {
      conversationId?: string;
      senderId?: string;
      recipientId?: string;
      messageType?: string;
      previousMessages?: Array<{text: string, sender: string}>;
    };
  }): Promise<TranslationResult> {
    try {
      const { text, targetLanguage, sourceLanguage, context } = params;
      
      // Skip translation for emoji-only messages
      if (this.isEmojiOnly(text)) {
        return {
          originalText: text,
          translatedText: text,
          sourceLanguage: sourceLanguage || 'unknown',
          targetLanguage,
          confidence: 1.0
        };
      }
      
      let detectedSourceLang = sourceLanguage;
      if (!sourceLanguage) {
        const detection = await this.detectLanguage(text);
        detectedSourceLang = detection.language;
      }

      if (detectedSourceLang === targetLanguage) {
        return {
          originalText: text,
          translatedText: text,
          sourceLanguage: detectedSourceLang,
          targetLanguage,
          confidence: 1.0
        };
      }

      const sourceLanguageName = this.getLanguageName(detectedSourceLang || 'en-US');
      const targetLanguageName = this.getLanguageName(targetLanguage);
      
      // Format context for the translation prompt
      let contextString = '';
      if (context) {
        contextString = `Conversation ID: ${context.conversationId || 'N/A'}
`;
        if (context.messageType) {
          contextString += `Message Type: ${context.messageType}
`;
        }
        if (context.previousMessages && context.previousMessages.length > 0) {
          contextString += 'Previous messages:\n';
          context.previousMessages.forEach(msg => {
            contextString += `- ${msg.sender}: ${msg.text}\n`;
          });
        }
      }

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a professional translator specializing in ${sourceLanguageName} to ${targetLanguageName} translation.
      This is a message in a chat application similar to WhatsApp.
      
      Return ONLY the translated text without explanations, quotes, or additional commentary.
      Maintain the original meaning while adapting to the cultural context of the target language.
      Preserve emojis, formatting, and punctuation as much as possible.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        model: GROQ_MODEL,
        temperature: this.TEMPERATURE,
        max_tokens: this.MAX_TOKENS,
      });

      const translatedText = completion.choices[0].message.content?.trim() || text;

      return {
        originalText: text,
        translatedText,
        sourceLanguage: detectedSourceLang || 'unknown',
        targetLanguage,
        confidence: 0.95 // Higher confidence with context
      };

    } catch (error) {
      console.error('[GroqTranslation] Context translation error:', error);

      // Fallback to regular translation
      return this.translateText(params.text, params.targetLanguage, params.sourceLanguage);
    }
  }

  /**
   * Batch translate multiple texts
   */
  async translateBatch(
    texts: string[],
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<TranslationResult[]> {
    const promises = texts.map(text => 
      this.translateText(text, targetLanguage, sourceLanguage)
    );

    return Promise.all(promises);
  }

  /**
   * Convert language code to human-readable name
   */
  private getLanguageName(languageCode: string): string {
    const languageNames: Record<string, string> = {
      'pt-BR': 'Portuguese (Brazil)',
      'en-US': 'English',
      'es-ES': 'Spanish',
      'fr-FR': 'French',
      'de-DE': 'German',
      'it-IT': 'Italian',
      'ja-JP': 'Japanese',
      'ko-KR': 'Korean',
      'zh-CN': 'Chinese (Simplified)',
      'ar-SA': 'Arabic',
      'ru-RU': 'Russian',
      'hi-IN': 'Hindi',
    };

    return languageNames[languageCode] || 'English';
  }

  /**
   * Fallback language detection using simple patterns
   */
  private isEmojiOnly(text: string): boolean {
    const trimmedText = text.trim();
    
    if (!trimmedText) {
      return false;
    }
    
    // Check if text contains any alphabetic characters (letters, numbers, punctuation)
    const hasText = /[a-zA-Z0-9\u00C0-\u017F\u0400-\u04FF\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff.,!?;:"'()\[\]{}\-_+=<>@#$%^&*|\\~`]/.test(trimmedText);
    
    // If it has text characters, it's not emoji-only
    if (hasText) {
      return false;
    }
    
    // Check if it has emoji-like characters using basic emoji ranges
    // This covers most common emojis without using unicode flag
    const hasEmoji = /[\uD83C-\uDBFF\uDC00-\uDFFF]|[\u2600-\u27FF]|[\u2B00-\u2BFF]|[\u3000-\u303F]|[\uFE00-\uFE0F]/.test(trimmedText);
    
    return hasEmoji && trimmedText.length > 0;
  }

  private fallbackLanguageDetection(text: string): LanguageDetectionResult {
    const lowerText = text.toLowerCase();

    // Portuguese patterns
    const portugueseWords = ['você', 'não', 'está', 'para', 'com', 'uma', 'que', 'mais', 'seu', 'como', 'por', 'da', 'de', 'do', 'na', 'no'];
    const ptScore = portugueseWords.reduce((score, word) => 
      score + (lowerText.includes(word) ? 1 : 0), 0);

    // Spanish patterns
    const spanishWords = ['usted', 'está', 'para', 'con', 'una', 'que', 'más', 'como', 'pero', 'muy', 'el', 'la', 'en', 'es', 'por'];
    const esScore = spanishWords.reduce((score, word) => 
      score + (lowerText.includes(word) ? 1 : 0), 0);

    // French patterns
    const frenchWords = ['vous', 'est', 'pour', 'avec', 'une', 'que', 'plus', 'comme', 'mais', 'très', 'le', 'la', 'de', 'et', 'dans'];
    const frScore = frenchWords.reduce((score, word) => 
      score + (lowerText.includes(word) ? 1 : 0), 0);

    const maxScore = Math.max(ptScore, esScore, frScore);
    const confidence = maxScore > 0 ? Math.min(maxScore / 5, 0.8) : 0.3;

    if (ptScore === maxScore && ptScore > 0) {
      return { language: 'pt-BR', confidence };
    }
    if (esScore === maxScore && esScore > 0) {
      return { language: 'es-ES', confidence };
    }
    if (frScore === maxScore && frScore > 0) {
      return { language: 'fr-FR', confidence };
    }

    return { language: 'en-US', confidence: 0.5 };
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): Array<{ code: string; name: string; flag: string }> {
    return [
      { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
      { code: 'en-US', name: 'English', flag: '🇺🇸' },
      { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
      { code: 'fr-FR', name: 'Français', flag: '🇫🇷' },
      { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪' },
      { code: 'it-IT', name: 'Italiano', flag: '🇮🇹' },
      { code: 'ja-JP', name: '日本語', flag: '🇯🇵' },
      { code: 'ko-KR', name: '한국어', flag: '🇰🇷' },
      { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
      { code: 'ar-SA', name: 'العربية', flag: '🇸🇦' },
    ];
  }
}

export const groqTranslationService = new GroqTranslationService();