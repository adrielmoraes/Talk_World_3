import { useState, useCallback } from 'react';

interface Message {
  id: string | number;
  text?: string;
  originalText?: string;
  senderId: number;
  senderName?: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  isStarred?: boolean;
  replyToMessageId?: string | number;
}

interface MessageInteractions {
  selectedMessages: Set<string>;
  replyToMessage: Message | null;
  contextMenu: {
    messageId: string | null;
    position: { x: number; y: number };
    isVisible: boolean;
  };
  quickReactions: {
    messageId: string | null;
    position: { x: number; y: number };
    isVisible: boolean;
  };
  isSelectionMode: boolean;
}

export function useMessageInteractions() {
  const [interactions, setInteractions] = useState<MessageInteractions>({
    selectedMessages: new Set(),
    replyToMessage: null,
    contextMenu: {
      messageId: null,
      position: { x: 0, y: 0 },
      isVisible: false
    },
    quickReactions: {
      messageId: null,
      position: { x: 0, y: 0 },
      isVisible: false
    },
    isSelectionMode: false
  });

  // Detectar URLs em texto
  const detectUrls = useCallback((text: string): string[] => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  }, []);

  // Gerenciar seleção de mensagens
  const toggleMessageSelection = useCallback((messageId: string) => {
    setInteractions(prev => {
      const newSelected = new Set(prev.selectedMessages);
      if (newSelected.has(messageId)) {
        newSelected.delete(messageId);
      } else {
        newSelected.add(messageId);
      }
      
      return {
        ...prev,
        selectedMessages: newSelected,
        isSelectionMode: newSelected.size > 0
      };
    });
  }, []);

  const clearSelection = useCallback(() => {
    setInteractions(prev => ({
      ...prev,
      selectedMessages: new Set(),
      isSelectionMode: false
    }));
  }, []);

  // Gerenciar menu de contexto
  const showContextMenu = useCallback((messageId: string, x: number, y: number) => {
    setInteractions(prev => ({
      ...prev,
      contextMenu: {
        messageId,
        position: { x, y },
        isVisible: true
      },
      quickReactions: {
        ...prev.quickReactions,
        isVisible: false
      }
    }));
  }, []);

  const hideContextMenu = useCallback(() => {
    setInteractions(prev => ({
      ...prev,
      contextMenu: {
        ...prev.contextMenu,
        isVisible: false
      }
    }));
  }, []);

  // Gerenciar reações rápidas
  const showQuickReactions = useCallback((messageId: string, x: number, y: number) => {
    setInteractions(prev => ({
      ...prev,
      quickReactions: {
        messageId,
        position: { x, y },
        isVisible: true
      },
      contextMenu: {
        ...prev.contextMenu,
        isVisible: false
      }
    }));
  }, []);

  const hideQuickReactions = useCallback(() => {
    setInteractions(prev => ({
      ...prev,
      quickReactions: {
        ...prev.quickReactions,
        isVisible: false
      }
    }));
  }, []);

  // Gerenciar reply
  const setReplyToMessage = useCallback((message: Message | null) => {
    setInteractions(prev => ({
      ...prev,
      replyToMessage: message
    }));
  }, []);

  const clearReply = useCallback(() => {
    setInteractions(prev => ({
      ...prev,
      replyToMessage: null
    }));
  }, []);

  // Ações de mensagem
  const handleReply = useCallback((messageId: string, messages: Message[]) => {
    const message = messages.find(m => m.id.toString() === messageId);
    if (message) {
      setReplyToMessage({
        id: messageId,
        text: message.text || message.originalText || '',
        senderId: message.senderId,
        senderName: message.senderName || 'Usuário',
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        fileType: message.fileType
      });
    }
    hideContextMenu();
  }, [setReplyToMessage, hideContextMenu]);

  const handleCopy = useCallback((messageId: string, messages: Message[]) => {
    const message = messages.find(m => m.id.toString() === messageId);
    if (message && (message.text || message.originalText)) {
      navigator.clipboard.writeText(message.text || message.originalText || '');
    }
    hideContextMenu();
  }, [hideContextMenu]);

  const handleCopySelected = useCallback((messages: Message[]) => {
    const selectedTexts = messages
      .filter(m => interactions.selectedMessages.has(m.id.toString()))
      .map(m => m.text || m.originalText || '')
      .filter(Boolean)
      .join('\n\n');
    
    if (selectedTexts) {
      navigator.clipboard.writeText(selectedTexts);
    }
    clearSelection();
  }, [interactions.selectedMessages, clearSelection]);

  return {
    interactions,
    detectUrls,
    toggleMessageSelection,
    clearSelection,
    showContextMenu,
    hideContextMenu,
    showQuickReactions,
    hideQuickReactions,
    setReplyToMessage,
    clearReply,
    handleReply,
    handleCopy,
    handleCopySelected
  };
}