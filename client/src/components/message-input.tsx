import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Smile, Mic, MicOff, Send, Paperclip, X, Square } from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useClickOutside } from '@/hooks/useClickOutside';

interface MessageInputProps {
  onSendMessage: (content: string, type: string, file?: File) => void;
  onSendAudioMessage?: (audioData: string, senderLanguage: string, recipientLanguage: string) => Promise<void>;
  onTyping?: (isTyping: boolean) => void;
  onRecording?: (isRecording: boolean) => void;
  disabled?: boolean;
  recipientLanguage?: string;
  senderLanguage?: string;
}

export function MessageInput({ 
  onSendMessage, 
  onSendAudioMessage,
  onTyping, 
  onRecording,
  disabled, 
  recipientLanguage = 'en',
  senderLanguage = 'en'
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPushToTalk, setIsPushToTalk] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Handle typing indicator
    if (onTyping) {
      if (!isTyping && value.length > 0) {
        setIsTyping(true);
        onTyping(true);
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        onTyping(false);
      }, 1000);
    }
  };

  const handleSendMessage = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim(), 'text');
      setMessage('');
      
      // Stop typing indicator
      if (isTyping && onTyping) {
        setIsTyping(false);
        onTyping(false);
      }
      
      // Clear timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Focus back to input
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const newMessage = message + emoji;
    setMessage(newMessage);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleFileSelect = (file: File, type: 'image' | 'video' | 'audio' | 'document') => {
    onSendMessage('', 'file', file);
  };

  // Push-to-talk functionality
  const startPushToTalk = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Send audio for processing
        if (onSendAudioMessage) {
          setIsProcessingAudio(true);
          
          // Convert blob to base64
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            const audioData = base64Audio.split(',')[1]; // Remove data:audio/webm;base64, prefix
            
            await onSendAudioMessage(
              audioData,
              senderLanguage || 'pt',
              recipientLanguage || 'en'
            );
            setIsProcessingAudio(false);
          };
          reader.readAsDataURL(audioBlob);
        }
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsPushToTalk(true);
      setIsRecording(true);
      onRecording?.(true);
      
      // Start recording timer
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 100); // Update every 100ms for smoother timer
      
    } catch (error) {
      console.error('Error starting push-to-talk recording:', error);
      alert('Erro ao acessar o microfone. Verifique as permissões.');
    }
  };

  const stopPushToTalk = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsPushToTalk(false);
      setIsRecording(false);
      onRecording?.(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  // Legacy recording function for compatibility
  const startRecording = async () => {
    await startPushToTalk();
  };
  
  const stopRecording = () => {
    stopPushToTalk();
  };

  // Mouse and touch event handlers for push-to-talk
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isRecording && !disabled && !isProcessingAudio) {
      startPushToTalk();
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isRecording) {
      stopPushToTalk();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isRecording && !disabled && !isProcessingAudio) {
      startPushToTalk();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (isRecording) {
      stopPushToTalk();
    }
  };

  // Prevent context menu on long press
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };
  
  // Format recording time
  const formatRecordingTime = (time: number) => {
    const seconds = Math.floor(time / 10);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Close emoji picker when clicking outside
  useClickOutside(emojiPickerRef, () => {
    setShowEmojiPicker(false);
  });

  if (isRecording || isProcessingAudio) {
    return (
      <div className="flex items-center gap-2 p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 flex-1">
          {isProcessingAudio ? (
            <>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-spin" />
              <span className="text-blue-600 font-medium">Processando áudio...</span>
            </>
          ) : (
            <>
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-600 font-medium">
                {isPushToTalk ? 'Mantenha pressionado para gravar' : 'Gravando...'}
              </span>
              <span className="text-red-500 text-sm font-mono">
                {formatRecordingTime(recordingTime)}
              </span>
            </>
          )}
        </div>
        {!isProcessingAudio && (
          <Button
            onClick={stopRecording}
            variant="destructive"
            size="sm"
            className="shrink-0"
            disabled={isProcessingAudio}
          >
            <Square className="w-4 h-4 mr-1" />
            Parar
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-4 border-t bg-background">
      {/* File Upload */}
      <Button
        variant="ghost"
        size="sm"
        className="h-10 w-10 rounded-full p-0"
        disabled={disabled}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.txt';
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              setSelectedFile(file);
            }
          };
          input.click();
        }}
      >
        <Paperclip className="h-4 w-4" />
      </Button>
      
      {/* Emoji Picker */}
      <div className="relative" ref={emojiPickerRef}>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 rounded-full p-0"
          disabled={disabled}
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        >
          <Smile className="h-4 w-4" />
        </Button>
        {showEmojiPicker && (
          <div className="absolute bottom-12 left-0 z-50">
            <EmojiPicker
              onEmojiClick={(emojiData: EmojiClickData) => {
                setMessage(prev => prev + emojiData.emoji);
                setShowEmojiPicker(false);
                inputRef.current?.focus();
              }}
            />
          </div>
        )}
      </div>
      
      {/* Message Input */}
      <div className="flex-1 relative">
        <Input
          ref={inputRef}
          value={message}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={selectedFile ? `Arquivo: ${selectedFile.name}` : "Digite uma mensagem..."}
          disabled={disabled}
          className="pr-12"
        />
        {selectedFile && (
          <Button
            onClick={() => setSelectedFile(null)}
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      {/* Send/Push-to-Talk Button */}
      {message.trim() || selectedFile ? (
        <Button
          onClick={handleSendMessage}
          disabled={disabled}
          className="h-10 w-10 rounded-full p-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onContextMenu={handleContextMenu}
          disabled={disabled || isProcessingAudio}
          variant={isRecording ? "destructive" : "ghost"}
          className={`h-12 w-12 rounded-full p-0 select-none transition-all duration-200 ${
            isRecording ? 'scale-110 shadow-lg' : 'hover:scale-105'
          }`}
          style={{ touchAction: 'none' }}
        >
          {isRecording ? (
            <Square className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>
      )}
    </div>
  );
}

export default MessageInput;