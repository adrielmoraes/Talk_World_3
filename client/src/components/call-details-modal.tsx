import { useState } from "react";
import { X, Phone, Clock, Calendar, User, PhoneCall, PhoneMissed, MessageCircle, UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface CallDetailsModalProps {
  call: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CallDetailsModal({ call, open, onOpenChange }: CallDetailsModalProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const createCallMutation = useMutation({
    mutationFn: async (receiverId: number) => {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/calls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ receiverId }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create call");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      onOpenChange(false);
      setLocation(`/call/${data.call.receiverId}`);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao iniciar chamada. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  if (!call) return null;

  const currentUserId = JSON.parse(localStorage.getItem("user") || "{}").id;
  const isOutgoing = call.callerId === currentUserId;
  const otherUser = isOutgoing ? call.receiver : call.caller;

  const formatDuration = (seconds: number) => {
    if (!seconds) return "0s";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    };
  };

  const getCallStatusInfo = () => {
    switch (call.status) {
      case "missed":
        return {
          icon: <PhoneMissed className="h-5 w-5 text-red-500" />,
          text: "Chamada perdida",
          color: "text-red-500"
        };
      case "completed":
        return {
          icon: <PhoneCall className="h-5 w-5 text-green-500" />,
          text: isOutgoing ? "Chamada feita" : "Chamada recebida",
          color: "text-green-500"
        };
      case "declined":
        return {
          icon: <PhoneMissed className="h-5 w-5 text-red-500" />,
          text: "Chamada recusada",
          color: "text-red-500"
        };
      default:
        return {
          icon: <PhoneCall className="h-5 w-5 text-gray-500" />,
          text: "Chamada",
          color: "text-gray-500"
        };
    }
  };

  const statusInfo = getCallStatusInfo();
  const dateTime = formatDateTime(call.startedAt);

  const handleCallBack = () => {
    if (otherUser?.id) {
      createCallMutation.mutate(otherUser.id);
    }
  };

  const handleSendMessage = () => {
    // Navegar para o chat com o contato
    setLocation(`/chat/${otherUser?.id}`);
    onOpenChange(false);
  };

  const handleAddToContacts = () => {
    // Implementar lógica para adicionar aos contatos
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "A funcionalidade de adicionar contatos será implementada em breve"
    });
  };

  const handleDeleteCall = async () => {
    try {
      // Implementar API para deletar chamada do histórico
      const response = await fetch(`/api/calls/${call.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar chamada');
      }

      toast({
        title: "Chamada excluída",
        description: "A chamada foi removida do histórico"
      });
      
      onOpenChange(false);
      // Recarregar a lista de chamadas
      window.location.reload();
    } catch (error) {
      console.error('Erro ao deletar chamada:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a chamada",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes da Chamada</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Contact Info */}
          <div className="flex items-center space-x-4">
            {otherUser?.profilePhoto ? (
              <img 
                src={otherUser.profilePhoto}
                alt={`${otherUser.username}'s profile`}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-xl">
                {otherUser?.username?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {otherUser?.username || "Usuário"}
              </h3>
              {otherUser?.phoneNumber && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {otherUser.phoneNumber}
                </p>
              )}
            </div>
          </div>

          {/* Call Status */}
          <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            {statusInfo.icon}
            <span className={`font-medium ${statusInfo.color}`}>
              {statusInfo.text}
            </span>
          </div>

          {/* Call Details */}
          <div className="space-y-4">
            {/* Date and Time */}
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {dateTime.date}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {dateTime.time}
                </p>
              </div>
            </div>

            {/* Duration */}
            {call.duration && (
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Duração
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDuration(call.duration)}
                  </p>
                </div>
              </div>
            )}

            {/* Call Type */}
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Tipo de chamada
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isOutgoing ? "Chamada feita" : "Chamada recebida"}
                </p>
              </div>
            </div>

            {/* Call ID */}
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  ID da chamada
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                  #{call.id}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button
              onClick={handleCallBack}
              className="flex-1 bg-whatsapp-primary hover:bg-whatsapp-secondary"
              disabled={createCallMutation.isPending}
            >
              <Phone className="h-4 w-4 mr-2" />
              {createCallMutation.isPending ? "Chamando..." : "Ligar novamente"}
            </Button>
            <Button
              variant="outline"
              onClick={handleSendMessage}
              className="flex-1"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Enviar Mensagem
            </Button>
          </div>
          
          <div className="flex space-x-3 pt-3">
            <Button
              variant="outline"
              onClick={handleAddToContacts}
              className="flex-1"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar Contato
            </Button>
            <Button
              variant="outline"
              onClick={handleDeleteCall}
              className="flex-1 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Chamada
            </Button>
          </div>
          
          <div className="flex space-x-3 pt-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}