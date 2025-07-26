import { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from './use-websocket';

interface VoiceTranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  audioBuffer?: string; // base64 encoded audio
  fromUserId: number;
  conversationId: number;
  timestamp: string;
}

interface UseVoiceTranslationProps {
  conversationId: number;
  targetUserId: number;
  targetLanguage: string;
  isEnabled: boolean;
}

export function useVoiceTranslation({
  conversationId,
  targetUserId,
  targetLanguage,
  isEnabled
}: UseVoiceTranslationProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTranslation, setLastTranslation] = useState<VoiceTranslationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sequenceNumber, setSequenceNumber] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const webSocket = useWebSocket();

  const CHUNK_DURATION = 4000; // 4 seconds for better accuracy
  const SILENCE_THRESHOLD = 0.02; // Improved threshold for voice activity detection
  const MIN_CHUNK_SIZE = 8000; // Minimum chunk size in bytes
  const MAX_CONCURRENT_PROCESSING = 2; // Limit concurrent processing
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio context for voice activity detection
  const initializeAudioContext = useCallback(async () => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
    } catch (error) {
      console.error('[VoiceTranslation] Audio context initialization error:', error);
    }
  }, []);

  // Start recording audio for voice translation
  const startRecording = useCallback(async () => {
    if (!isEnabled || isRecording) return;

    try {
      setIsRecording(true);
      audioChunksRef.current = [];
      setError(null);

      // Get user media with optimized audio settings for voice translation
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000, // Whisper's preferred sample rate
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Set up MediaRecorder with optimized settings
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          await processAudioChunks();
        }
      };

      // Start recording
      mediaRecorder.start();

      // Process chunks every 2 seconds
      const processChunks = () => {
        if (isRecording && mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          
          // Restart recording for continuous capture
          setTimeout(() => {
            if (isRecording && streamRef.current) {
              const newRecorder = new MediaRecorder(streamRef.current, {
                mimeType: 'audio/webm;codecs=opus',
              });
              
              newRecorder.ondataavailable = mediaRecorder.ondataavailable;
              newRecorder.onstop = mediaRecorder.onstop;
              
              mediaRecorderRef.current = newRecorder;
              newRecorder.start();
              
              setTimeout(processChunks, 2000);
            }
          }, 100);
        }
      };

      setTimeout(processChunks, 2000);

      console.log('[VoiceTranslation] Recording started');
    } catch (error) {
      console.error('[VoiceTranslation] Failed to start recording:', error);
      setIsRecording(false);
      setError('Erro ao iniciar gravação');
    }
  }, [isEnabled, isRecording, conversationId, targetLanguage]);



  // Detect voice activity using audio analysis
  const detectVoiceActivity = useCallback((): boolean => {
    if (!analyserRef.current) return false;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    const normalizedVolume = average / 255;

    return normalizedVolume > SILENCE_THRESHOLD;
  }, []);

  // Process accumulated audio chunks
  const processAudioChunks = useCallback(async () => {
    if (audioChunksRef.current.length === 0 || isProcessing) return;

    setIsProcessing(true);
    const currentSeq = sequenceNumber;
    setSequenceNumber(prev => prev + 1);

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      audioChunksRef.current = []; // Clear processed chunks

      if (audioBlob.size < 1000) { // Skip very small chunks (< 1KB)
        setIsProcessing(false);
        return;
      }

      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64Audio = btoa(String.fromCharCode(...Array.from(uint8Array)));

      // Send audio chunk via WebSocket
      webSocket.sendVoiceAudioChunk(
        base64Audio,
        conversationId,
        targetUserId,
        targetLanguage,
        currentSeq
      );

      // Set timeout for processing
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      
      processingTimeoutRef.current = setTimeout(() => {
        setIsProcessing(false);
        setError('Timeout na tradução de voz');
      }, 10000); // 10 second timeout

    } catch (error) {
      console.error('[VoiceTranslation] Error processing audio chunks:', error);
      setError('Erro ao processar áudio');
      setIsProcessing(false);
    }
  }, [conversationId, targetUserId, targetLanguage, sequenceNumber, webSocket, isProcessing]);

  // Generate and play speech using TTS
  const generateAndPlaySpeech = useCallback(async (text: string, language: string) => {
    try {
      // Skip TTS for very short or empty text
      if (!text || text.trim().length < 3) {
        console.log('[VoiceTranslation] Skipping TTS for short text:', text);
        return;
      }

      console.log(`[VoiceTranslation] Generating TTS for: "${text.substring(0, 50)}..."`);
      
      const response = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          text: text.trim(),
          language,
          conversationId,
          quality: 'high', // Request high quality TTS
        }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        
        // Validate audio blob
        if (audioBlob.size === 0) {
          console.warn('[VoiceTranslation] Received empty audio blob');
          return;
        }
        
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Create or reuse audio element
        if (!audioRef.current) {
          audioRef.current = new Audio();
          audioRef.current.preload = 'auto';
        }
        
        audioRef.current.src = audioUrl;
        
        try {
          await audioRef.current.play();
          console.log('[VoiceTranslation] TTS audio played successfully');
        } catch (playError) {
          console.error('[VoiceTranslation] Error playing TTS audio:', playError);
        }
        
        // Clean up URL after playing
        audioRef.current.onended = () => {
          URL.revokeObjectURL(audioUrl);
        };
        
        // Also clean up on error
        audioRef.current.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          console.error('[VoiceTranslation] Audio playback error');
        };
      } else {
        console.error('[VoiceTranslation] TTS API error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('[VoiceTranslation] TTS error:', error);
    }
  }, [conversationId]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!isRecording) return;

    setIsRecording(false);

    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop audio stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    mediaRecorderRef.current = null;
    console.log('[VoiceTranslation] Recording stopped');
  }, [isRecording]);

  // Listen for voice translation results
  useEffect(() => {
    const handleVoiceTranslationResult = (event: CustomEvent) => {
      const result = event.detail as VoiceTranslationResult;
      if (result.conversationId === conversationId) {
        setLastTranslation(result);
        setIsProcessing(false);
        
        // Play translated audio if available
        if (result.audioBuffer) {
          playTranslatedAudio(result.audioBuffer);
        }
      }
    };

    const handleVoiceTranslationProcessed = (event: CustomEvent) => {
      const { conversationId: msgConversationId, success, error: processError } = event.detail;
      if (msgConversationId === conversationId) {
        if (!success && processError) {
          setError(processError);
          setIsProcessing(false);
        }
      }
    };

    window.addEventListener('voice_translation_result', handleVoiceTranslationResult as EventListener);
    window.addEventListener('voice_translation_processed', handleVoiceTranslationProcessed as EventListener);
    
    return () => {
      window.removeEventListener('voice_translation_result', handleVoiceTranslationResult as EventListener);
      window.removeEventListener('voice_translation_processed', handleVoiceTranslationProcessed as EventListener);
    };
  }, [conversationId]);

  // Play translated audio
  const playTranslatedAudio = useCallback((audioBuffer: string) => {
    try {
      const audioData = atob(audioBuffer);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }
      
      const audioBlob = new Blob([arrayBuffer], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.play().catch(error => {
        console.error('Error playing translated audio:', error);
      });
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    } catch (error) {
      console.error('Error processing translated audio:', error);
    }
  }, []);

  // Cleanup on unmount or when disabled
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      webSocket.sendUserActivity('call_cleanup', conversationId);
    };
  }, [conversationId, isRecording]);

  return {
    isRecording,
    isProcessing,
    lastTranslation,
    error,
    startRecording,
    stopRecording,
    clearError: () => setError(null),
  };
}