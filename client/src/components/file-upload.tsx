import React, { useRef, useState } from 'react';
import { Button } from './ui/button';
import { Paperclip, Image, FileText, Music, Video, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface FileUploadProps {
  onFileSelect: (file: File, type: 'image' | 'video' | 'audio' | 'document') => void;
  disabled?: boolean;
}

interface FilePreview {
  file: File;
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
}

const getFileType = (file: File): 'image' | 'video' | 'audio' | 'document' => {
  const type = file.type;
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  return 'document';
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function FileUpload({ onFileSelect, disabled }: FileUploadProps) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<FilePreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileType = getFileType(file);
    const url = URL.createObjectURL(file);
    
    setPreview({ file, type: fileType, url });
    setOpen(false);
  };

  const handleSendFile = () => {
    if (preview) {
      onFileSelect(preview.file, preview.type);
      setPreview(null);
      URL.revokeObjectURL(preview.url);
    }
  };

  const handleCancelPreview = () => {
    if (preview) {
      URL.revokeObjectURL(preview.url);
      setPreview(null);
    }
  };

  const triggerFileInput = (type: 'general' | 'image' | 'video' | 'audio') => {
    switch (type) {
      case 'image':
        imageInputRef.current?.click();
        break;
      case 'video':
        videoInputRef.current?.click();
        break;
      case 'audio':
        audioInputRef.current?.click();
        break;
      default:
        fileInputRef.current?.click();
    }
  };

  if (preview) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Enviar Arquivo</h3>
            <Button variant="ghost" size="sm" onClick={handleCancelPreview}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mb-4">
            {preview.type === 'image' && (
              <img 
                src={preview.url} 
                alt={preview.file.name}
                className="w-full h-48 object-cover rounded-lg"
              />
            )}
            {preview.type === 'video' && (
              <video 
                src={preview.url} 
                controls
                className="w-full h-48 rounded-lg"
              />
            )}
            {preview.type === 'audio' && (
              <div className="flex items-center space-x-3 p-4 bg-muted rounded-lg">
                <Music className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">{preview.file.name}</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(preview.file.size)}</p>
                </div>
              </div>
            )}
            {preview.type === 'document' && (
              <div className="flex items-center space-x-3 p-4 bg-muted rounded-lg">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">{preview.file.name}</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(preview.file.size)}</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleCancelPreview} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSendFile} className="flex-1">
              Enviar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            disabled={disabled}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" side="top">
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => triggerFileInput('image')}
            >
              <Image className="h-4 w-4 mr-2" />
              Imagem
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => triggerFileInput('video')}
            >
              <Video className="h-4 w-4 mr-2" />
              Vídeo
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => triggerFileInput('audio')}
            >
              <Music className="h-4 w-4 mr-2" />
              Áudio
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => triggerFileInput('general')}
            >
              <FileText className="h-4 w-4 mr-2" />
              Documento
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept="*/*"
      />
      <input
        ref={imageInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*"
      />
      <input
        ref={videoInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept="video/*"
      />
      <input
        ref={audioInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept="audio/*"
      />
    </>
  );
}

export default FileUpload;