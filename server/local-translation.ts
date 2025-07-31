import fetch from 'node-fetch';
import * as FormData from 'form-data';
import { Readable } from 'stream';

// Local translation service configuration
const M2M100_TRANSLATION_SERVER_URL = process.env.M2M100_TRANSLATION_SERVER_URL || 'http://127.0.0.1:5003';
const WHISPER_STT_SERVER_URL = process.env.WHISPER_STT_SERVER_URL || 'http://127.0.0.1:5001';
const COQUI_TTS_SERVER_URL = process.env.COQUI_TTS_SERVER_URL || 'http://127.0.0.1:5002';

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

export interface VoiceTranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  audioBuffer?: Buffer;
  timestamp: string;
}

// Language code mapping for M2M100
const LANGUAGE_MAP: { [key: string]: string } = {
  'pt-BR': 'pt',
  'pt-br': 'pt',
  'pt': 'pt',
  'en-US': 'en',
  'en-us': 'en',
  'en': 'en', 
  'es-ES': 'es',
  'es-es': 'es',
  'es': 'es',
  'fr-FR': 'fr',
  'fr-fr': 'fr',
  'fr': 'fr',
  'de-DE': 'de',
  'de-de': 'de',
  'de': 'de',
  'it-IT': 'it',
  'it-it': 'it',
  'it': 'it',
  'ja-JP': 'ja',
  'ja-jp': 'ja',
  'ja': 'ja',
  'ko-KR': 'ko',
  'ko-kr': 'ko',
  'ko': 'ko',
  'zh-CN': 'zh',
  'zh-cn': 'zh',
  'zh': 'zh',
  'ar-SA': 'ar',
  'ar-sa': 'ar',
  'ar': 'ar',
  'ru-RU': 'ru',
  'ru-ru': 'ru',
  'ru': 'ru',
  'hi-IN': 'hi',
  'hi-in': 'hi',
  'hi': 'hi',
  'tr': 'tr',
  'nl': 'nl'
};

export class LocalTranslationService {
  constructor() {
    console.log('[LocalTranslation] M2M100 Service initialized');
  }

  /**
   * Detect language using local M2M100 service
   */
  async detectLanguage(text: string): Promise<LanguageDetectionResult> {
    try {
      console.log(`[Detection] Detecting language for: "${text}"`);
      
      const response = await fetch(`${M2M100_TRANSLATION_SERVER_URL}/api/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Detection] Service error ${response.status}: ${errorText}`);
        throw new Error(`Language detection failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json() as any;
      console.log(`[Detection] API response:`, result);
      
      // Use the correct field from the API response
      const detectedLanguage = result.language || result.detected_language || 'en';
      const confidence = result.confidence || 0.8;
      
      console.log(`[Detection] Detected: ${detectedLanguage} (confidence: ${confidence})`);
      
      return {
        language: detectedLanguage,
        confidence: confidence
      };
    } catch (error) {
      console.error('[Detection] Language detection error:', error);
      console.log('[Detection] Falling back to heuristic detection');
      // Fallback language detection
      return this.fallbackLanguageDetection(text);
    }
  }

  /**
   * Translate text using local M2M100 service
   */
  async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<TranslationResult> {
    try {
      // Skip translation for emoji-only messages
      if (this.isEmojiOnly(text)) {
        console.log(`[Translation] Skipping emoji-only text: "${text}"`);
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
        console.log(`[Translation] Detected language: ${detectedSourceLang} (confidence: ${detection.confidence})`);
      }

      // Map language codes to M2M100 format
      const sourceM2M = LANGUAGE_MAP[detectedSourceLang || 'en'] || 'en';
      const targetM2M = LANGUAGE_MAP[targetLanguage] || 'en';

      // Skip translation if source and target are the same
      if (sourceM2M === targetM2M) {
        console.log(`[Translation] Same language detected (${sourceM2M}), skipping translation`);
        return {
          originalText: text,
          translatedText: text,
          sourceLanguage: detectedSourceLang || 'unknown',
          targetLanguage,
          confidence: 1.0
        };
      }

      console.log(`[Translation] Translating from ${detectedSourceLang} (${sourceM2M}) to ${targetLanguage} (${targetM2M})`);
      console.log(`[Translation] Original text: "${text}"`);

      const response = await fetch(`${M2M100_TRANSLATION_SERVER_URL}/api/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          source_language: sourceM2M,
          target_language: targetM2M,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Translation] Service error ${response.status}: ${errorText}`);
        throw new Error(`Translation failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json() as any;
      const translatedText = result.translated_text || text;
      
      console.log(`[Translation] Translated text: "${translatedText}"`);

      return {
        originalText: text,
        translatedText: translatedText,
        sourceLanguage: detectedSourceLang || 'unknown',
        targetLanguage: targetLanguage,
        confidence: result.confidence || 0.9
      };
    } catch (error) {
      console.error('[LocalTranslation] Translation error:', error);
      console.log(`[Translation] Returning original text due to error: "${text}"`);
      // Return original text if translation fails
      return {
        originalText: text,
        translatedText: text,
        sourceLanguage: sourceLanguage || 'en',
        targetLanguage: targetLanguage,
        confidence: 0.0
      };
    }
  }

  /**
   * Translate text with context (for compatibility with existing code)
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
    // M2M100 doesn't use context, so we just call regular translation
    return this.translateText(params.text, params.targetLanguage, params.sourceLanguage);
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
   * Transcribe audio using local Whisper service
   */
  async transcribeAudio(audioBuffer: Buffer, language?: string): Promise<{ text: string; language: string }> {
    try {
      const formData = new (FormData as any)();
      
      // Convert Buffer to Readable stream for form-data compatibility
      const audioStream = Readable.from(audioBuffer);
      formData.append('audio', audioStream, {
        filename: 'audio.wav',
        contentType: 'audio/wav',
      });
      
      if (language) {
        formData.append('language', language);
      }

      const response = await fetch(`${WHISPER_STT_SERVER_URL}/api/transcribe`, {
        method: 'POST',
        body: formData as any,
        headers: formData.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[STT] Service error ${response.status}: ${errorText}`);
        throw new Error(`STT failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json() as any;
      console.log(`[STT] Transcription result:`, result);
      
      return {
        text: result.text || '',
        language: result.language || 'en'
      };
    } catch (error) {
      console.error('[STT] Transcription error:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  /**
   * Synthesize speech using local Coqui TTS service
   */
  async synthesizeSpeech(text: string, language: string = 'en'): Promise<Buffer> {
    try {
      const mappedLanguage = LANGUAGE_MAP[language] || language;
      console.log(`[TTS] Synthesizing speech for text: "${text.substring(0, 50)}..." in language: ${language} -> ${mappedLanguage}`);
      
      const response = await fetch(`${COQUI_TTS_SERVER_URL}/api/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          language: mappedLanguage,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TTS] Service error ${response.status}: ${errorText}`);
        throw new Error(`TTS failed: ${response.status} - ${errorText}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      console.log(`[TTS] Successfully synthesized ${audioBuffer.length} bytes of audio`);
      return audioBuffer;
    } catch (error) {
      console.error('[TTS] Speech synthesis error:', error);
      throw new Error('Failed to synthesize speech');
    }
  }

  /**
   * Process voice message with complete STT -> Translation -> TTS pipeline
   */
  async processVoiceMessage(
    audioBuffer: Buffer,
    senderLanguage: string,
    receiverLanguage: string
  ): Promise<VoiceTranslationResult> {
    try {
      console.log(`[LocalTranslation] Processing voice message: ${senderLanguage} -> ${receiverLanguage}`);

      // Step 1: Transcribe audio
      const transcription = await this.transcribeAudio(audioBuffer, senderLanguage);
      console.log(`[LocalTranslation] Transcribed: "${transcription.text}"`);

      // Step 2: Check if translation is needed
      const needsTranslation = senderLanguage !== receiverLanguage;
      
      let translatedText = transcription.text;
      let finalAudioBuffer: Buffer | undefined;

      if (needsTranslation) {
        // Step 3: Translate text
        const translation = await this.translateText(
          transcription.text,
          receiverLanguage,
          senderLanguage
        );
        translatedText = translation.translatedText;
        console.log(`[LocalTranslation] Translated: "${translatedText}"`);

        // Step 4: Synthesize translated speech
        finalAudioBuffer = await this.synthesizeSpeech(translatedText, receiverLanguage);
        console.log(`[LocalTranslation] Synthesized audio for language: ${receiverLanguage}`);
      } else {
        // Same language - just return original transcription, optionally synthesize if needed
        console.log(`[LocalTranslation] Same language, no translation needed`);
        finalAudioBuffer = audioBuffer; // Use original audio
      }

      return {
        originalText: transcription.text,
        translatedText: translatedText,
        sourceLanguage: senderLanguage,
        targetLanguage: receiverLanguage,
        audioBuffer: finalAudioBuffer,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[LocalTranslation] Voice processing error:', error);
      throw error;
    }
  }

  /**
   * Check if text is emoji-only
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
    const hasEmoji = /[\uD83C-\uDBFF\uDC00-\uDFFF]|[\u2600-\u27FF]|[\u2B00-\u2BFF]|[\u3000-\u303F]|[\uFE00-\uFE0F]/.test(trimmedText);

    return hasEmoji && trimmedText.length > 0;
  }

  /**
   * Fallback language detection using simple heuristics
   */
  private fallbackLanguageDetection(text: string): LanguageDetectionResult {
    const lowerText = text.toLowerCase();

    // Portuguese patterns (including Brazilian Portuguese specific words)
    const portugueseWords = [
      'você', 'voce', 'não', 'nao', 'está', 'esta', 'para', 'com', 'uma', 'que', 'mais', 'seu', 'sua',
      'como', 'por', 'da', 'de', 'do', 'na', 'no', 'em', 'um', 'os', 'as', 'mas', 'ser', 'ter',
      'ola', 'olá', 'tudo', 'bem', 'bom', 'boa', 'noite', 'dia', 'obrigado', 'obrigada', 'família',
      'familia', 'adriel', 'prepara', 'todos', 'serviços', 'servicos', 'funcionarem', 'juntos'
    ];
    const ptScore = portugueseWords.reduce((score, word) => 
      score + (lowerText.includes(word) ? 1 : 0), 0);

    // English patterns
    const englishWords = [
      'the', 'and', 'you', 'that', 'was', 'for', 'are', 'with', 'his', 'they', 'have', 'this',
      'will', 'your', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time',
      'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such',
      'take', 'than', 'only', 'well', 'work', 'hello', 'friend', 'night', 'my'
    ];
    const enScore = englishWords.reduce((score, word) => 
      score + (lowerText.includes(word) ? 1 : 0), 0);

    // Spanish patterns
    const spanishWords = [
      'usted', 'está', 'que', 'con', 'para', 'más', 'como', 'pero', 'muy', 'el', 'la', 'en', 'es', 'por',
      'una', 'uno', 'los', 'las', 'del', 'ser', 'estar', 'tener', 'hacer', 'todo', 'bien', 'hola',
      'bueno', 'buena', 'noche', 'día', 'gracias', 'familia', 'amigo'
    ];
    const esScore = spanishWords.reduce((score, word) => 
      score + (lowerText.includes(word) ? 1 : 0), 0);

    // French patterns
    const frenchWords = [
      'vous', 'est', 'pour', 'avec', 'une', 'que', 'plus', 'comme', 'mais', 'très', 'le', 'la', 'de', 'et', 'dans',
      'les', 'des', 'être', 'avoir', 'faire', 'tout', 'bien', 'bonjour', 'bonne', 'nuit', 'jour', 'merci', 'famille', 'ami'
    ];
    const frScore = frenchWords.reduce((score, word) => 
      score + (lowerText.includes(word) ? 1 : 0), 0);

    const maxScore = Math.max(ptScore, enScore, esScore, frScore);
    const confidence = maxScore > 0 ? Math.min(maxScore / 8, 0.9) : 0.3;

    if (ptScore === maxScore && ptScore > 0) {
      return { language: 'pt', confidence };
    }
    if (enScore === maxScore && enScore > 0) {
      return { language: 'en', confidence };
    }
    if (esScore === maxScore && esScore > 0) {
      return { language: 'es', confidence };
    }
    if (frScore === maxScore && frScore > 0) {
      return { language: 'fr', confidence };
    }

    return { language: 'en', confidence: 0.5 };
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

export const localTranslationService = new LocalTranslationService();