import { useCallback, useRef, useState, useEffect } from 'react';
import { useWebSocket } from './use-websocket';
import { apiRequest } from '@/lib/queryClient';

export interface VoiceTranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: number;
  userId: number;
  conversationId: number;
}

export interface UseVoiceTranslationProps {
  conversationId: number;
  targetLanguage?: string;
  enabled?: boolean;
}

export function useVoiceTranslation({
  conversationId,
  targetLanguage = 'en-US',
  enabled = true
}: UseVoiceTranslationProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [translations, setTranslations] = useState<VoiceTranslationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { socket } = useWebSocket();

  const CHUNK_DURATION = 3000; // 3 seconds
  const SILENCE_THRESHOLD = 0.01;
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

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
    if (!enabled || isRecording) return;

    try {
      await initializeAudioContext();
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;

      // Connect audio stream to analyser for voice activity detection
      if (audioContextRef.current && analyserRef.current) {
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

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

      mediaRecorder.start();
      setIsRecording(true);

      // Start periodic chunk processing
      startChunkProcessing();

      console.log('[VoiceTranslation] Recording started');
    } catch (error) {
      console.error('[VoiceTranslation] Failed to start recording:', error);
    }
  }, [enabled, isRecording, conversationId, targetLanguage]);

  // Start processing audio chunks periodically
  const startChunkProcessing = useCallback(() => {
    const processChunk = async () => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
        return;
      }

      // Check for voice activity
      const hasVoiceActivity = detectVoiceActivity();
      
      if (hasVoiceActivity && audioChunksRef.current.length > 0) {
        // Stop current recording to get chunks
        mediaRecorderRef.current.stop();
        
        // Start new recording immediately for continuous capture
        setTimeout(() => {
          if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.start();
          }
        }, 100);
      }

      // Schedule next chunk processing
      chunkTimerRef.current = setTimeout(processChunk, CHUNK_DURATION);
    };

    chunkTimerRef.current = setTimeout(processChunk, CHUNK_DURATION);
  }, [isRecording]);

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

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      audioChunksRef.current = []; // Clear processed chunks

      if (audioBlob.size < 1000) { // Skip very small chunks (< 1KB)
        setIsProcessing(false);
        return;
      }

      // Convert blob to FormData
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('conversationId', conversationId.toString());
      formData.append('targetLanguage', targetLanguage);

      // Send to voice translation API
      const response = await fetch('/api/voice/translate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.translation) {
          setTranslations(prev => [...prev, result.translation]);
        }
      }
    } catch (error) {
      console.error('[VoiceTranslation] Error processing audio chunks:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [conversationId, targetLanguage, isProcessing]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!isRecording) return;

    setIsRecording(false);

    // Clear chunk timer
    if (chunkTimerRef.current) {
      clearTimeout(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
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

    console.log('[VoiceTranslation] Recording stopped');
  }, [isRecording]);

  // Listen for incoming voice translations via WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleVoiceTranslation = (data: any) => {
      if (data.type === 'voice_translation' && data.conversationId === conversationId) {
        const translation: VoiceTranslationResult = {
          originalText: data.originalText,
          translatedText: data.translatedText,
          sourceLanguage: data.sourceLanguage,
          targetLanguage: data.targetLanguage,
          timestamp: data.timestamp,
          userId: data.fromUserId,
          conversationId: data.conversationId,
        };
        
        setTranslations(prev => [...prev, translation]);
      }
    };

    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        handleVoiceTranslation(data);
      } catch (error) {
        // Ignore non-JSON messages
      }
    });

    return () => {
      // WebSocket cleanup handled by useWebSocket hook
    };
  }, [socket, conversationId]);

  // Cleanup on unmount or conversation change
  useEffect(() => {
    return () => {
      stopRecording();
      
      // Send cleanup signal via WebSocket
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'call_cleanup',
          conversationId,
        }));
      }
    };
  }, [conversationId, stopRecording]);

  // Clear translations when conversation changes
  useEffect(() => {
    setTranslations([]);
  }, [conversationId]);

  return {
    isRecording,
    isProcessing,
    translations,
    startRecording,
    stopRecording,
    clearTranslations: () => setTranslations([]),
  };
}