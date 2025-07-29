import React from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface ReplyPreviewProps {
  replyToMessage: {
    id: string;
    text: string;
    senderName: string;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
  } | null;
  onCancelReply: () => void;
}

export function ReplyPreview({ replyToMessage, onCancelReply }: ReplyPreviewProps) {
  if (!replyToMessage) return null;

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return '📄';
    
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType.includes('pdf')) return '📄';
    return '📎';
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-green-500 p-3 mx-4 mb-2 rounded-r-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              Respondendo a {replyToMessage.senderName}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {replyToMessage.fileUrl && (
              <span className="text-lg">
                {getFileIcon(replyToMessage.fileType)}
              </span>
            )}
            
            <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
              {replyToMessage.fileUrl && replyToMessage.fileName ? (
                replyToMessage.fileName
              ) : (
                truncateText(replyToMessage.text)
              )}
            </p>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 ml-2 hover:bg-gray-200 dark:hover:bg-gray-700"
          onClick={onCancelReply}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}