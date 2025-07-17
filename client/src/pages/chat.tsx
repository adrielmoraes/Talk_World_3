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

export default function ChatScreen() {
  const [, setLocation] = useLocation();
  const { conversationId } = useParams();
  const [messageText, setMessageText] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage, connect } = useWebSocket();

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

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const { data: conversation, isLoading: isLoadingConversation } = useQuery({
    queryKey: ["/api/conversations", conversationId],
    enabled: !!conversationId,
  });

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ["/api/conversations", conversationId, "messages"],
    enabled: !!conversationId,
  });

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

    // Send message without manual translation - backend handles automatic translation
    sendMessage({
      conversationId: parseInt(conversationId),
      text: messageText,
    });

    setMessageText("");
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

  const otherUser = conversation?.otherUser;

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
          {otherUser?.profilePhoto ? (
            <img 
              src={otherUser.profilePhoto}
              alt={`${otherUser.username}'s profile`}
              className="w-10 h-10 rounded-full object-cover mr-3"
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium mr-3">
              {otherUser?.username?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          <div>
            <h3 className="font-medium">
              {conversation?.otherUser?.contactName || 
               conversation?.otherUser?.nickname || 
               conversation?.otherUser?.username || 
               otherUser?.contactName ||
               otherUser?.nickname ||
               otherUser?.username || 
               "Usuário"}
            </h3>
            <p className="text-xs opacity-80">online</p>
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

      {/* Translation Status Bar */}
      <div className="bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 border-b border-blue-200 dark:border-blue-700 p-3">
        <div className="flex items-center justify-center">
          <div className="flex items-center">
            <Languages className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
            <span className="text-sm text-blue-800 dark:text-blue-200 font-medium">
              Tradução automática ativa
            </span>
            {otherUser?.preferredLanguage && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {getLanguageFlag(otherUser.preferredLanguage)} {getLanguageName(otherUser.preferredLanguage)}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{
          backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f0f0f0' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      >
        {messages?.messages?.map((message: any) => {
          const isOwn = message.senderId === currentUser.id;

          return (
            <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
              <div className="max-w-xs lg:max-w-md">
                <div className={`p-3 rounded-lg shadow-sm ${
                  isOwn 
                    ? "bg-whatsapp-light dark:bg-whatsapp-primary dark:bg-opacity-80" 
                    : "bg-white dark:bg-whatsapp-elevated"
                }`}>
                  {/* Texto principal baseado no usuário */}
                  <div className="text-sm text-gray-800 dark:text-white mb-1">
                    {isOwn 
                      ? (message.originalText || message.text) // Remetente vê original
                      : (message.translatedText || message.originalText || message.text) // Destinatário vê traduzido
                    }
                  </div>

                  {/* Texto alternativo (quando ativado) */}
                  {showOriginalText && message.translatedText && message.originalText && 
                   message.translatedText !== message.originalText && (
                    <div className="text-sm text-gray-600 dark:text-gray-300 italic border-t border-gray-100 dark:border-gray-600 pt-2 mt-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                        {isOwn ? "Texto traduzido:" : "Texto original:"}
                      </span>
                      {isOwn 
                        ? message.translatedText // Remetente vê tradução quando ativado
                        : message.originalText   // Destinatário vê original quando ativado
                      }
                    </div>
                  )}

                  <div className="flex items-center justify-end space-x-1 mt-1">
                    <span className="text-xs text-gray-600 dark:text-gray-300">
                      {new Date(message.createdAt).toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    {isOwn && (
                      <div className="text-xs flex items-center">
                        {message.isRead ? (
                          <span className="text-blue-500" title={`Lida ${message.readAt ? new Date(message.readAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}`}>
                            ✓✓
                          </span>
                        ) : message.isDelivered ? (
                          <span className="text-gray-600 dark:text-gray-400" title={`Entregue ${message.deliveredAt ? new Date(message.deliveredAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}`}>
                            ✓✓
                          </span>
                        ) : (
                          <span className="text-gray-400" title="Enviada">
                            ✓
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white dark:bg-whatsapp-surface border-t border-gray-200 dark:border-whatsapp-elevated p-4">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
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