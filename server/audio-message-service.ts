import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

interface AudioProcessingResult {
  success: boolean;
  audioBuffer?: Buffer;
  originalAudio?: Buffer;
  transcription?: string;
  translation?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  processingTime?: number;
  error?: string;
}

interface TranslationResponse {
  original_text: string;
  translated_text: string;
  source_language: string;
  target_language: string;
  processing_time: number;
}

interface STTResponse {
  text: string;
  language?: string;
  confidence?: number;
}

interface TTSResponse {
  audio_data?: string; // base64 encoded audio
  message?: string;
  error?: string;
}

class AudioMessageService {
  private whisperUrl: string;
  private coquiUrl: string;
  private m2m100Url: string;

  constructor() {
    this.whisperUrl = process.env.WHISPER_STT_SERVER_URL || 'http://127.0.0.1:5001';
    this.coquiUrl = process.env.COQUI_TTS_SERVER_URL || 'http://localhost:5002';
    this.m2m100Url = process.env.M2M100_SERVER_URL || 'http://localhost:5003';
  }

  /**
   * Process audio message with STT, translation, and TTS pipeline
   */
  async processAudioMessage(
    audioBuffer: Buffer,
    senderLanguage: string,
    recipientLanguage: string,
    filename: string = 'audio.wav'
  ): Promise<AudioProcessingResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🎵 Processing audio message: ${senderLanguage} -> ${recipientLanguage}`);
      
      // Step 1: Speech-to-Text (STT) using Whisper
      console.log('📝 Step 1: Transcribing audio...');
      const transcriptionResult = await this.transcribeAudio(audioBuffer, filename);
      
      if (!transcriptionResult.success || !transcriptionResult.text) {
        return {
          success: false,
          error: 'Failed to transcribe audio',
          originalAudio: audioBuffer
        };
      }

      const transcription = transcriptionResult.text;
      const detectedLanguage = transcriptionResult.language || senderLanguage;
      
      console.log(`📝 Transcription: "${transcription}" (${detectedLanguage})`);

      // Step 2: Check if translation is needed
      const needsTranslation = this.normalizeLanguageCode(detectedLanguage) !== 
                              this.normalizeLanguageCode(recipientLanguage);
      
      if (!needsTranslation) {
        console.log('✅ Same language detected, returning original audio');
        return {
          success: true,
          audioBuffer: audioBuffer,
          originalAudio: audioBuffer,
          transcription,
          sourceLanguage: detectedLanguage,
          targetLanguage: recipientLanguage,
          processingTime: Date.now() - startTime
        };
      }

      // Step 3: Translate text using M2M100
      console.log('🌐 Step 2: Translating text...');
      const translationResult = await this.translateText(
        transcription,
        detectedLanguage,
        recipientLanguage
      );
      
      if (!translationResult.success || !translationResult.translatedText) {
        console.log('⚠️ Translation failed, returning original audio');
        return {
          success: true,
          audioBuffer: audioBuffer,
          originalAudio: audioBuffer,
          transcription,
          sourceLanguage: detectedLanguage,
          targetLanguage: recipientLanguage,
          processingTime: Date.now() - startTime
        };
      }

      const translatedText = translationResult.translatedText;
      console.log(`🌐 Translation: "${translatedText}"`);

      // Step 4: Text-to-Speech (TTS) using Coqui
      console.log('🔊 Step 3: Generating speech...');
      const ttsResult = await this.synthesizeSpeech(translatedText, recipientLanguage);
      
      if (!ttsResult.success || !ttsResult.audioBuffer) {
        console.log('⚠️ TTS failed, returning original audio');
        return {
          success: true,
          audioBuffer: audioBuffer,
          originalAudio: audioBuffer,
          transcription,
          translation: translatedText,
          sourceLanguage: detectedLanguage,
          targetLanguage: recipientLanguage,
          processingTime: Date.now() - startTime
        };
      }

      const processingTime = Date.now() - startTime;
      console.log(`✅ Audio processing completed in ${processingTime}ms`);
      
      return {
        success: true,
        audioBuffer: ttsResult.audioBuffer,
        originalAudio: audioBuffer,
        transcription,
        translation: translatedText,
        sourceLanguage: detectedLanguage,
        targetLanguage: recipientLanguage,
        processingTime
      };
      
    } catch (error) {
      console.error('❌ Audio processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        originalAudio: audioBuffer,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Transcribe audio using Whisper STT
   */
  private async transcribeAudio(audioBuffer: Buffer, filename: string): Promise<{
    success: boolean;
    text?: string;
    language?: string;
    error?: string;
  }> {
    try {
      const formData = new FormData();
      formData.append('audio', audioBuffer, {
        filename,
        contentType: 'audio/wav'
      });

      const response = await axios.post(`${this.whisperUrl}/api/stt`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000 // 30 seconds timeout
      });

      const result: STTResponse = response.data;
      
      return {
        success: true,
        text: result.text,
        language: result.language
      };
      
    } catch (error) {
      console.error('Whisper STT error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'STT failed'
      };
    }
  }

  /**
   * Translate text using M2M100
   */
  private async translateText(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<{
    success: boolean;
    translatedText?: string;
    error?: string;
  }> {
    try {
      const response = await axios.post(`${this.m2m100Url}/api/translate`, {
        text,
        source_language: this.normalizeLanguageCode(sourceLanguage),
        target_language: this.normalizeLanguageCode(targetLanguage)
      }, {
        timeout: 30000 // 30 seconds timeout
      });

      const result: TranslationResponse = response.data;
      
      return {
        success: true,
        translatedText: result.translated_text
      };
      
    } catch (error) {
      console.error('M2M100 translation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Translation failed'
      };
    }
  }

  /**
   * Synthesize speech using Coqui TTS
   */
  private async synthesizeSpeech(text: string, language: string): Promise<{
    success: boolean;
    audioBuffer?: Buffer;
    error?: string;
  }> {
    try {
      const response = await axios.post(`${this.coquiUrl}/api/tts`, {
        text,
        language: this.normalizeLanguageCode(language),
        speaker_id: 0 // Default speaker
      }, {
        timeout: 30000 // 30 seconds timeout
      });

      const result: TTSResponse = response.data;
      
      if (result.audio_data) {
        const audioBuffer = Buffer.from(result.audio_data, 'base64');
        return {
          success: true,
          audioBuffer
        };
      } else {
        return {
          success: false,
          error: result.error || 'No audio data received'
        };
      }
      
    } catch (error) {
      console.error('Coqui TTS error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'TTS failed'
      };
    }
  }

  /**
   * Normalize language codes for consistency
   */
  private normalizeLanguageCode(language: string): string {
    const langMap: { [key: string]: string } = {
      'english': 'en',
      'spanish': 'es',
      'portuguese': 'pt',
      'french': 'fr',
      'german': 'de',
      'italian': 'it',
      'russian': 'ru',
      'chinese': 'zh',
      'japanese': 'ja',
      'korean': 'ko',
      'arabic': 'ar',
      'hindi': 'hi',
      'turkish': 'tr',
      'dutch': 'nl',
      'polish': 'pl',
      'swedish': 'sv',
      'danish': 'da',
      'norwegian': 'no',
      'finnish': 'fi',
      'czech': 'cs',
      'hungarian': 'hu',
      'romanian': 'ro',
      'bulgarian': 'bg',
      'croatian': 'hr',
      'slovak': 'sk',
      'slovenian': 'sl',
      'estonian': 'et',
      'latvian': 'lv',
      'lithuanian': 'lt',
      'maltese': 'mt',
      'irish': 'ga',
      'welsh': 'cy',
      'basque': 'eu',
      'catalan': 'ca',
      'galician': 'gl',
      'icelandic': 'is',
      'macedonian': 'mk',
      'albanian': 'sq',
      'serbian': 'sr',
      'bosnian': 'bs',
      'montenegrin': 'me',
      'luxembourgish': 'lb'
    };

    const normalized = language.toLowerCase().trim();
    
    // Return mapped language or original if already a code
    return langMap[normalized] || normalized.split('-')[0] || 'en';
  }

  /**
   * Check if all services are available
   */
  async checkServicesHealth(): Promise<{
    whisper: boolean;
    coqui: boolean;
    m2m100: boolean;
    allHealthy: boolean;
  }> {
    const results = {
      whisper: false,
      coqui: false,
      m2m100: false,
      allHealthy: false
    };

    try {
      // Check Whisper STT
      const whisperResponse = await axios.get(`${this.whisperUrl}/health`, { timeout: 5000 });
      results.whisper = whisperResponse.status === 200;
    } catch (error) {
      console.log('Whisper STT service not available');
    }

    try {
      // Check Coqui TTS
      const coquiResponse = await axios.get(`${this.coquiUrl}/health`, { timeout: 5000 });
      results.coqui = coquiResponse.status === 200;
    } catch (error) {
      console.log('Coqui TTS service not available');
    }

    try {
      // Check M2M100 Translation
      const m2m100Response = await axios.get(`${this.m2m100Url}/health`, { timeout: 5000 });
      results.m2m100 = m2m100Response.status === 200;
    } catch (error) {
      console.log('M2M100 Translation service not available');
    }

    results.allHealthy = results.whisper && results.coqui && results.m2m100;
    
    return results;
  }
}

export default AudioMessageService;
export { AudioProcessingResult };