import React from 'react';
import { Mic } from 'lucide-react';
import { cn } from '../lib/utils';

interface TypingIndicatorProps {
  isVisible: boolean;
  userName: string;
  activityType: 'typing' | 'recording' | null;
  className?: string;
}

export function TypingIndicator({ 
  isVisible, 
  userName, 
  activityType, 
  className 
}: TypingIndicatorProps) {
  if (!isVisible || !activityType) {
    return null;
  }

  const getActivityText = () => {
    switch (activityType) {
      case 'typing':
        return 'digitando';
      case 'recording':
        return 'gravando áudio';
      default:
        return 'digitando';
    }
  };

  const getActivityIcon = () => {
    if (activityType === 'recording') {
      return <Mic className="h-3 w-3 text-red-500 animate-pulse" />;
    }
    return null;
  };

  return (
    <div className={cn(
      "flex items-center space-x-2 px-4 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-whatsapp-elevated transition-all duration-300",
      className
    )}>
      {getActivityIcon()}
      <span className="flex items-center space-x-1">
        <span className="font-medium">{userName}</span>
        <span>está {getActivityText()}</span>
        {activityType === 'typing' && (
          <div className="flex space-x-1 ml-1">
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        )}
      </span>
    </div>
  );
}

export default TypingIndicator;