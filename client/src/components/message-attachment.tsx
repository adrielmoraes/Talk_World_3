import React, { useState } from 'react';
import { Button } from './ui/button';
import { Download, FileText, Image, Music, Video, Play, Pause, Volume2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface MessageAttachmentProps {
  id: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  thumbnailUrl?: string;
  className?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return Image;
  if (fileType.startsWith('video/')) return Video;
  if (fileType.startsWith('audio/')) return Music;
  return FileText;
};

const isImageType = (fileType: string) => fileType.startsWith('image/');
const isVideoType = (fileType: string) => fileType.startsWith('video/');
const isAudioType = (fileType: string) => fileType.startsWith('audio/');

export function MessageAttachment({
  id,
  fileUrl,
  fileName,
  fileSize,
  fileType,
  thumbnailUrl,
  className
}: MessageAttachmentProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const FileIcon = getFileIcon(fileType);

  const handleDownload = async () => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
    }
  };

  const handleAudioPlay = (audio: HTMLAudioElement) => {
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleAudioTimeUpdate = (audio: HTMLAudioElement) => {
    setAudioCurrentTime(audio.currentTime);
  };

  const handleAudioLoadedMetadata = (audio: HTMLAudioElement) => {
    setAudioDuration(audio.duration);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Renderização para imagens
  if (isImageType(fileType)) {
    return (
      <>
        <div className={cn("relative max-w-sm", className)}>
          <img
            src={thumbnailUrl || fileUrl}
            alt={fileName}
            className="rounded-lg cursor-pointer hover:opacity-90 transition-opacity max-h-64 w-auto"
            onClick={() => setShowFullImage(true)}
          />
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-2 right-2 opacity-80 hover:opacity-100"
            onClick={handleDownload}
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
        
        {/* Modal para imagem em tela cheia */}
        {showFullImage && (
          <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={() => setShowFullImage(false)}
          >
            <div className="relative max-w-4xl max-h-4xl p-4">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-full object-contain"
              />
              <Button
                variant="secondary"
                className="absolute top-6 right-6"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Renderização para vídeos
  if (isVideoType(fileType)) {
    return (
      <div className={cn("relative max-w-sm", className)}>
        <video
          controls
          className="rounded-lg max-h-64 w-auto"
          poster={thumbnailUrl}
        >
          <source src={fileUrl} type={fileType} />
          Seu navegador não suporta o elemento de vídeo.
        </video>
        <Button
          variant="secondary"
          size="sm"
          className="absolute top-2 right-2 opacity-80 hover:opacity-100"
          onClick={handleDownload}
        >
          <Download className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  // Renderização para áudios
  if (isAudioType(fileType)) {
    return (
      <div className={cn("bg-muted rounded-lg p-3 max-w-sm", className)}>
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full"
            onClick={(e) => {
              const audio = e.currentTarget.parentElement?.parentElement?.querySelector('audio') as HTMLAudioElement;
              if (audio) handleAudioPlay(audio);
            }}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium truncate">{fileName}</span>
              <Button variant="ghost" size="sm" onClick={handleDownload}>
                <Download className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Volume2 className="h-3 w-3" />
              <span>{formatTime(audioCurrentTime)}</span>
              <div className="flex-1 bg-background rounded-full h-1">
                <div 
                  className="bg-primary h-1 rounded-full transition-all"
                  style={{ width: `${audioDuration ? (audioCurrentTime / audioDuration) * 100 : 0}%` }}
                />
              </div>
              <span>{formatTime(audioDuration)}</span>
            </div>
          </div>
        </div>
        
        <audio
          src={fileUrl}
          onTimeUpdate={(e) => handleAudioTimeUpdate(e.currentTarget)}
          onLoadedMetadata={(e) => handleAudioLoadedMetadata(e.currentTarget)}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      </div>
    );
  }

  // Renderização para documentos e outros tipos de arquivo
  return (
    <div className={cn("bg-muted rounded-lg p-3 max-w-sm", className)}>
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <FileIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(fileSize)}</p>
        </div>
        
        <Button variant="ghost" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default MessageAttachment;