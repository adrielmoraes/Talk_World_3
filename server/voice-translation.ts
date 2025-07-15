import OpenAI from 'openai';
import FormData from 'form-data';
import { Readable } from 'stream';
import { groqTranslationService } from './groq-translation';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
   * Generate speech from text using OpenAI TTS
   */
  async generateSpeech(text: string, language: string = 'en-US'): Promise<Buffer | null> {
    try {
      console.log(`[VoiceTranslation] Generating speech for: "${text}" in ${language}`);
      
      // Map language codes to OpenAI TTS voices
      const voiceMap: { [key: string]: string } = {
        'en-US': 'alloy',
        'en-GB': 'echo',
        'es-ES': 'fable',
        'fr-FR': 'onyx',
        'de-DE': 'nova',
        'it-IT': 'shimmer',
        'pt-BR': 'alloy',
        'pt-PT': 'alloy',
        'ja-JP': 'echo',
        'ko-KR': 'fable',
        'zh-CN': 'onyx',
        'ru-RU': 'nova',
        'ar-SA': 'shimmer',
        'hi-IN': 'alloy',
        'th-TH': 'echo',
        'vi-VN': 'fable',
        'tr-TR': 'onyx',
        'pl-PL': 'nova',
        'nl-NL': 'shimmer',
        'sv-SE': 'alloy',
        'da-DK': 'echo',
        'fi-FI': 'fable',
        'no-NO': 'onyx',
        'cs-CZ': 'nova',
        'hu-HU': 'shimmer',
        'ro-RO': 'alloy',
        'uk-UA': 'echo',
        'he-IL': 'fable',
        'fa-IR': 'onyx',
        'ur-PK': 'nova',
        'bn-BD': 'shimmer',
        'ta-IN': 'alloy',
        'te-IN': 'echo',
        'ml-IN': 'fable',
        'kn-IN': 'onyx',
        'gu-IN': 'nova',
        'pa-IN': 'shimmer',
        'ne-NP': 'alloy',
        'si-LK': 'echo',
        'my-MM': 'fable',
        'km-KH': 'onyx',
        'lo-LA': 'nova',
        'ka-GE': 'shimmer',
        'am-ET': 'alloy',
        'sw-KE': 'echo',
        'zu-ZA': 'fable',
        'af-ZA': 'onyx',
        'ms-MY': 'nova',
        'tl-PH': 'shimmer',
        'id-ID': 'alloy',
        'jv-ID': 'echo',
        'haw-US': 'fable',
        'mi-NZ': 'onyx',
        'cy-GB': 'nova',
        'ga-IE': 'shimmer',
        'mt-MT': 'alloy',
        'is-IS': 'echo',
        'fo-FO': 'fable',
        'kl-GL': 'onyx',
        'eu-ES': 'nova',
        'ca-ES': 'shimmer',
        'gl-ES': 'alloy',
        'ast-ES': 'echo',
        'co-FR': 'fable',
        'br-FR': 'onyx',
        'oc-FR': 'nova',
        'rm-CH': 'shimmer',
        'lb-LU': 'alloy',
        'li-NL': 'echo',
        'fy-NL': 'fable',
        'nds-DE': 'onyx',
        'hsb-DE': 'nova',
        'dsb-DE': 'shimmer',
        'yi-US': 'alloy',
        'la-VA': 'echo',
        'eo-001': 'fable',
        'ia-001': 'onyx',
        'vo-001': 'nova'
      };
      
      const voice = voiceMap[language] || 'alloy';
      
      // Generate audio using OpenAI TTS
      const mp3Response = await openai.audio.speech.create({
        model: 'tts-1',
        voice: voice as any,
        input: text,
        response_format: 'mp3',
        speed: 1.0
      });
      
      // Convert to buffer
      const buffer = Buffer.from(await mp3Response.arrayBuffer());
      
      console.log(`[VoiceTranslation] Generated ${buffer.length} bytes of audio`);
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