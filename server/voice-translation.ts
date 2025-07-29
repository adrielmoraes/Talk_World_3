import OpenAI from 'openai';
import { groqTranslationService } from './groq-translation';
import FormData from 'form-data';
import fetch from 'node-fetch';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Voice service configuration
const WHISPER_STT_SERVER_URL = process.env.WHISPER_STT_SERVER_URL || 'http://127.0.0.1:5001';
const WHISPER_STT_ENABLED = process.env.WHISPER_STT_ENABLED === 'true';
const COQUI_TTS_SERVER_URL = process.env.COQUI_TTS_SERVER_URL || 'http://localhost:5002';
const COQUI_TTS_ENABLED = process.env.COQUI_TTS_ENABLED === 'true';

interface VoiceTranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  audioBuffer?: Buffer;
  timestamp: string;
}

interface AudioChunk {
  data: Buffer;
  timestamp: number;
  sequenceNumber: number;
}

class VoiceTranslationService {
  private audioChunks = new Map<string, AudioChunk[]>();
  private chunkTimers = new Map<string, NodeJS.Timeout>();
  private processingQueue = new Map<string, boolean>();
  private readonly CHUNK_TIMEOUT = 2000; // 2 seconds
  private readonly MAX_CHUNK_SIZE = 1024 * 1024; // 1MB
  private readonly SAMPLE_RATE = 16000;
  private readonly CHANNELS = 1;
  private readonly BITS_PER_SAMPLE = 16;

  /**
   * Process audio chunk for real-time voice translation
   */
  async processAudioChunk(
    userId: number,
    conversationId: number,
    audioData: Buffer,
    targetLanguage: string,
    sequenceNumber: number = 0
  ): Promise<VoiceTranslationResult | null> {
    const chunkKey = `${userId}_${conversationId}`;
    
    try {
      // Initialize chunk array if not exists
      if (!this.audioChunks.has(chunkKey)) {
        this.audioChunks.set(chunkKey, []);
      }

      const chunks = this.audioChunks.get(chunkKey)!;
      
      // Add new chunk
      chunks.push({
        data: audioData,
        timestamp: Date.now(),
        sequenceNumber
      });

      // Clear existing timer
      if (this.chunkTimers.has(chunkKey)) {
        clearTimeout(this.chunkTimers.get(chunkKey)!);
      }

      // Set new timer for processing
      const timer = setTimeout(async () => {
        await this.processAccumulatedChunks(userId, conversationId, targetLanguage);
      }, this.CHUNK_TIMEOUT);

      this.chunkTimers.set(chunkKey, timer);

      // Check if we should process immediately (large chunk or many chunks)
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.data.length, 0);
      if (totalSize >= this.MAX_CHUNK_SIZE || chunks.length >= 10) {
        clearTimeout(timer);
        this.chunkTimers.delete(chunkKey);
        return await this.processAccumulatedChunks(userId, conversationId, targetLanguage);
      }

      return null;
    } catch (error) {
      console.error('[VoiceTranslation] Error processing audio chunk:', error);
      return null;
    }
  }

  /**
   * Process accumulated audio chunks
   */
  private async processAccumulatedChunks(
    userId: number,
    conversationId: number,
    targetLanguage: string
  ): Promise<VoiceTranslationResult | null> {
    const chunkKey = `${userId}_${conversationId}`;
    
    // Prevent concurrent processing
    if (this.processingQueue.get(chunkKey)) {
      return null;
    }
    
    this.processingQueue.set(chunkKey, true);
    
    try {
      const chunks = this.audioChunks.get(chunkKey);
      if (!chunks || chunks.length === 0) {
        return null;
      }

      // Sort chunks by sequence number
      chunks.sort((a, b) => a.sequenceNumber - b.sequenceNumber);

      // Combine all audio chunks
      const combinedAudio = Buffer.concat(chunks.map(chunk => chunk.data));
      
      // Clear processed chunks
      this.audioChunks.set(chunkKey, []);
      
      // Create WAV file from PCM data
      const wavBuffer = this.createWavBuffer(combinedAudio);
      
      console.log(`[VoiceTranslation] Processing ${combinedAudio.length} bytes of audio for user ${userId}`);
      
      // Step 1: Speech-to-Text (Whisper)
      const transcriptionResult = await this.transcribeAudio(wavBuffer);
      if (!transcriptionResult || !transcriptionResult.text.trim()) {
        console.log('[VoiceTranslation] No speech detected in audio');
        return null;
      }

      const originalText = transcriptionResult.text.trim();
      const sourceLanguage = transcriptionResult.language || 'auto';
      
      console.log(`[VoiceTranslation] Transcribed: "${originalText}" (${sourceLanguage})`);
      
      // Step 2: Translation (Groq API)
      let translatedText = originalText;
      if (sourceLanguage !== targetLanguage) {
        try {
          const translation = await groqTranslationService.translateWithContext({
            text: originalText,
            sourceLanguage,
            targetLanguage,
            context: {
              conversationId: conversationId.toString(),
              senderId: userId.toString(),
              messageType: 'voice',
              previousMessages: []
            }
          });
          
          if (translation && translation.translatedText) {
            translatedText = translation.translatedText;
            console.log(`[VoiceTranslation] Translated: "${translatedText}"`);
          }
        } catch (error) {
          console.error('[VoiceTranslation] Translation error:', error);
        }
      }
      
      // Step 3: Text-to-Speech (Coqui TTS)
      const audioBuffer = await this.generateSpeech(translatedText, targetLanguage);
      
      const result: VoiceTranslationResult = {
        originalText,
        translatedText,
        sourceLanguage,
        targetLanguage,
        audioBuffer: audioBuffer || undefined,
        timestamp: new Date().toISOString()
      };
      
      console.log(`[VoiceTranslation] Voice translation completed for user ${userId}`);
      return result;
      
    } catch (error) {
      console.error('[VoiceTranslation] Error processing accumulated chunks:', error);
      return null;
    } finally {
      this.processingQueue.set(chunkKey, false);
    }
  }

  /**
   * Transcribe audio using local Whisper STT or OpenAI fallback
   */
  private async transcribeAudio(audioBuffer: Buffer): Promise<{ text: string; language?: string } | null> {
    try {
      // Try local Whisper STT first
      if (WHISPER_STT_ENABLED) {
        try {
          const formData = new FormData();
          formData.append('audio', audioBuffer, {
            filename: 'audio.wav',
            contentType: 'audio/wav'
          });

          const response = await fetch(`${WHISPER_STT_SERVER_URL}/api/stt`, {
            method: 'POST',
            body: formData as any,
            headers: formData.getHeaders()
          });

          if (response.ok) {
            const result = await response.json() as any;
            console.log('[VoiceTranslation] Local Whisper STT successful');
            return {
              text: result.text,
              language: result.language
            };
          } else {
            console.warn(`[VoiceTranslation] Local Whisper STT failed with status: ${response.status}`);
          }
        } catch (error) {
          console.warn('[VoiceTranslation] Local Whisper STT unavailable, falling back to OpenAI:', error);
        }
      }

      // Fallback to OpenAI Whisper
      console.log('[VoiceTranslation] Using OpenAI Whisper as fallback');
      const transcription = await openai.audio.transcriptions.create({
        file: new File([audioBuffer], 'audio.wav', { type: 'audio/wav' }),
        model: 'whisper-1',
        language: undefined, // Auto-detect
        response_format: 'verbose_json'
      });

      return {
        text: transcription.text,
        language: (transcription as any).language
      };
      
    } catch (error) {
      console.error('[VoiceTranslation] Error transcribing audio:', error);
      return null;
    }
  }

  /**
   * Create WAV buffer from PCM data
   */
  private createWavBuffer(pcmBuffer: Buffer): Buffer {
    const channels = this.CHANNELS;
    const sampleRate = this.SAMPLE_RATE;
    const bitsPerSample = this.BITS_PER_SAMPLE;
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
   * Generate speech using local Coqui TTS or OpenAI fallback
   */
  async generateSpeech(text: string, language: string = 'en-US'): Promise<Buffer | null> {
    try {
      console.log(`[VoiceTranslation] Generating speech for: "${text}" in ${language}`);

      // Try local Coqui TTS first
      if (COQUI_TTS_ENABLED) {
        try {
          // Map language codes to Coqui TTS compatible language IDs
          const languageMap: Record<string, string> = {
            'en-US': 'en', 'en-GB': 'en', 'pt-BR': 'pt', 'pt-PT': 'pt',
            'es-ES': 'es', 'es-MX': 'es', 'fr-FR': 'fr', 'fr-CA': 'fr',
            'de-DE': 'de', 'it-IT': 'it', 'ja-JP': 'ja', 'ko-KR': 'ko',
            'zh-CN': 'zh-cn', 'zh-TW': 'zh-cn', 'ru-RU': 'ru', 'ar-SA': 'ar',
            'hi-IN': 'hi', 'th-TH': 'th', 'vi-VN': 'vi', 'tr-TR': 'tr',
            'pl-PL': 'pl', 'nl-NL': 'nl', 'sv-SE': 'sv', 'da-DK': 'da',
            'fi-FI': 'fi', 'no-NO': 'no', 'cs-CZ': 'cs', 'hu-HU': 'hu'
          };

          const mappedLanguage = languageMap[language] || 'en';

          const payload = {
            text: text,
            language_id: mappedLanguage,
            speed: 1.0
          };

          const response = await fetch(`${COQUI_TTS_SERVER_URL}/api/tts`, {
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
            console.log(`[VoiceTranslation] Generated ${audioBuffer.length} bytes of audio via local Coqui TTS`);
            return audioBuffer;
          } else {
            console.warn(`[VoiceTranslation] Local Coqui TTS failed with status: ${response.status}`);
          }
        } catch (error) {
          console.warn('[VoiceTranslation] Local Coqui TTS unavailable, falling back to OpenAI TTS:', error);
        }
      }

      // Fallback to OpenAI TTS
      console.log('[VoiceTranslation] Using OpenAI TTS as fallback');
      const voiceMap: { [key: string]: string } = {
        'en-US': 'alloy', 'en-GB': 'echo', 'es-ES': 'fable', 'fr-FR': 'onyx', 
        'de-DE': 'nova', 'it-IT': 'shimmer', 'pt-BR': 'alloy', 'pt-PT': 'alloy',
        'ja-JP': 'echo', 'ko-KR': 'fable', 'zh-CN': 'onyx', 'ru-RU': 'nova',
        'ar-SA': 'shimmer', 'hi-IN': 'alloy', 'th-TH': 'echo', 'vi-VN': 'fable',
        'tr-TR': 'onyx', 'pl-PL': 'nova', 'nl-NL': 'shimmer', 'sv-SE': 'alloy',
        'da-DK': 'echo', 'fi-FI': 'fable', 'no-NO': 'onyx', 'cs-CZ': 'nova',
        'hu-HU': 'shimmer', 'ro-RO': 'alloy', 'uk-UA': 'echo', 'he-IL': 'fable'
      };

      const voice = voiceMap[language] || 'alloy';

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
   * Process real-time audio stream for live translation
   */
  async processRealTimeAudio(
    userId: number,
    conversationId: number,
    audioStream: Buffer,
    targetLanguage: string,
    onTranslation: (result: VoiceTranslationResult) => void
  ): Promise<void> {
    try {
      // Split audio stream into chunks for processing
      const chunkSize = 8192; // 8KB chunks
      let sequenceNumber = 0;
      
      for (let i = 0; i < audioStream.length; i += chunkSize) {
        const chunk = audioStream.slice(i, i + chunkSize);
        
        const result = await this.processAudioChunk(
          userId,
          conversationId,
          chunk,
          targetLanguage,
          sequenceNumber++
        );
        
        if (result) {
          onTranslation(result);
        }
      }
    } catch (error) {
      console.error('[VoiceTranslation] Error processing real-time audio:', error);
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

    // Clear processing queue
    this.processingQueue.delete(chunkKey);

    console.log('[VoiceTranslation] Cleaned up resources for:', chunkKey);
  }

  /**
   * Get processing statistics for monitoring
   */
  getProcessingStats(): { 
    activeChunks: number; 
    processingQueues: number; 
    activeTimers: number;
    serviceStatus: {
      whisperSTT: boolean;
      coquiTTS: boolean;
    }
  } {
    return {
      activeChunks: this.audioChunks.size,
      processingQueues: Array.from(this.processingQueue.values()).filter(Boolean).length,
      activeTimers: this.chunkTimers.size,
      serviceStatus: {
        whisperSTT: WHISPER_STT_ENABLED,
        coquiTTS: COQUI_TTS_ENABLED
      }
    };
  }

  /**
   * Health check for voice services
   */
  async healthCheck(): Promise<{
    whisperSTT: { available: boolean; latency?: number };
    coquiTTS: { available: boolean; latency?: number };
  }> {
    const result = {
      whisperSTT: { available: false, latency: undefined as number | undefined },
      coquiTTS: { available: false, latency: undefined as number | undefined }
    };

    // Check Whisper STT
    if (WHISPER_STT_ENABLED) {
      try {
        const start = Date.now();
        const response = await fetch(`${WHISPER_STT_SERVER_URL}/health`, {
          method: 'GET',
          timeout: 5000
        } as any);
        
        if (response.ok) {
          result.whisperSTT.available = true;
          result.whisperSTT.latency = Date.now() - start;
        }
      } catch (error) {
        console.warn('[VoiceTranslation] Whisper STT health check failed:', error);
      }
    }

    // Check Coqui TTS
    if (COQUI_TTS_ENABLED) {
      try {
        const start = Date.now();
        const response = await fetch(`${COQUI_TTS_SERVER_URL}/health`, {
          method: 'GET',
          timeout: 5000
        } as any);
        
        if (response.ok) {
          result.coquiTTS.available = true;
          result.coquiTTS.latency = Date.now() - start;
        }
      } catch (error) {
        console.warn('[VoiceTranslation] Coqui TTS health check failed:', error);
      }
    }

    return result;
  }
}

export const voiceTranslationService = new VoiceTranslationService();