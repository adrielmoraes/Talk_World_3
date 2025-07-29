import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { 
  Reply, 
  Forward, 
  Languages, 
  Star, 
  Trash2, 
  Copy,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '../lib/utils';

interface MessageContextMenuProps {
  messageId: string;
  isVisible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onReply: (messageId: string) => void;
  onForward: (messageId: string) => void;
  onTranslate: (messageId: string) => void;
  onStar: (messageId: string) => void;
  onDelete: (messageId: string) => void;
  onCopy: (messageId: string) => void;
  isOwn: boolean;
  isStarred?: boolean;
}

export function MessageContextMenu({
  messageId,
  isVisible,
  position,
  onClose,
  onReply,
  onForward,
  onTranslate,
  onStar,
  onDelete,
  onCopy,
  isOwn,
  isStarred = false
}: MessageContextMenuProps) {
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

  const menuItems = [
    {
      icon: Reply,
      label: 'Responder',
      action: () => onReply(messageId),
      show: true
    },
    {
      icon: Forward,
      label: 'Encaminhar',
      action: () => onForward(messageId),
      show: true
    },
    {
      icon: Languages,
      label: 'Traduzir',
      action: () => onTranslate(messageId),
      show: !isOwn
    },
    {
      icon: Star,
      label: isStarred ? 'Remover destaque' : 'Destacar',
      action: () => onStar(messageId),
      show: true
    },
    {
      icon: Copy,
      label: 'Copiar texto',
      action: () => onCopy(messageId),
      show: true
    },
    {
      icon: Trash2,
      label: 'Apagar',
      action: () => onDelete(messageId),
      show: isOwn,
      destructive: true
    }
  ];

  const visibleItems = menuItems.filter(item => item.show);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" />
      
      {/* Menu */}
      <div 
        className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 min-w-[180px]"
        style={{
          left: Math.min(position.x, window.innerWidth - 200),
          top: Math.min(position.y, window.innerHeight - (visibleItems.length * 48 + 16))
        }}
      >
        {visibleItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Button
              key={index}
              variant="ghost"
              className={cn(
                "w-full justify-start px-4 py-3 h-auto text-left rounded-none hover:bg-gray-100 dark:hover:bg-gray-700",
                item.destructive && "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              )}
              onClick={() => {
                item.action();
                onClose();
              }}
            >
              <Icon className="h-4 w-4 mr-3" />
              {item.label}
            </Button>
          );
        })}
      </div>
    </>
  );
}