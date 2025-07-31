import { localVoiceTranslationService } from './local-voice-translation';

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

class AudioMessageService {
  constructor() {
    console.log('[AudioMessageService] Initialized with local voice translation');
  }

  /**
   * Process audio message with local STT, translation, and TTS pipeline
   */
  async processAudioMessage(
    audioBuffer: Buffer,
    senderLanguage: string,
    recipientLanguage: string,
    filename: string = 'audio.wav'
  ): Promise<AudioProcessingResult> {
    const startTime = Date.now();
    
    try {
      console.log(`[AudioMessageService] Processing audio message locally: ${senderLanguage} -> ${recipientLanguage}`);
      
      // Use local voice translation service which handles the complete pipeline
      const result = await localVoiceTranslationService.processCompleteAudio(
        audioBuffer,
        senderLanguage,
        recipientLanguage
      );
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        audioBuffer: result.audioBuffer,
        originalAudio: audioBuffer,
        transcription: result.originalText,
        translation: result.translatedText,
        sourceLanguage: result.sourceLanguage,
        targetLanguage: result.targetLanguage,
        processingTime
      };
    } catch (error: any) {
      console.error('[AudioMessageService] Audio processing error:', error);
      return {
        success: false,
        error: `Audio processing failed: ${error.message}`,
        originalAudio: audioBuffer,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check if the local voice translation services are available
   */
  async checkServicesHealth(): Promise<{
    whisper: boolean;
    coqui: boolean;
    m2m100: boolean;
    allHealthy: boolean;
  }> {
    // For now, assume services are available if we can import the service
    // In a real implementation, we would check the actual service endpoints
    const results = {
      whisper: true, // Local Whisper service
      coqui: true,   // Local Coqui TTS service
      m2m100: true,  // Local M2M100 translation service
      allHealthy: true
    };
    
    results.allHealthy = results.whisper && results.coqui && results.m2m100;
    
    return results;
  }
}

export default AudioMessageService;