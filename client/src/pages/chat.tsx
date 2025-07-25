import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Phone, MoreVertical, Smile, Send, Languages, MessageCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage, connect, isConnected, sendUserActivity, requestUserStatus } = useWebSocket();
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
      const { userId, activityType, conversationId, isTyping: userTyping } = event.detail;
      if (userId === conversation?.otherUser?.id && conversationId === parseInt(conversationId)) {
        if (activityType === 'typing') {
          setOtherUserTyping(userTyping);
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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !conversationId) return;

    console.log('handleSendMessage called with:', {
      conversationId,
      messageText,
      parsedConversationId: parseInt(conversationId)
    });

    // Stop typing indicator
    setIsTyping(false);
    if (sendUserActivity) {
      sendUserActivity('stopped_typing', parseInt(conversationId), { isTyping: false });
    }

    // Send message without manual translation - backend handles automatic translation
    sendMessage({
      conversationId: parseInt(conversationId),
      text: messageText,
    });

    setMessageText("");
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
      handleSendMessage();
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
  
  // Definir otherUser após verificar que conversation existe
  const otherUser = conversation?.otherUser;

  return (
    <div className="h-screen bg-white dark:bg-whatsapp-dark flex flex-col">
      {/* Chat Header */}
      <div className="bg-whatsapp-secondary text-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={goBack} className="mr-3">
            <ArrowLeft className="h-6 w-6" />
          </button>
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
                {otherUserTyping ? 'digitando...' : 
                 isOnline ? 'online' : 
                 lastSeen ? `visto por último ${lastSeen}` : 'offline'}
              </p>
          </div>
        </div>
        <div className="flex space-x-4">
          <button 
            onClick={() => setShowOriginalText(!showOriginalText)}
            className={`p-2 rounded-full transition-colors ${
              showOriginalText 
                ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300" 
                : "hover:bg-gray-100 dark:hover:bg-whatsapp-elevated text-white"
            }`}
            title={showOriginalText ? "Ocultar texto original" : "Mostrar texto original"}
          >
            {showOriginalText ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
          <button onClick={startVoiceCall}>
            <Phone className="h-6 w-6" />
          </button>
          <button>
            <MoreVertical className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Translation Status Bar removed */}

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{
          backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f0f0f0' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      >
        {messages && messages.length > 0 ? messages.map((message: any) => {
          const isOwn = message.senderId === currentUser.id;

          return (
            <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}>
              <div className="max-w-xs lg:max-w-md">
                <div className={`p-4 rounded-2xl shadow-md transition-all duration-200 hover:shadow-lg ${
                  isOwn 
                    ? "bg-gradient-to-br from-green-200 to-green-200 text-black" 
                    : "bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-300"
                }`}>
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
                </div>
              </div>
            </div>
          );
        }) : null}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white dark:bg-whatsapp-surface border-t border-gray-200 dark:border-whatsapp-elevated p-4">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <Input
              value={messageText}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={otherUser?.preferredLanguage ? 
                `Digite em qualquer idioma, será traduzido para ${getLanguageName(otherUser.preferredLanguage)}` : 
                "Digite sua mensagem..."
              }
              className="pr-16"
            />
            {otherUser?.preferredLanguage && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Badge variant="outline" className="text-xs">
                  {getLanguageFlag(otherUser.preferredLanguage)}
                </Badge>
              </div>
            )}
          </div>

          <Button variant="ghost" size="sm">
            <Smile className="h-5 w-5" />
          </Button>

          <Button 
            onClick={handleSendMessage}
            disabled={!messageText.trim()}
            className="bg-whatsapp-primary hover:bg-whatsapp-primary-dark text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>


      </div>
    </div>
  );
}