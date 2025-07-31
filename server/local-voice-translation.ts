import { localTranslationService } from './local-translation';
import FormData from 'form-data';

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

class LocalVoiceTranslationService {
  private audioChunks = new Map<string, AudioChunk[]>();
  private chunkTimers = new Map<string, NodeJS.Timeout>();
  private processingQueue = new Map<string, boolean>();
  private readonly CHUNK_TIMEOUT = 3000; // 3 seconds for better accuracy
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
    senderLanguage: string,
    receiverLanguage: string,
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
        await this.processAccumulatedChunks(userId, conversationId, senderLanguage, receiverLanguage);
      }, this.CHUNK_TIMEOUT);

      this.chunkTimers.set(chunkKey, timer);

      return null; // Processing will happen asynchronously
    } catch (error) {
      console.error('[LocalVoiceTranslation] Error processing audio chunk:', error);
      return null;
    }
  }

  /**
   * Process accumulated audio chunks
   */
  private async processAccumulatedChunks(
    userId: number,
    conversationId: number,
    senderLanguage: string,
    receiverLanguage: string
  ): Promise<VoiceTranslationResult | null> {
    const chunkKey = `${userId}_${conversationId}`;
    
    // Check if already processing
    if (this.processingQueue.get(chunkKey)) {
      return null;
    }

    this.processingQueue.set(chunkKey, true);

    try {
      const chunks = this.audioChunks.get(chunkKey);
      if (!chunks || chunks.length === 0) {
        return null;
      }

      console.log(`[LocalVoiceTranslation] Processing ${chunks.length} chunks for conversation ${conversationId}`);

      // Combine audio chunks
      const combinedAudio = this.combineAudioChunks(chunks);
      
      // Clear processed chunks
      this.audioChunks.delete(chunkKey);
      this.chunkTimers.delete(chunkKey);

      // Process the combined audio
      const result = await localTranslationService.processVoiceMessage(
        combinedAudio,
        senderLanguage,
        receiverLanguage
      );

      console.log(`[LocalVoiceTranslation] Voice processing completed: "${result.originalText}" -> "${result.translatedText}"`);
      
      return result;
    } catch (error) {
      console.error('[LocalVoiceTranslation] Error processing accumulated chunks:', error);
      return null;
    } finally {
      this.processingQueue.delete(chunkKey);
    }
  }

  /**
   * Combine multiple audio chunks into a single buffer
   */
  private combineAudioChunks(chunks: AudioChunk[]): Buffer {
    // Sort chunks by sequence number
    const sortedChunks = chunks.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    
    // Combine all audio data
    const combinedSize = sortedChunks.reduce((total, chunk) => total + chunk.data.length, 0);
    const combinedBuffer = Buffer.alloc(combinedSize);
    
    let offset = 0;
    for (const chunk of sortedChunks) {
      chunk.data.copy(combinedBuffer, offset);
      offset += chunk.data.length;
    }
    
    return combinedBuffer;
  }

  /**
   * Process complete audio file (for non-chunked processing)
   */
  async processCompleteAudio(
    audioBuffer: Buffer,
    senderLanguage: string,
    receiverLanguage: string
  ): Promise<VoiceTranslationResult> {
    try {
      console.log(`[LocalVoiceTranslation] Processing complete audio: ${senderLanguage} -> ${receiverLanguage}`);
      
      return await localTranslationService.processVoiceMessage(
        audioBuffer,
        senderLanguage,
        receiverLanguage
      );
    } catch (error) {
      console.error('[LocalVoiceTranslation] Error processing complete audio:', error);
      throw error;
    }
  }

  /**
   * Convert WAV buffer to proper format for processing
   */
  private convertToWav(audioBuffer: Buffer): Buffer {
    try {
      // If the buffer is already a valid WAV file, return as is
      if (audioBuffer.length > 44 && audioBuffer.toString('ascii', 0, 4) === 'RIFF') {
        return audioBuffer;
      }

      // Create a simple WAV header for raw PCM data
      const wavHeader = this.createWavHeader(audioBuffer.length);
      return Buffer.concat([wavHeader, audioBuffer]);
    } catch (error) {
      console.error('[LocalVoiceTranslation] Error converting to WAV:', error);
      return audioBuffer; // Return original if conversion fails
    }
  }

  /**
   * Create WAV file header
   */
  private createWavHeader(dataLength: number): Buffer {
    const header = Buffer.alloc(44);
    
    // RIFF header
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataLength, 4);
    header.write('WAVE', 8);
    
    // Format chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // PCM chunk size
    header.writeUInt16LE(1, 20);  // PCM format
    header.writeUInt16LE(this.CHANNELS, 22);  // Channels
    header.writeUInt32LE(this.SAMPLE_RATE, 24);  // Sample rate
    header.writeUInt32LE(this.SAMPLE_RATE * this.CHANNELS * this.BITS_PER_SAMPLE / 8, 28); // Byte rate
    header.writeUInt16LE(this.CHANNELS * this.BITS_PER_SAMPLE / 8, 32); // Block align
    header.writeUInt16LE(this.BITS_PER_SAMPLE, 34); // Bits per sample
    
    // Data chunk
    header.write('data', 36);
    header.writeUInt32LE(dataLength, 40);
    
    return header;
  }

  /**
   * Clear all pending chunks for a conversation
   */
  clearPendingChunks(userId: number, conversationId: number): void {
    const chunkKey = `${userId}_${conversationId}`;
    
    // Clear timer
    if (this.chunkTimers.has(chunkKey)) {
      clearTimeout(this.chunkTimers.get(chunkKey)!);
      this.chunkTimers.delete(chunkKey);
    }
    
    // Clear chunks
    this.audioChunks.delete(chunkKey);
    this.processingQueue.delete(chunkKey);
    
    console.log(`[LocalVoiceTranslation] Cleared pending chunks for conversation ${conversationId}`);
  }

  /**
   * Get processing status for a conversation
   */
  isProcessing(userId: number, conversationId: number): boolean {
    const chunkKey = `${userId}_${conversationId}`;
    return this.processingQueue.get(chunkKey) || false;
  }

  /**
   * Get pending chunks count for a conversation
   */
  getPendingChunksCount(userId: number, conversationId: number): number {
    const chunkKey = `${userId}_${conversationId}`;
    const chunks = this.audioChunks.get(chunkKey);
    return chunks ? chunks.length : 0;
  }
}

export const localVoiceTranslationService = new LocalVoiceTranslationService();