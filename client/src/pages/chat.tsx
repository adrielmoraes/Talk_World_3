import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Phone, MoreVertical, Smile, Send, Languages, MessageCircle, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ContactInfoModal from "@/components/contact-info-modal";
import ChatOptionsMenu from "@/components/chat-options-menu";
import { MessageInput } from "@/components/message-input";
import { MessageReactions } from "@/components/message-reactions";
import { MessageAttachment } from "@/components/message-attachment";
import { MessageContextMenu } from "@/components/message-context-menu";
import { QuickReactions } from "@/components/quick-reactions";
import { ReplyPreview } from "@/components/reply-preview";
import { MessageSelectionBar } from "@/components/message-selection-bar";
import { LinkPreview } from "@/components/link-preview";
import { TypingIndicator } from "@/components/typing-indicator";
import { useMessageInteractions } from "@/hooks/use-message-interactions";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
import { useTranslation } from "@/hooks/use-translation";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ConversationResponse, MessagesResponse } from "@/types/api";

export default function ChatScreen() {
  const [, setLocation] = useLocation();
  const { conversationId } = useParams();
  const [messageText, setMessageText] = useState("");
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isLongPress, setIsLongPress] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage, connect, isConnected, sendUserActivity, requestUserStatus, sendAudioMessage } = useWebSocket();
  // Adicionar referência ao WebSocket
  const wsRef = useRef<WebSocket | null>(null);

  // Ensure WebSocket is connected when chat opens
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      connect(token);
    }
  }, [connect]);
  
  const { 
    supportedLanguages,
    getLanguageName,
    getLanguageFlag 
  } = useTranslation();
  const { toast } = useToast();

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}") as {
    id: number;
    username: string;
    preferredLanguage?: string;
    [key: string]: any;
  };

  const { data: conversationData, isLoading: isLoadingConversation } = useQuery<ConversationResponse>({
    queryKey: ["/api/conversations", conversationId],
    enabled: !!conversationId,
  });
  
  const conversation = conversationData?.conversation;

  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [otherUserRecording, setOtherUserRecording] = useState(false);
  
  // Listen for user status updates
  useEffect(() => {
    const handleStatusUpdate = (event: CustomEvent) => {
      const { userId, isOnline: userIsOnline, lastSeen: userLastSeen } = event.detail;
      
      // Check if this update is for the user we're chatting with
      if (conversation?.otherUser && userId === conversation.otherUser.id) {
        setIsOnline(userIsOnline);
        
        if (!userIsOnline && userLastSeen) {
          // Format the last seen time
          const lastSeenDate = new Date(userLastSeen);
          const formattedLastSeen = formatDistanceToNow(lastSeenDate, { addSuffix: true, locale: ptBR });
          setLastSeen(formattedLastSeen);
        }
      }
    };

    const handleUserActivityUpdate = (event: CustomEvent) => {
      const { userId, activityType, conversationId, isTyping: userTyping, isRecording: userRecording } = event.detail;
      if (userId === conversation?.otherUser?.id && conversationId === parseInt(conversationId)) {
        if (activityType === 'typing') {
          setOtherUserTyping(userTyping);
        } else if (activityType === 'recording') {
          setOtherUserRecording(userRecording);
        }
      }
    };

    // Add event listener
    window.addEventListener('user_status_update', handleStatusUpdate as EventListener);
    window.addEventListener('user_activity_update', handleUserActivityUpdate as EventListener);

    // Request user status when component mounts
    if (requestUserStatus && conversation?.otherUser?.id) {
      requestUserStatus(conversation.otherUser.id);
    }

    return () => {
      window.removeEventListener('user_status_update', handleStatusUpdate as EventListener);
      window.removeEventListener('user_activity_update', handleUserActivityUpdate as EventListener);
    };
  }, [conversation?.otherUser?.id, requestUserStatus, conversationId]);

  const { data: messagesData, refetch: refetchMessages } = useQuery<MessagesResponse>({
    queryKey: ["/api/conversations", conversationId, "messages"],
    enabled: !!conversationId,
  });
  
  const messages = messagesData?.messages;

  const [showOriginalText, setShowOriginalText] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [newMessageIndicator, setNewMessageIndicator] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const {
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
  } = useMessageInteractions();
  
  // Definir otherUser aqui para evitar problemas de escopo
  const otherUser = conversation?.otherUser;


  // Mark messages as read when conversation is opened
  useEffect(() => {
    const markAsRead = async () => {
      if (conversationId && conversation) {
        try {
          const token = localStorage.getItem("token");
          await fetch(`/api/conversations/${conversationId}/mark-read`, {
            method: "PATCH",
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          });
          // Invalidate conversations to update unread count
          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        } catch (error) {
          console.error("Error marking messages as read:", error);
        }
      }
    };

    markAsRead();
  }, [conversationId, conversation]);

  // Scroll automático inteligente quando novas mensagens chegam
  useEffect(() => {
    if (messages && messages.length > 0) {
      if (isAtBottom) {
        scrollToBottom();
      } else {
        setNewMessageIndicator(true);
      }
    }
  }, [messages, isAtBottom]);

  // Verificar posição do scroll inicialmente
  useEffect(() => {
    checkIfAtBottom();
  }, []);



  // Cleanup dos timers
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [longPressTimer, typingTimeout]);

  // Fechar menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => {
      hideContextMenu();
      hideQuickReactions();
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hideContextMenu();
        hideQuickReactions();
        if (interactions.isSelectionMode) {
          clearSelection();
        }
        if (interactions.replyToMessage) {
          clearReply();
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [hideContextMenu, hideQuickReactions, interactions.isSelectionMode, interactions.replyToMessage, clearSelection, clearReply]);

  // Scroll automático inteligente
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const checkIfAtBottom = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isAtBottomNow = scrollTop + clientHeight >= scrollHeight - 100;
      setIsAtBottom(isAtBottomNow);
      
      if (isAtBottomNow) {
        setNewMessageIndicator(false);
      }
    }
  };

  const handleScroll = () => {
    checkIfAtBottom();
  };

  const scrollToBottomWithIndicator = () => {
    setNewMessageIndicator(false);
    scrollToBottom();
  };

  const handleSendMessage = async (content: string, type: 'text' | 'image' | 'video' | 'audio' | 'document' = 'text', file?: File, replyToMessageId?: string) => {
    if ((!content.trim() && !file) || !conversationId) return;

    console.log('handleSendMessage called with:', {
      conversationId,
      content,
      type,
      file: file?.name,
      parsedConversationId: parseInt(conversationId),
      replyToMessageId
    });

    // Stop typing indicator
    setIsTyping(false);
    if (sendUserActivity) {
      sendUserActivity('stopped_typing', parseInt(conversationId), { isTyping: false });
    }

    // Handle file upload if present
    if (file && type !== 'text') {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('messageType', type);
        formData.append('conversationId', conversationId);
        
        if (replyToMessageId) {
          formData.append('replyToMessageId', replyToMessageId);
        }
        
        const token = localStorage.getItem('token');
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Falha no upload do arquivo');
        }
        
        const uploadResult = await response.json();
        
        // Send message with file information
        sendMessage({
          conversationId: parseInt(conversationId),
          text: content || file.name,
          fileUrl: uploadResult.fileUrl,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          thumbnailUrl: uploadResult.thumbnailUrl,
          replyToMessageId: replyToMessageId,
        });
      } catch (error) {
        console.error('Error uploading file:', error);
        toast({
          title: "Erro",
          description: "Falha ao enviar arquivo. Tente novamente.",
          variant: "destructive",
        });
      }
    } else {
      // Send text message
      sendMessage({
        conversationId: parseInt(conversationId),
        text: content,
        replyToMessageId: replyToMessageId,
      });
    }

    setMessageText("");
  };

  const handleSendAudioMessage = async (audioData: string, senderLanguage: string, recipientLanguage: string) => {
    if (!conversationId || !audioData) return;

    console.log('handleSendAudioMessage called with:', {
      conversationId,
      senderLanguage,
      recipientLanguage,
      audioDataLength: audioData.length
    });

    // Stop recording indicator
    setIsRecording(false);
    if (sendUserActivity) {
      sendUserActivity('stopped_recording', parseInt(conversationId), { isRecording: false });
    }

    try {
      // Send audio message via WebSocket
      sendAudioMessage({
        conversationId: parseInt(conversationId),
        audioData,
        senderLanguage,
        recipientLanguage
      });
    } catch (error) {
      console.error('Error sending audio message:', error);
      toast({
        title: "Erro",
        description: "Falha ao enviar mensagem de áudio. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageText(value);
    
    // Handle typing indicator
    if (value.trim() && !isTyping && conversationId && sendUserActivity) {
      setIsTyping(true);
      sendUserActivity('typing', parseInt(conversationId), { isTyping: true });
    } else if (!value.trim() && isTyping && conversationId && sendUserActivity) {
      setIsTyping(false);
      sendUserActivity('stopped_typing', parseInt(conversationId), { isTyping: false });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(messageText);
    }
  };

  // Handle message reactions
  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ emoji }),
      });
      
      if (!response.ok) {
        throw new Error('Falha ao adicionar reação');
      }
      
      // Refresh messages to show new reaction
      refetchMessages();
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast({
        title: "Erro",
        description: "Falha ao adicionar reação. Tente novamente.",
        variant: "destructive",
      });
    }
    hideQuickReactions();
  };

  // Função para lidar com reações
  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emoji }),
      });

      if (response.ok) {
        // Atualizar as mensagens localmente
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      }
    } catch (error) {
      console.error('Erro ao adicionar reação:', error);
    }
    hideQuickReactions();
  };

  // Gerenciar long press - já declarado no topo

  const handleMouseDown = (e: React.MouseEvent, messageId: string) => {
    if (interactions.isSelectionMode) {
      toggleMessageSelection(messageId);
      return;
    }

    setIsLongPress(false);
    const timer = setTimeout(() => {
      setIsLongPress(true);
      const rect = e.currentTarget.getBoundingClientRect();
      showQuickReactions(messageId, rect.left + rect.width / 2, rect.top);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleMouseUp = (messageId: string) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    if (!isLongPress && !interactions.isSelectionMode) {
      // Click normal - pode implementar outras ações se necessário
    }
    setIsLongPress(false);
  };

  const handleContextMenu = (e: React.MouseEvent, messageId: string) => {
    e.preventDefault();
    showContextMenu(messageId, e.clientX, e.clientY);
  };

  // Mapear mensagens para o formato esperado pelo hook
  const mapMessagesToHookFormat = (dbMessages: typeof messages) => {
    return (dbMessages || []).map(msg => ({
      id: msg.id.toString(),
      text: msg.originalText || msg.translatedText || '',
      originalText: msg.originalText,
      senderId: msg.senderId,
      senderName: msg.senderId === currentUser?.id ? currentUser.username : otherUser?.username,
      fileUrl: msg.fileUrl,
      fileName: msg.fileName,
      fileType: msg.fileType,
      isStarred: false,
      replyToMessageId: msg.replyToMessageId?.toString()
    }));
  };

  // Ações do menu de contexto
  const handleMenuAction = (action: string, messageId: string) => {
    const message = messages?.find(m => m.id.toString() === messageId);
    if (!message) return;

    const mappedMessages = mapMessagesToHookFormat(messages);

    switch (action) {
      case 'reply':
        handleReply(messageId, mappedMessages);
        break;
      case 'copy':
        handleCopy(messageId, mappedMessages);
        break;
      case 'forward':
        // Implementar encaminhamento
        toast({ title: 'Funcionalidade em desenvolvimento' });
        break;
      case 'translate':
        // TODO: Implementar tradução
        console.log('Traduzir mensagem:', messageId, mappedMessages);
        break;
      case 'star':
        // Implementar destacar
        toast({ title: 'Funcionalidade em desenvolvimento' });
        break;
      case 'delete':
        // Implementar exclusão
        toast({ title: 'Funcionalidade em desenvolvimento' });
        break;
    }
    hideContextMenu();
  };

  // Ações de seleção múltipla
  const handleBulkAction = (action: string) => {
    const mappedMessages = mapMessagesToHookFormat(messages);
    
    switch (action) {
      case 'copy':
        handleCopySelected(mappedMessages);
        break;
      case 'forward':
        toast({ title: 'Funcionalidade em desenvolvimento' });
        clearSelection();
        break;
      case 'delete':
        toast({ title: 'Funcionalidade em desenvolvimento' });
        clearSelection();
        break;
      case 'star':
        toast({ title: 'Funcionalidade em desenvolvimento' });
        clearSelection();
        break;
    }
  };

  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/messages/${messageId}/reactions`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ emoji }),
      });
      
      if (!response.ok) {
        throw new Error('Falha ao remover reação');
      }
      
      // Refresh messages to show updated reactions
      refetchMessages();
    } catch (error) {
      console.error('Error removing reaction:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover reação. Tente novamente.",
        variant: "destructive",
      });
    }
  };



  const startVoiceCall = () => {
    if (conversation?.otherUser) {
      setLocation(`/call/${conversation.otherUser.id}`);
    }
  };

  const goBack = () => {
    setLocation("/app");
  };



  // Show loading state
  if (isLoadingConversation) {
    return (
      <div className="h-screen bg-white dark:bg-whatsapp-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-whatsapp-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando conversa...</p>
        </div>
      </div>
    );
  }

  // Show error state if conversation not found
  if (!conversation && !isLoadingConversation) {
    return (
      <div className="h-screen bg-white dark:bg-whatsapp-dark flex flex-col">
        <div className="bg-whatsapp-secondary text-white p-4 flex items-center">
          <button onClick={goBack} className="mr-3">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h3 className="font-medium">Conversa não encontrada</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageCircle className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Esta conversa não existe ou foi removida.</p>
            <Button onClick={goBack} className="mt-4">
              Voltar
            </Button>
          </div>
        </div>
      </div>
    );
  }
  


  return (
    <div className="h-screen bg-white dark:bg-whatsapp-dark flex flex-col">
      {/* Chat Header */}
      <div className="bg-whatsapp-secondary text-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={goBack} className="mr-3">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div 
            className="flex items-center cursor-pointer hover:bg-gray-700/50 rounded-lg p-2 -m-2 transition-colors flex-1"
            onClick={() => setShowContactInfo(true)}
          >
            {otherUser?.profilePhoto ? (
              <img 
                src={otherUser.profilePhoto}
                alt={`${otherUser.username}'s profile`}
                className="w-10 h-10 rounded-full object-cover mr-3"
                onError={(e) => {
                  // Fallback if image fails to load
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    conversation?.otherUser?.contactName || otherUser?.username || '?'
                  )}&background=128C7E&color=fff`;
                }}
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium mr-3">
                {otherUser?.username?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            <div>
              <h3 className="font-medium">
                {conversation?.otherUser?.contactName || conversation?.otherUser?.username || otherUser?.username || "Usuário"}
              </h3>
              <p className="text-xs opacity-80">
                  {otherUserRecording ? 'gravando áudio...' :
                   otherUserTyping ? 'digitando...' : 
                   isOnline ? 'online' : 
                   lastSeen ? `visto por último ${lastSeen}` : 'offline'}
                </p>
            </div>
          </div>
        </div>
        <div className="flex space-x-4">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowOriginalText(!showOriginalText);
            }}
            className={`p-2 rounded-full transition-colors ${
              showOriginalText 
                ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300" 
                : "hover:bg-gray-100 dark:hover:bg-whatsapp-elevated text-white"
            }`}
            title={showOriginalText ? "Ocultar texto original" : "Mostrar texto original"}
          >
            {showOriginalText ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              startVoiceCall();
            }}
          >
            <Phone className="h-6 w-6" />
          </button>
          {conversationId && otherUser && (
            <ChatOptionsMenu 
              conversationId={conversationId} 
              otherUser={otherUser}
            />
          )}
        </div>
      </div>

      {/* Translation Status Bar removed */}

      {/* Barra de seleção múltipla */}
      {interactions.isSelectionMode && (
        <MessageSelectionBar
          selectedCount={interactions.selectedMessages.size}
          onClearSelection={clearSelection}
          onCopySelected={() => handleBulkAction('copy')}
          onForwardSelected={() => handleBulkAction('forward')}
          onDeleteSelected={() => handleBulkAction('delete')}
          onStarSelected={() => handleBulkAction('star')}
          canDelete={Array.from(interactions.selectedMessages).every(id => {
            const message = messages?.find(m => m.id.toString() === id);
            return message?.senderId === currentUser?.id;
          })}
        />
      )}

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        onScroll={handleScroll}
        style={{
          backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f0f0f0' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      >
        {messages && messages.length > 0 ? messages.map((message: any) => {
          const isOwn = message.senderId === currentUser.id;
          const senderName = isOwn ? "Você" : (otherUser?.username || "Usuário");
          const isSelected = interactions.selectedMessages.has(message.id);
          const urls = detectUrls(message.text || '');

          return (
            <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}>
              <div className="max-w-xs lg:max-w-md">
                <div 
                  className={`p-4 rounded-2xl shadow-md transition-all duration-200 hover:shadow-lg relative group cursor-pointer ${
                    isSelected ? 'ring-2 ring-blue-500' : ''
                  } ${
                    isOwn 
                      ? "bg-gradient-to-br from-green-200 to-green-200 text-black" 
                      : "bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-300"
                  }`}
                  onMouseDown={(e) => handleMouseDown(e, message.id.toString())}
                  onMouseUp={() => handleMouseUp(message.id.toString())}
                  onContextMenu={(e) => handleContextMenu(e, message.id.toString())}
                  onClick={(e) => {
                    if (interactions.isSelectionMode) {
                      e.preventDefault();
                      toggleMessageSelection(message.id.toString());
                    }
                  }}
                >
                  {/* Indicador de seleção */}
                  {interactions.isSelectionMode && (
                    <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'
                    }`}>
                      {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                    </div>
                  )}

                  {/* Resposta à mensagem */}
                  {message.replyToMessageId && (
                    <div className="mb-2 p-2 bg-black bg-opacity-10 rounded border-l-4 border-blue-400">
                      <p className="text-xs opacity-70">Respondendo a {senderName}</p>
                      <p className="text-sm truncate">
                        {messages?.find(m => m.id.toString() === message.replyToMessageId.toString())?.originalText || 'Mensagem'}
                      </p>
                    </div>
                  )}
                  {/* Message attachments */}
                  {message.fileUrl && (
                    <MessageAttachment
                      id={message.id.toString()}
                      fileUrl={message.fileUrl}
                      fileName={message.fileName || 'Arquivo'}
                      fileType={message.fileType || 'application/octet-stream'}
                      fileSize={message.fileSize}
                      thumbnailUrl={message.thumbnailUrl}
                    />
                  )}
                  
                  {/* Texto principal */}
                  <div className={`text-sm leading-relaxed relative ${
                    isOwn ? "text-black" : "text-black"
                  }`}>
                    <div className="pr-16">
                      {/* Texto sempre em preto */}
                      {isOwn ? (
                        <span className="text-black">
                          {message.originalText || message.text}
                        </span>
                      ) : (
                        <span className="text-black">
                          {message.translatedText || message.originalText || message.text}
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-0 right-0 transform translate-y-[15%]">
                      <span className="inline-flex items-center space-x-1">
                        <span className={`text-xs leading-none ${
                          isOwn 
                            ? "text-black opacity-70" 
                            : "text-gray-500 dark:text-gray-400 opacity-70"
                        }`}>
                          {new Date(message.createdAt).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        {isOwn && (
                          <div className="flex items-center">
                            {message.isRead ? (
                              <div className="text-blue-700 text-sm leading-none flex" title={`Lida ${message.readAt ? new Date(message.readAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}`}>
                                <svg width="16" height="12" viewBox="0 0 16 12" className="fill-current">
                                  <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L3.724 9.587a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512z"/>
                                </svg>
                              </div>
                            ) : message.isDelivered ? (
                              <div className="text-gray-700 text-sm leading-none flex" title={`Entregue ${message.deliveredAt ? new Date(message.deliveredAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}`}>
                                <svg width="16" height="12" viewBox="0 0 16 12" className="fill-current">
                                  <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L3.724 9.587a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512z"/>
                                </svg>
                              </div>
                            ) : (
                              <div className="text-gray-700 text-sm leading-none flex" title="Enviada">
                                <svg width="16" height="12" viewBox="0 0 16 12" className="fill-current">
                                  <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512z"/>
                                </svg>
                              </div>
                            )}
                          </div>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Texto alternativo (quando ativado) */}
                  {showOriginalText && message.translatedText && message.originalText && 
                   message.translatedText !== message.originalText && (
                    <div className={`text-sm italic border-t pt-2 mt-2 ${
                      isOwn 
                        ? "border-green-600" 
                        : "border-gray-400 dark:border-gray-200"
                    }`}>
                      <span className={`text-xs block mb-1 ${
                        isOwn 
                          ? "text-black opacity-70" 
                          : "text-black opacity-70"
                      }`}>
                        {isOwn ? "Texto traduzido:" : "Texto original:"}
                      </span>
                      <span className={`${
                        isOwn 
                          ? "text-black opacity-70" // Texto traduzido com 70% opacidade
                          : "text-black" // Texto original mantém cor normal
                      }`}>
                        {isOwn 
                          ? message.translatedText // Remetente vê tradução quando ativado
                          : message.originalText   // Destinatário vê original quando ativado
                        }
                      </span>
                    </div>
                  )}
                  
                  {/* Pré-visualização de links */}
                  {urls.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {urls.map((url, index) => (
                        <LinkPreview key={index} url={url} />
                      ))}
                    </div>
                  )}

                  {/* Message reactions */}
                  <MessageReactions
                    messageId={message.id.toString()}
                    reactions={message.reactions || []}
                    onAddReaction={handleAddReaction}
                    onRemoveReaction={handleRemoveReaction}
                  />
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Nenhuma mensagem ainda. Comece a conversar!</p>
          </div>
        )}
        
        {/* Typing/Recording Indicator */}
        {(otherUserTyping || otherUserRecording) && (
          <div className="px-4 pb-2">
            <TypingIndicator 
              isVisible={otherUserTyping || otherUserRecording}
              userName={otherUser?.username || 'Usuário'}
              activityType={otherUserRecording ? 'recording' : otherUserTyping ? 'typing' : null}
            />
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Indicador de nova mensagem */}
      {newMessageIndicator && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-10">
          <button
            onClick={scrollToBottomWithIndicator}
            className="bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Nova mensagem
          </button>
        </div>
      )}

      {/* Message Input */}
      <div className="bg-white dark:bg-whatsapp-surface border-t border-gray-200 dark:border-whatsapp-elevated">
        {/* Pré-visualização de resposta */}
        {interactions.replyToMessage && (
          <ReplyPreview
          replyToMessage={interactions.replyToMessage ? {
            id: interactions.replyToMessage.id.toString(),
            text: interactions.replyToMessage.text || interactions.replyToMessage.originalText || '',
            senderName: interactions.replyToMessage.senderName || 'Usuário',
            fileUrl: interactions.replyToMessage.fileUrl || undefined,
            fileName: interactions.replyToMessage.fileName || undefined,
            fileType: interactions.replyToMessage.fileType || undefined
          } : null}
          onCancelReply={clearReply}
        />
        )}
        
        <div className="p-4">
          <MessageInput
            onSendMessage={(content, type, file) => {
              handleSendMessage(content, type as 'text' | 'image' | 'video' | 'audio' | 'document', file, interactions.replyToMessage?.id?.toString());
              if (interactions.replyToMessage) {
                clearReply();
              }
            }}
            onSendAudioMessage={handleSendAudioMessage}
            recipientLanguage={otherUser?.preferredLanguage || 'en'}
            senderLanguage={currentUser?.preferredLanguage || 'en'}
            onTyping={(typing) => {
              if (typing && !isTyping && conversationId && sendUserActivity) {
                setIsTyping(true);
                sendUserActivity('typing', parseInt(conversationId), { isTyping: true });
              } else if (!typing && isTyping && conversationId && sendUserActivity) {
                setIsTyping(false);
                sendUserActivity('stopped_typing', parseInt(conversationId), { isTyping: false });
              }
            }}
            onRecording={(recording) => {
              if (recording && !isRecording && conversationId && sendUserActivity) {
                setIsRecording(true);
                sendUserActivity('recording', parseInt(conversationId), { isRecording: true });
              } else if (!recording && isRecording && conversationId && sendUserActivity) {
                setIsRecording(false);
                sendUserActivity('stopped_recording', parseInt(conversationId), { isRecording: false });
              }
            }}
            disabled={false}
          />
        </div>
      </div>
      
      {/* Menu de contexto */}
      {interactions.contextMenu.isVisible && (
        <MessageContextMenu
          messageId={interactions.contextMenu.messageId!}
          isVisible={interactions.contextMenu.isVisible}
          position={interactions.contextMenu.position}
          onReply={(id) => handleMenuAction('reply', id)}
          onForward={(id) => handleMenuAction('forward', id)}
          onTranslate={(id) => handleMenuAction('translate', id)}
          onStar={(id) => handleMenuAction('star', id)}
          onDelete={(id) => handleMenuAction('delete', id)}
          onCopy={(id) => handleMenuAction('copy', id)}
          onClose={hideContextMenu}
          isOwn={messages?.find(m => m.id.toString() === interactions.contextMenu.messageId)?.senderId === currentUser?.id}
          isStarred={messages?.find(m => m.id.toString() === interactions.contextMenu.messageId)?.isStarred || false}
        />
      )}

      {/* Reações rápidas */}
      {interactions.quickReactions.isVisible && (
        <QuickReactions
          messageId={interactions.quickReactions.messageId!}
          isVisible={interactions.quickReactions.isVisible}
          position={interactions.quickReactions.position}
          onReaction={handleReaction}
          onClose={hideQuickReactions}
        />
      )}

      {/* Contact Info Modal */}
      {showContactInfo && otherUser && (
        <ContactInfoModal
          open={showContactInfo}
          onOpenChange={setShowContactInfo}
          contact={{
            id: otherUser.id,
            username: otherUser.username,
            contactName: otherUser.contactName,
            phoneNumber: otherUser.phoneNumber,
            profilePhoto: otherUser.profilePhoto || undefined,
            preferredLanguage: otherUser.preferredLanguage,
            isOnline: otherUser.isOnline,
            lastSeen: otherUser.lastSeenAt?.toISOString(),

            joinedAt: otherUser.createdAt?.toISOString()
          }}
          conversationId={conversationId}
        />
      )}
    </div>
  );
}