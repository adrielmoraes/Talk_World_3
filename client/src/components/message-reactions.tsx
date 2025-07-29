import React, { useState } from 'react';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import { EmojiPicker } from './emoji-picker';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface Reaction {
  id: string;
  emoji: string;
  count: number;
  userReacted: boolean;
  users: string[]; // Array of user names who reacted
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  disabled?: boolean;
}

export function MessageReactions({ 
  messageId, 
  reactions, 
  onAddReaction, 
  onRemoveReaction, 
  disabled 
}: MessageReactionsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);

  const handleEmojiSelect = (emoji: string) => {
    onAddReaction(messageId, emoji);
    setShowEmojiPicker(false);
  };

  const handleReactionClick = (reaction: Reaction) => {
    if (reaction.userReacted) {
      onRemoveReaction(messageId, reaction.emoji);
    } else {
      onAddReaction(messageId, reaction.emoji);
    }
  };

  const formatUserList = (users: string[], userReacted: boolean): string => {
    if (users.length === 0) return '';
    
    if (userReacted) {
      const otherUsers = users.filter(user => user !== 'Você');
      if (otherUsers.length === 0) {
        return 'Você reagiu';
      } else if (otherUsers.length === 1) {
        return `Você e ${otherUsers[0]} reagiram`;
      } else {
        return `Você e mais ${otherUsers.length} pessoas reagiram`;
      }
    } else {
      if (users.length === 1) {
        return `${users[0]} reagiu`;
      } else if (users.length === 2) {
        return `${users[0]} e ${users[1]} reagiram`;
      } else {
        return `${users[0]} e mais ${users.length - 1} pessoas reagiram`;
      }
    }
  };

  if (reactions.length === 0 && disabled) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      {reactions.map((reaction) => (
        <div key={reaction.id} className="relative">
          <Button
            variant={reaction.userReacted ? "default" : "secondary"}
            size="sm"
            className={`h-6 px-2 text-xs rounded-full transition-all ${
              reaction.userReacted 
                ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                : 'bg-muted hover:bg-muted/80'
            }`}
            onClick={() => handleReactionClick(reaction)}
            onMouseEnter={() => setHoveredReaction(reaction.id)}
            onMouseLeave={() => setHoveredReaction(null)}
            disabled={disabled}
          >
            <span className="mr-1">{reaction.emoji}</span>
            <span>{reaction.count}</span>
          </Button>
          
          {/* Tooltip */}
          {hoveredReaction === reaction.id && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-10">
              <div className="bg-popover text-popover-foreground text-xs rounded-md px-2 py-1 shadow-md border whitespace-nowrap">
                {formatUserList(reaction.users, reaction.userReacted)}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-popover"></div>
              </div>
            </div>
          )}
        </div>
      ))}
      
      {!disabled && (
        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 rounded-full hover:bg-muted"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" side="top">
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export default MessageReactions;