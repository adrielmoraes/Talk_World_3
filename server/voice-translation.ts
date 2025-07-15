import OpenAI from 'openai';
import FormData from 'form-data';
import { Readable } from 'stream';
import { groqTranslationService } from './groq-translation';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = process.env.OPENAI_API_URL;
const WHISPER_MODEL = process.env.WHISPER_MODEL || 'whisper-1';
const COQUI_TTS_API_URL = process.env.COQUI_TTS_API_URL;
const COQUI_TTS_MODEL = process.env.COQUI_TTS_MODEL || 'tts_models/multilingual/multi-dataset/xtts_v2';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = process.env.ELEVENLABS_API_URL;

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required in environment variables');
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  baseURL: OPENAI_API_URL,
});

export interface VoiceTranslationChunk {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: number;
  userId: number;
  conversationId: number;
}

export class VoiceTranslationService {
  private audioChunks: Map<string, Buffer[]> = new Map();
  private chunkTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly CHUNK_DURATION = 3000; // 3 seconds
  private readonly OVERLAP_DURATION = 500; // 0.5 seconds overlap

  constructor() {
    console.log('[VoiceTranslation] Service initialized');
  }

  /**
   * Process audio chunk from WebRTC stream
   */
  async processAudioChunk(
    audioBuffer: Buffer,
    userId: number,
    conversationId: number,
    targetLanguage: string = 'en-US'
  ): Promise<VoiceTranslationChunk | null> {
    try {
      const chunkKey = `${userId}_${conversationId}`;

      // Initialize chunk storage for this user/conversation
      if (!this.audioChunks.has(chunkKey)) {
        this.audioChunks.set(chunkKey, []);
      }

      // Add audio chunk to buffer
      const chunks = this.audioChunks.get(chunkKey)!;
      chunks.push(audioBuffer);

      // Clear existing timer
      if (this.chunkTimers.has(chunkKey)) {
        clearTimeout(this.chunkTimers.get(chunkKey)!);
      }

      // Set timer to process accumulated chunks
      const timer = setTimeout(async () => {
        await this.processAccumulatedChunks(chunkKey, userId, conversationId, targetLanguage);
      }, this.CHUNK_DURATION);

      this.chunkTimers.set(chunkKey, timer);

      return null; // Return null for intermediate chunks
    } catch (error) {
      console.error('[VoiceTranslation] Error processing audio chunk:', error);
      return null;
    }
  }

  /**
   * Process accumulated audio chunks for transcription and translation
   */
  private async processAccumulatedChunks(
    chunkKey: string,
    userId: number,
    conversationId: number,
    targetLanguage: string
  ): Promise<VoiceTranslationChunk | null> {
    try {
      const chunks = this.audioChunks.get(chunkKey);
      if (!chunks || chunks.length === 0) {
        return null;
      }

      // Combine audio chunks into a single buffer
      const combinedBuffer = Buffer.concat(chunks);

      // Clear chunks for next batch (keep some overlap)
      const overlapChunks = chunks.slice(-1); // Keep last chunk for overlap
      this.audioChunks.set(chunkKey, overlapChunks);

      // Create WAV header for the audio buffer
      const wavBuffer = this.createWavBuffer(combinedBuffer);

      // Transcribe audio using Whisper
      const transcription = await this.transcribeAudio(wavBuffer);

      if (!transcription || transcription.trim().length === 0) {
        return null;
      }

      console.log('[VoiceTranslation] Transcribed:', transcription);

      // Use Groq API for language detection and translation
      const translation = await groqTranslationService.translateText(
        transcription,
        targetLanguage
      );

      return {
        originalText: translation.originalText,
        translatedText: translation.translatedText,
        sourceLanguage: translation.sourceLanguage,
        targetLanguage: translation.targetLanguage,
        timestamp: Date.now(),
        userId,
        conversationId,
      };

    } catch (error) {
      console.error('[VoiceTranslation] Error processing accumulated chunks:', error);
      return null;
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper
   */
  private async transcribeAudio(audioBuffer: Buffer): Promise<string | null> {
    try {
      // Create a readable stream from buffer
      const audioStream = new Readable({
        read() {
          this.push(audioBuffer);
          this.push(null);
        }
      });

      // Add required properties for OpenAI API
      (audioStream as any).path = 'audio.wav';

      const transcription = await openai.audio.transcriptions.create({
        file: audioStream as any,
        model: 'whisper-1',
        response_format: 'text',
        language: 'auto', // Auto-detect language
      });

      return transcription || null;
    } catch (error) {
      console.error('[VoiceTranslation] Whisper transcription error:', error);
      return null;
    }
  }

  /**
   * Create WAV buffer with proper headers
   */
  private createWavBuffer(pcmBuffer: Buffer): Buffer {
    const sampleRate = 16000; // 16kHz
    const channels = 1; // Mono
    const bitsPerSample = 16;

    const byteRate = sampleRate * channels * bitsPerSample / 8;
    const blockAlign = channels * bitsPerSample / 8;
    const dataSize = pcmBuffer.length;
    const fileSize = 36 + dataSize;

    const header = Buffer.alloc(44);

    // RIFF header
    header.write('RIFF', 0);
    header.writeUInt32LE(fileSize, 4);
    header.write('WAVE', 8);

    // fmt chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // fmt chunk size
    header.writeUInt16LE(1, 20); // PCM format
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);

    // data chunk
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmBuffer]);
  }



  /**
   * Generate speech from text using Coqui TTS
   */
  async generateSpeech(text: string, language: string = 'en-US'): Promise<Buffer | null> {
    try {
      console.log(`[VoiceTranslation] Generating speech for: "${text}" in ${language}`);

      // Get the Coqui TTS server URL from environment variables or use default
      const coquiServerUrl = process.env.COQUI_TTS_SERVER_URL || 'http://localhost:5002';

      // Map language codes to Coqui TTS compatible language/speaker IDs
      const languageMap: Record<string, { language: string; speaker?: string }> = {
        'en-US': { language: 'en', speaker: 'p225' },
        'en-GB': { language: 'en', speaker: 'p226' },
        'pt-BR': { language: 'pt', speaker: 'p227' },
        'pt-PT': { language: 'pt', speaker: 'p228' },
        'es-ES': { language: 'es', speaker: 'p229' },
        'es-MX': { language: 'es', speaker: 'p230' },
        'fr-FR': { language: 'fr', speaker: 'p231' },
        'fr-CA': { language: 'fr', speaker: 'p232' },
        'de-DE': { language: 'de', speaker: 'p233' },
        'it-IT': { language: 'it', speaker: 'p234' },
        'ja-JP': { language: 'ja', speaker: 'p235' },
        'ko-KR': { language: 'ko', speaker: 'p236' },
        'zh-CN': { language: 'zh-cn', speaker: 'p237' },
        'zh-TW': { language: 'zh-tw', speaker: 'p238' },
        'ru-RU': { language: 'ru', speaker: 'p239' },
        'ar-SA': { language: 'ar', speaker: 'p240' },
        'hi-IN': { language: 'hi', speaker: 'p241' },
        'th-TH': { language: 'th', speaker: 'p242' },
        'vi-VN': { language: 'vi', speaker: 'p243' },
        'tr-TR': { language: 'tr', speaker: 'p244' },
        'pl-PL': { language: 'pl', speaker: 'p245' },
        'nl-NL': { language: 'nl', speaker: 'p246' },
        'sv-SE': { language: 'sv', speaker: 'p247' },
        'da-DK': { language: 'da', speaker: 'p248' },
        'fi-FI': { language: 'fi', speaker: 'p249' },
        'no-NO': { language: 'no', speaker: 'p250' },
        'cs-CZ': { language: 'cs', speaker: 'p251' },
        'hu-HU': { language: 'hu', speaker: 'p252' },
        'ro-RO': { language: 'ro', speaker: 'p253' },
        'uk-UA': { language: 'uk', speaker: 'p254' },
        'he-IL': { language: 'he', speaker: 'p255' },
        'fa-IR': { language: 'fa', speaker: 'p256' },
        'ur-PK': { language: 'ur', speaker: 'p257' },
        'bn-BD': { language: 'bn', speaker: 'p258' },
        'ta-IN': { language: 'ta', speaker: 'p259' },
        'te-IN': { language: 'te', speaker: 'p260' },
        'ml-IN': { language: 'ml', speaker: 'p261' },
        'kn-IN': { language: 'kn', speaker: 'p262' },
        'gu-IN': { language: 'gu', speaker: 'p263' },
        'pa-IN': { language: 'pa', speaker: 'p264' },
        'ne-NP': { language: 'ne', speaker: 'p265' },
        'si-LK': { language: 'si', speaker: 'p266' },
        'my-MM': { language: 'my', speaker: 'p267' },
        'km-KH': { language: 'km', speaker: 'p268' },
        'lo-LA': { language: 'lo', speaker: 'p269' },
        'ka-GE': { language: 'ka', speaker: 'p270' },
        'am-ET': { language: 'am', speaker: 'p271' },
        'sw-KE': { language: 'sw', speaker: 'p272' },
        'zu-ZA': { language: 'zu', speaker: 'p273' },
        'af-ZA': { language: 'af', speaker: 'p274' },
        'ms-MY': { language: 'ms', speaker: 'p275' },
        'tl-PH': { language: 'tl', speaker: 'p276' },
        'id-ID': { language: 'id', speaker: 'p277' },
        'jv-ID': { language: 'jv', speaker: 'p278' },
      };

      const mappedLanguage = languageMap[language] || { language: 'en', speaker: 'p225' };

      // Try Coqui TTS first, fallback to OpenAI TTS if unavailable
      try {
        // Prepare the request payload for Coqui TTS
        const payload = {
          text: text,
          language_id: mappedLanguage.language,
          speaker_id: mappedLanguage.speaker,
          style_wav: '',
          speed: 1.0
        };

        // Make the request to Coqui TTS server
        const response = await fetch(`${coquiServerUrl}/api/tts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'audio/wav',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const audioArrayBuffer = await response.arrayBuffer();
          const audioBuffer = Buffer.from(audioArrayBuffer);

          console.log(`[VoiceTranslation] Generated ${audioBuffer.length} bytes of audio via Coqui TTS`);
          return audioBuffer;
        } else {
          console.warn(`[VoiceTranslation] Coqui TTS server responded with status: ${response.status}, falling back to OpenAI TTS`);
        }
      } catch (coquiError) {
        console.warn('[VoiceTranslation] Coqui TTS unavailable, falling back to OpenAI TTS:', coquiError);
      }

      // Fallback to OpenAI TTS
      const voiceMap: { [key: string]: string } = {
        'en-US': 'alloy', 'en-GB': 'echo', 'es-ES': 'fable', 'fr-FR': 'onyx', 
        'de-DE': 'nova', 'it-IT': 'shimmer', 'pt-BR': 'alloy', 'pt-PT': 'alloy',
        'ja-JP': 'echo', 'ko-KR': 'fable', 'zh-CN': 'onyx', 'ru-RU': 'nova',
        'ar-SA': 'shimmer', 'hi-IN': 'alloy', 'th-TH': 'echo', 'vi-VN': 'fable',
        'tr-TR': 'onyx', 'pl-PL': 'nova', 'nl-NL': 'shimmer', 'sv-SE': 'alloy',
        'da-DK': 'echo', 'fi-FI': 'fable', 'no-NO': 'onyx', 'cs-CZ': 'nova',
        'hu-HU': 'shimmer', 'ro-RO': 'alloy', 'uk-UA': 'echo', 'he-IL': 'fable',
        'fa-IR': 'onyx', 'ur-PK': 'nova', 'bn-BD': 'shimmer', 'ta-IN': 'alloy',
        'te-IN': 'echo', 'ml-IN': 'fable', 'kn-IN': 'onyx', 'gu-IN': 'nova',
        'pa-IN': 'shimmer', 'ne-NP': 'alloy', 'si-LK': 'echo', 'my-MM': 'fable',
        'km-KH': 'onyx', 'lo-LA': 'nova', 'ka-GE': 'shimmer', 'am-ET': 'alloy',
        'sw-KE': 'echo', 'zu-ZA': 'fable', 'af-ZA': 'onyx', 'ms-MY': 'nova',
        'tl-PH': 'shimmer', 'id-ID': 'alloy', 'jv-ID': 'echo'
      };

      const voice = voiceMap[language] || 'alloy';

      // Generate audio using OpenAI TTS as fallback
      const mp3Response = await openai.audio.speech.create({
        model: 'tts-1',
        voice: voice as any,
        input: text,
        response_format: 'mp3',
        speed: 1.0
      });

      const buffer = Buffer.from(await mp3Response.arrayBuffer());
      console.log(`[VoiceTranslation] Generated ${buffer.length} bytes of audio via OpenAI TTS (fallback)`);
      return buffer;

    } catch (error) {
      console.error('[VoiceTranslation] Error generating speech:', error);
      return null;
    }
  }

  /**
   * Cleanup resources for a conversation
   */
  cleanupConversation(userId: number, conversationId: number): void {
    const chunkKey = `${userId}_${conversationId}`;

    // Clear timer
    if (this.chunkTimers.has(chunkKey)) {
      clearTimeout(this.chunkTimers.get(chunkKey)!);
      this.chunkTimers.delete(chunkKey);
    }

    // Clear audio chunks
    this.audioChunks.delete(chunkKey);

    console.log('[VoiceTranslation] Cleaned up resources for:', chunkKey);
  }
}

export const voiceTranslationService = new VoiceTranslationService();