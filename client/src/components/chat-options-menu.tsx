import { useState } from "react";
import { MoreVertical, Settings, Archive, Star, Trash2, Volume2, VolumeX, Bell, BellOff, Search, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface ChatOptionsMenuProps {
  conversationId: string;
  otherUser: {
    id: number;
    username: string;
    contactName?: string;
  };
  isArchived?: boolean;
  isMuted?: boolean;
  isStarred?: boolean;
}

function ChatOptionsMenu({ 
  conversationId, 
  otherUser, 
  isArchived = false, 
  isMuted = false, 
  isStarred = false 
}: ChatOptionsMenuProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleViewContact = () => {
    // Esta funcionalidade será implementada através do clique na div do cabeçalho
    setIsMenuOpen(false);
  };

  const handleSearchInChat = () => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "A busca na conversa será implementada em breve"
    });
    setIsMenuOpen(false);
  };

  const handleMuteNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/conversations/${conversationId}/mute`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ muted: !isMuted })
      });

      if (!response.ok) {
        throw new Error('Erro ao alterar notificações');
      }

      toast({
        title: isMuted ? "Notificações ativadas" : "Notificações silenciadas",
        description: isMuted ? 
          "Você receberá notificações desta conversa" : 
          "Você não receberá notificações desta conversa"
      });
    } catch (error) {
      console.error('Erro ao alterar notificações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar as notificações",
        variant: "destructive"
      });
    }
    setIsMenuOpen(false);
  };

  const handleStarConversation = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/conversations/${conversationId}/star`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ starred: !isStarred })
      });

      if (!response.ok) {
        throw new Error('Erro ao favoritar conversa');
      }

      toast({
        title: isStarred ? "Conversa desfavoritada" : "Conversa favoritada",
        description: isStarred ? 
          "A conversa foi removida dos favoritos" : 
          "A conversa foi adicionada aos favoritos"
      });
    } catch (error) {
      console.error('Erro ao favoritar conversa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível favoritar a conversa",
        variant: "destructive"
      });
    }
    setIsMenuOpen(false);
  };

  const handleArchiveConversation = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/conversations/${conversationId}/archive`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ archived: !isArchived })
      });

      if (!response.ok) {
        throw new Error('Erro ao arquivar conversa');
      }

      toast({
        title: isArchived ? "Conversa desarquivada" : "Conversa arquivada",
        description: isArchived ? 
          "A conversa foi movida de volta para a lista principal" : 
          "A conversa foi movida para arquivadas"
      });

      // Voltar para a lista de conversas após arquivar
      if (!isArchived) {
        setLocation('/app');
      }
    } catch (error) {
      console.error('Erro ao arquivar conversa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível arquivar a conversa",
        variant: "destructive"
      });
    }
    setIsMenuOpen(false);
  };

  const handleExportChat = () => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "A exportação de conversas será implementada em breve"
    });
    setIsMenuOpen(false);
  };

  const handleShareContact = () => {
    if (navigator.share) {
      navigator.share({
        title: `Contato: ${otherUser.contactName || otherUser.username}`,
        text: `Confira este contato no Talk World: ${otherUser.contactName || otherUser.username}`,
        url: window.location.href
      }).catch(console.error);
    } else {
      // Fallback para navegadores que não suportam Web Share API
      navigator.clipboard.writeText(window.location.href).then(() => {
        toast({
          title: "Link copiado",
          description: "O link da conversa foi copiado para a área de transferência"
        });
      }).catch(() => {
        toast({
          title: "Erro",
          description: "Não foi possível copiar o link",
          variant: "destructive"
        });
      });
    }
    setIsMenuOpen(false);
  };

  const handleDeleteConversation = async () => {
    if (!confirm('Tem certeza que deseja excluir esta conversa? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir conversa');
      }

      toast({
        title: "Conversa excluída",
        description: "A conversa foi excluída permanentemente"
      });

      // Voltar para a lista de conversas
      setLocation('/app');
    } catch (error) {
      console.error('Erro ao excluir conversa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a conversa",
        variant: "destructive"
      });
    }
    setIsMenuOpen(false);
  };

  const handleConversationSettings = () => {
    setLocation('/conversations-settings');
    setIsMenuOpen(false);
  };

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
          <MoreVertical className="h-6 w-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleViewContact}>
          <Settings className="mr-2 h-4 w-4" />
          Ver contato
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleSearchInChat}>
          <Search className="mr-2 h-4 w-4" />
          Pesquisar na conversa
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleMuteNotifications}>
          {isMuted ? (
            <>
              <Bell className="mr-2 h-4 w-4" />
              Ativar notificações
            </>
          ) : (
            <>
              <BellOff className="mr-2 h-4 w-4" />
              Silenciar notificações
            </>
          )}
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleStarConversation}>
          <Star className={`mr-2 h-4 w-4 ${isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          {isStarred ? 'Desfavoritar' : 'Favoritar'}
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleArchiveConversation}>
          <Archive className="mr-2 h-4 w-4" />
          {isArchived ? 'Desarquivar' : 'Arquivar conversa'}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleExportChat}>
          <Download className="mr-2 h-4 w-4" />
          Exportar conversa
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleShareContact}>
          <Share className="mr-2 h-4 w-4" />
          Compartilhar contato
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleConversationSettings}>
          <Settings className="mr-2 h-4 w-4" />
          Configurações da conversa
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleDeleteConversation}
          className="text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Excluir conversa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ChatOptionsMenu;