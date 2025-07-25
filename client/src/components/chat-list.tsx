import { useState } from "react";
import { useLocation } from "wouter";
import { Search, MoreVertical, MessageCircle, Plus, Users, Settings, Archive, Star, Pin, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ContactSelector from "@/components/contact-selector";
import type { ConversationsResponse } from "@/types/api";

export default function ChatList() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [showContactSelector, setShowContactSelector] = useState(false);
  const [selectedChatFilter, setSelectedChatFilter] = useState("all");

  const { data: conversationsData } = useQuery<ConversationsResponse>({
    queryKey: ["/api/conversations"],
    enabled: !!localStorage.getItem("token"),
  });
  
  const conversations = conversationsData?.conversations;

  const handleNewChat = () => {
    setShowContactSelector(true);
    setShowNewChatDialog(false);
  };

  const openChat = (conversationId: number) => {
    setLocation(`/chat/${conversationId}`);
  };

  const filteredConversations = conversations?.filter((conversation) => {
    const matchesSearch = !searchQuery || 
      conversation.otherUser?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.lastMessage?.originalText?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = selectedChatFilter === "all" || 
      (selectedChatFilter === "unread" && (conversation.unreadCount || 0) > 0);
    
    return matchesSearch && matchesFilter;
  }) || [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-whatsapp-secondary text-white p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-medium">Talk World</h1>
          <div className="flex space-x-2">
            {searchQuery ? (
              <div className="flex items-center w-64 transition-all duration-300 ease-in-out">
                <Search className="absolute ml-3 h-4 w-4 text-gray-400 z-10" />
                <Input
                  placeholder="Pesquisar conversas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-whatsapp-elevated border-none text-white placeholder-gray-400 w-full"
                  autoFocus
                  onBlur={() => searchQuery.trim() === '' && setSearchQuery('')}
                />
              </div>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-whatsapp-primary" 
                onClick={() => setSearchQuery(" ")}
              >
                <Search className="h-5 w-5" />
              </Button>
            )}
            
            <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-whatsapp-primary">
                  <Plus className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Conversa</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Escolha como deseja iniciar uma nova conversa.
                  </p>
                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        setShowNewChatDialog(false);
                        setShowContactSelector(true);
                      }}
                      className="w-full"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Selecionar Contato
                    </Button>
                    <Button
                      onClick={() => {
                        setShowNewChatDialog(false);
                        setLocation("/app?tab=contacts");
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Ver Todos os Contatos
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-whatsapp-primary">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLocation("/app?tab=settings")}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedChatFilter("archived")}>
                  <Archive className="h-4 w-4 mr-2" />
                  Chats Arquivados
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedChatFilter("starred")}>
                  <Star className="h-4 w-4 mr-2" />
                  Mensagens Favoritas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length > 0 ? (
          filteredConversations.map((conversation) => (
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
                      {conversation.lastMessage?.createdAt && formatDistanceToNow(conversation.lastMessage.createdAt, { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                      {conversation.lastMessage?.originalText || "Iniciar conversa"}
                    </p>
                    {(conversation.unreadCount || 0) > 0 && (
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
              Inicie uma nova conversa selecionando um contato
            </p>
            <Button
              onClick={handleNewChat}
              variant="outline"
              className="mb-4"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Nova Conversa
            </Button>
          </div>
        )}
      </div>

      {/* Contact Selector Dialog */}
      <ContactSelector
        open={showContactSelector}
        onOpenChange={setShowContactSelector}
        title="Nova Conversa"
        actionType="chat"
      />

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
