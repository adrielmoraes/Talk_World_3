import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

interface QuickReactionsProps {
  messageId: string;
  isVisible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onReaction: (messageId: string, emoji: string) => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export function QuickReactions({
  messageId,
  isVisible,
  position,
  onClose,
  onReaction
}: QuickReactionsProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible) {
      const handleClickOutside = (event: MouseEvent) => {
        onClose();
      };
      
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const handleEmojiClick = (emoji: string) => {
    setSelectedEmoji(emoji);
    onReaction(messageId, emoji);
    
    // Pequena animação antes de fechar
    setTimeout(() => {
      onClose();
      setSelectedEmoji(null);
    }, 200);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" />
      
      {/* Reactions Bar */}
      <div 
        className="fixed z-50 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 px-2 py-2 flex items-center space-x-1"
        style={{
          left: Math.min(position.x - 150, window.innerWidth - 320),
          top: position.y - 60,
          transform: 'translateX(50%)'
        }}
      >
        {QUICK_EMOJIS.map((emoji, index) => (
          <button
            key={emoji}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all duration-200 hover:scale-125 hover:bg-gray-100 dark:hover:bg-gray-700",
              selectedEmoji === emoji && "scale-125 bg-blue-100 dark:bg-blue-900"
            )}
            onClick={() => handleEmojiClick(emoji)}
            style={{
              animationDelay: `${index * 50}ms`
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
}