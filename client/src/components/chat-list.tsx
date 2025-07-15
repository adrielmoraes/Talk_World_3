import { useState } from "react";
import { useLocation } from "wouter";
import { Search, MoreVertical, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

export default function ChatList() {
  const [, setLocation] = useLocation();

  const { data: conversations } = useQuery({
    queryKey: ["/api/conversations"],
    enabled: !!localStorage.getItem("token"),
  });

  const handleNewChat = () => {
    // For now, just switch to contacts tab to select someone to chat with
    setLocation("/app?tab=contacts");
  };

  const openChat = (conversationId: number) => {
    setLocation(`/chat/${conversationId}`);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-whatsapp-secondary text-white p-4 flex items-center justify-between">
        <h1 className="text-lg font-medium">Talk World</h1>
        <div className="flex space-x-4">
          <button>
            <Search className="h-6 w-6" />
          </button>
          <button>
            <MoreVertical className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {conversations?.conversations?.length > 0 ? (
          conversations.conversations.map((conversation: any) => (
            <div
              key={conversation.id}
              onClick={() => openChat(conversation.id)}
              className="border-b border-gray-100 dark:border-whatsapp-elevated hover:bg-gray-50 dark:hover:bg-whatsapp-elevated cursor-pointer"
            >
              <div className="p-4 flex items-center">
                {/* Avatar */}
                <div className="relative mr-3">
                  {conversation.otherUser?.profilePhoto ? (
                    <img 
                      src={conversation.otherUser.profilePhoto}
                      alt={`${conversation.otherUser.username}'s profile`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-lg">
                      {conversation.otherUser?.username?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-whatsapp-primary rounded-full border-2 border-white dark:border-whatsapp-dark"></div>
                </div>
                
                {/* Chat Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
                      {conversation.otherUser?.username || "Usuário"}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {conversation.lastMessage?.createdAt}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                      {conversation.lastMessage?.originalText || "Iniciar conversa"}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <span className="bg-whatsapp-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-2">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <MessageCircle className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
              Nenhuma conversa ainda
            </h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
              Toque no botão abaixo para iniciar uma nova conversa
            </p>
          </div>
        )}
      </div>

      {/* New Chat FAB */}
      <Button
        onClick={handleNewChat}
        className="fixed bottom-20 right-6 w-14 h-14 rounded-full bg-whatsapp-primary hover:bg-whatsapp-secondary shadow-lg"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    </div>
  );
}
