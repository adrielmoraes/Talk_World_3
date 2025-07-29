import React from 'react';
import { Button } from './ui/button';
import { 
  X, 
  Forward, 
  Trash2, 
  Copy, 
  Star,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '../lib/utils';

interface MessageSelectionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onForwardSelected: () => void;
  onDeleteSelected: () => void;
  onCopySelected: () => void;
  onStarSelected: () => void;
  canDelete: boolean; // Se todas as mensagens selecionadas podem ser deletadas
}

export function MessageSelectionBar({
  selectedCount,
  onClearSelection,
  onForwardSelected,
  onDeleteSelected,
  onCopySelected,
  onStarSelected,
  canDelete
}: MessageSelectionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="absolute top-0 left-0 right-0 bg-green-600 dark:bg-green-700 text-white z-30 px-4 py-3 flex items-center justify-between shadow-lg">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-green-700 dark:hover:bg-green-800 p-2"
          onClick={onClearSelection}
        >
          <X className="h-5 w-5" />
        </Button>
        
        <span className="font-medium">
          {selectedCount} {selectedCount === 1 ? 'mensagem selecionada' : 'mensagens selecionadas'}
        </span>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-green-700 dark:hover:bg-green-800 p-2"
          onClick={onStarSelected}
          title="Destacar mensagens"
        >
          <Star className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-green-700 dark:hover:bg-green-800 p-2"
          onClick={onCopySelected}
          title="Copiar texto"
        >
          <Copy className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-green-700 dark:hover:bg-green-800 p-2"
          onClick={onForwardSelected}
          title="Encaminhar mensagens"
        >
          <Forward className="h-5 w-5" />
        </Button>
        
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-red-600 dark:hover:bg-red-700 p-2"
            onClick={onDeleteSelected}
            title="Apagar mensagens"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}