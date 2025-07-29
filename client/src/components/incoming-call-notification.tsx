import { useState, useEffect } from "react";
import { Phone, PhoneOff, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface IncomingCallNotificationProps {
  call: {
    id: number;
    callerId: number;
    receiverId: number;
    status: string;
    startedAt: string;
    caller?: {
      id: number;
      name: string;
      phone: string;
      profilePhoto?: string;
    };
  } | null;
  onAnswer: () => void;
  onDecline: () => void;
}

export default function IncomingCallNotification({ 
  call, 
  onAnswer, 
  onDecline 
}: IncomingCallNotificationProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isVisible, setIsVisible] = useState(false);

  // Update call status mutation
  const updateCallMutation = useMutation({
    mutationFn: async ({ callId, status, duration }: { callId: number; status: string; duration?: number }) => {
      const response = await fetch(`/api/calls/${callId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status, duration }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update call status');
      }
      
      return response.json();
    },
  });

  useEffect(() => {
    if (call) {
      setIsVisible(true);
      
      // Auto-decline after 30 seconds
      const timeout = setTimeout(() => {
        handleDecline();
      }, 30000);
      
      return () => {
        clearTimeout(timeout);
      };
    } else {
      setIsVisible(false);
    }
  }, [call]);

  const handleAnswer = async () => {
    if (!call) return;
    
    try {
      // Update call status to accepted
      await updateCallMutation.mutateAsync({
        callId: call.id,
        status: 'accepted'
      });
      
      // Navigate to voice call screen
      setLocation(`/call/${call.callerId}`);
      
      // Call the onAnswer callback
      onAnswer();
      
      setIsVisible(false);
    } catch (error) {
      console.error('Error answering call:', error);
      toast({
        title: "Erro",
        description: "Falha ao atender a chamada",
        variant: "destructive",
      });
    }
  };

  const handleDecline = async () => {
    if (!call) return;
    
    try {
      // Update call status to declined
      await updateCallMutation.mutateAsync({
        callId: call.id,
        status: 'declined'
      });
      
      // Call the onDecline callback
      onDecline();
      
      setIsVisible(false);
    } catch (error) {
      console.error('Error declining call:', error);
      toast({
        title: "Erro",
        description: "Falha ao recusar a chamada",
        variant: "destructive",
      });
    }
  };

  if (!call || !isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      <div className="bg-white dark:bg-whatsapp-dark rounded-lg p-8 max-w-sm w-full mx-4 text-center">
        {/* Caller Avatar */}
        <div className="mb-6">
          {call.caller?.profilePhoto ? (
            <img
              src={call.caller.profilePhoto}
              alt={call.caller.name}
              className="w-24 h-24 rounded-full mx-auto object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full mx-auto bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
              <User className="h-12 w-12 text-gray-500 dark:text-gray-400" />
            </div>
          )}
        </div>

        {/* Caller Info */}
        <div className="mb-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {call.caller?.name || 'Usuário Desconhecido'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {call.caller?.phone}
          </p>
        </div>

        {/* Call Status */}
        <div className="mb-8">
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Chamada recebida...
          </p>
        </div>

        {/* Call Actions */}
        <div className="flex justify-center space-x-8">
          {/* Decline Button */}
          <Button
            onClick={handleDecline}
            size="lg"
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white"
            disabled={updateCallMutation.isPending}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>

          {/* Answer Button */}
          <Button
            onClick={handleAnswer}
            size="lg"
            className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white"
            disabled={updateCallMutation.isPending}
          >
            <Phone className="h-6 w-6" />
          </Button>
        </div>

        {/* Loading State */}
        {updateCallMutation.isPending && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Processando...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}