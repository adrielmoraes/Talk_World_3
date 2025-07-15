import { useState } from "react";
import { useLocation } from "wouter";
import { Search, Phone, PhoneCall, PhoneMissed, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function CallsTab() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: calls } = useQuery({
    queryKey: ["/api/calls"],
    enabled: !!localStorage.getItem("token"),
  });

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

  const callBack = (contactId: number) => {
    createCallMutation.mutate(contactId);
  };

  const showCallInfo = () => {
    toast({
      title: "Recurso não implementado",
      description: "Detalhes da chamada serão implementados em versão futura.",
    });
  };

  const newCall = () => {
    toast({
      title: "Recurso não implementado",
      description: "Seleção de contato para chamada será implementada em versão futura.",
    });
  };

  const getCallIcon = (status: string, isOutgoing: boolean) => {
    if (status === "missed") {
      return <PhoneMissed className="h-4 w-4 text-red-500" />;
    } else if (isOutgoing) {
      return <PhoneCall className="h-4 w-4 text-green-500 transform -rotate-45" />;
    } else {
      return <PhoneCall className="h-4 w-4 text-whatsapp-primary" />;
    }
  };

  const formatCallTime = (date: string) => {
    const callDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - callDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return `Hoje, ${callDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 2) {
      return `Ontem, ${callDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return callDate.toLocaleDateString('pt-BR');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-whatsapp-secondary text-white p-4 flex items-center justify-between">
        <h1 className="text-lg font-medium">Chamadas</h1>
        <button>
          <Search className="h-6 w-6" />
        </button>
      </div>

      {/* Calls List */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-whatsapp-dark">
        {calls?.calls?.length > 0 ? (
          calls.calls.map((call: any) => {
            const isOutgoing = call.callerId === JSON.parse(localStorage.getItem("user") || "{}").id;
            const otherUser = isOutgoing ? call.receiver : call.caller;
            
            return (
              <div
                key={call.id}
                className="border-b border-gray-100 dark:border-whatsapp-elevated hover:bg-gray-50 dark:hover:bg-whatsapp-elevated"
              >
                <div className="p-4 flex items-center">
                  {otherUser?.profilePhoto ? (
                    <img 
                      src={otherUser.profilePhoto}
                      alt={`${otherUser.username}'s profile`}
                      className="w-12 h-12 rounded-full object-cover mr-3"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-lg mr-3">
                      {otherUser?.username?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white">
                      {otherUser?.username || "Usuário"}
                    </h3>
                    <div className="flex items-center">
                      {getCallIcon(call.status, isOutgoing)}
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                        {call.status === "missed" ? "Perdida" : 
                         isOutgoing ? "Feita" : "Recebida"}
                        {call.duration && ` • ${Math.floor(call.duration / 60)}m ${call.duration % 60}s`}
                      </span>
                      <span className="mx-1 text-gray-400">•</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatCallTime(call.startedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={showCallInfo}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <Info className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => callBack(otherUser?.id)}
                      className="p-2 text-whatsapp-primary hover:bg-whatsapp-primary hover:bg-opacity-10 rounded-full"
                    >
                      <Phone className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Phone className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
              Nenhuma chamada ainda
            </h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
              Suas chamadas aparecerão aqui
            </p>
          </div>
        )}
      </div>

      {/* New Call FAB */}
      <Button
        onClick={newCall}
        className="fixed bottom-20 right-6 w-14 h-14 rounded-full bg-whatsapp-primary hover:bg-whatsapp-secondary shadow-lg"
        size="icon"
      >
        <Phone className="h-6 w-6" />
      </Button>
    </div>
  );
}
