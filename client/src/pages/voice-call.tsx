import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  PhoneOff, 
  Languages,
  MessageSquare 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useWebRTC } from "@/hooks/use-webrtc";
import { useVoiceTranslation } from "@/hooks/use-voice-translation";
import { useToast } from "@/hooks/use-toast";

export default function VoiceCallScreen() {
  const [, setLocation] = useLocation();
  const { contactId } = useParams();
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callTranslationEnabled, setCallTranslationEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState("Conectando...");
  const [callDuration, setCallDuration] = useState(0);
  const [showTranslations, setShowTranslations] = useState(false);
  const [webrtcError, setWebrtcError] = useState<string | null>(null);
  const { toast } = useToast();

  const { 
    localStream, 
    remoteStream, 
    isConnected, 
    startCall, 
    endCall,
    toggleMute,
    toggleSpeaker 
  } = useWebRTC();

  const { data: contactData } = useQuery({
    queryKey: ["/api/user", contactId],
    enabled: !!contactId,
  });

  // Initialize voice translation
  const {
    isRecording: isTranslationRecording,
    isProcessing: isTranslationProcessing,
    lastTranslation,
    error: translationError,
    startRecording: startVoiceTranslation,
    stopRecording: stopVoiceTranslation,
    clearError,
  } = useVoiceTranslation({
    conversationId: parseInt(contactId!) || 0,
    targetUserId: parseInt(contactId!) || 0,
    targetLanguage: 'pt-BR', // Portuguese as target language
    isEnabled: callTranslationEnabled,
  });

  const createCallMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/calls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ receiverId: parseInt(contactId!) }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create call");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      startCall(parseInt(contactId!));
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao iniciar chamada.",
        variant: "destructive",
      });
      handleEndCall();
    },
  });

  useEffect(() => {
    // Initialize call
    createCallMutation.mutate();

    // Start duration timer when connected
    let interval: NodeJS.Timeout;
    if (isConnected) {
      setCallStatus("Conectado");
      setWebrtcError(null); // Clear any previous errors
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      // Start voice translation when call is connected and enabled
      if (callTranslationEnabled) {
        startVoiceTranslation();
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected, callTranslationEnabled, startVoiceTranslation]);

  // Handle WebRTC errors
  useEffect(() => {
    const handleWebRTCError = (event: CustomEvent) => {
      const { message, type } = event.detail;
      setWebrtcError(message);
      setCallStatus("Erro na conexão");
      
      toast({
        title: "Erro na Chamada",
        description: message,
        variant: "destructive",
        duration: 8000,
      });
    };

    window.addEventListener('webrtc_error', handleWebRTCError as EventListener);
    
    return () => {
      window.removeEventListener('webrtc_error', handleWebRTCError as EventListener);
    };
  }, [toast]);

  // Handle translation toggle
  const handleToggleTranslation = () => {
    const newState = !callTranslationEnabled;
    setCallTranslationEnabled(newState);
    
    if (newState && isConnected) {
      startVoiceTranslation();
    } else {
      stopVoiceTranslation();
    }
  };

  const handleEndCall = () => {
    stopVoiceTranslation();
    endCall();
    setLocation("/app?tab=calls");
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    toggleMute();
  };

  const handleToggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    toggleSpeaker();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const contact = (contactData as any)?.user || { username: "Usuário", profilePhoto: null };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex flex-col">
      {/* Call Header */}
      <div className="p-6 text-center">
        <p className="text-sm opacity-75 mb-2">Talk World</p>
        <div className="w-32 h-32 mx-auto mb-4">
          {contact.profilePhoto ? (
            <img 
              src={contact.profilePhoto}
              alt={`${contact.username}'s profile`}
              className="w-full h-full rounded-full object-cover border-4 border-white border-opacity-20"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-4xl font-bold border-4 border-white border-opacity-20">
              {contact.username?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>
        <h2 className="text-2xl font-medium mb-2">{contact.username}</h2>
        <p className="text-lg opacity-75">{callStatus}</p>
        {isConnected && (
          <div className="flex items-center justify-center mt-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="ml-2 text-sm text-green-400">Conectado</span>
          </div>
        )}
      </div>

      {/* WebRTC Error Display */}
      {webrtcError && (
        <div className="mx-6 mb-4">
          <div className="bg-red-500 bg-opacity-20 border border-red-500 border-opacity-30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-sm font-bold">!</span>
              </div>
              <div className="flex-1">
                <h3 className="text-red-400 font-medium mb-1">Erro de Permissão</h3>
                <p className="text-sm text-red-300 mb-3">{webrtcError}</p>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => window.location.reload()}
                    size="sm"
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    Tentar Novamente
                  </Button>
                  <Button
                    onClick={handleEndCall}
                    size="sm"
                    variant="outline"
                    className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                  >
                    Encerrar Chamada
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Translation Status */}
      {callTranslationEnabled && (
        <div className="mx-6 mb-4">
          <div className="bg-whatsapp-primary bg-opacity-20 border border-whatsapp-primary border-opacity-30 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Languages className="h-5 w-5 text-whatsapp-primary" />
                <div className="flex flex-col">
                  <span className="text-sm">
                    {isTranslationRecording ? "Gravando e traduzindo..." : 
                     isTranslationProcessing ? "Processando..." :
                     "Tradução em tempo real ativa"}
                  </span>
                  <div className="flex items-center space-x-2 text-xs text-gray-300">
                    <span className="px-2 py-1 rounded-full text-xs bg-green-500 bg-opacity-20 text-green-400">
                      Status: Ativo
                    </span>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => setShowTranslations(!showTranslations)}
                variant="ghost"
                size="sm"
                className="text-whatsapp-primary hover:bg-whatsapp-primary hover:bg-opacity-20"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Translation Panel */}
      {showTranslations && callTranslationEnabled && (
        <div className="mx-6 mb-4">
          <div className="bg-black bg-opacity-30 backdrop-blur-sm rounded-lg p-4 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white">Traduções em Tempo Real</h3>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isTranslationRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-500'
                  }`}></div>
                  <span className="text-xs text-gray-300">
                    {isTranslationRecording ? 'Gravando' : 'Pausado'}
                  </span>
                </div>
                {isTranslationProcessing && (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <span className="text-xs text-blue-400">Processando...</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Translation Error */}
            {translationError && (
              <div className="mb-3 p-2 bg-red-500 bg-opacity-20 border border-red-500 border-opacity-30 rounded">
                <p className="text-xs text-red-300">{translationError}</p>
                <Button
                  onClick={clearError}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-red-400 hover:text-red-300 mt-1 p-0 h-auto"
                >
                  Limpar erro
                </Button>
              </div>
            )}
            
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {!lastTranslation ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  Nenhuma tradução ainda. Comece a falar para ver as traduções.
                </p>
              ) : (
                <div className="bg-white bg-opacity-10 rounded p-2">
                  <div className="text-xs text-gray-300 mb-1">
                    {lastTranslation.sourceLanguage} → {lastTranslation.targetLanguage}
                  </div>
                  <div className="text-sm text-white mb-1">
                    <strong>Original:</strong> {lastTranslation.originalText}
                  </div>
                  <div className="text-sm text-blue-300">
                    <strong>Traduzido:</strong> {lastTranslation.translatedText}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(lastTranslation.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Call Duration */}
      <div className="text-center mb-8">
        <span className="text-lg font-mono">{formatDuration(callDuration)}</span>
      </div>

      {/* Call Controls */}
      <div className="flex-1 flex items-end justify-center pb-12">
        <div className="flex space-x-8">
          {/* Mute Button */}
          <Button
            onClick={handleToggleMute}
            variant="ghost"
            size="icon"
            className={`w-16 h-16 rounded-full ${
              isMuted 
                ? "bg-red-500 hover:bg-red-600" 
                : "bg-gray-600 bg-opacity-50 hover:bg-opacity-70"
            }`}
          >
            {isMuted ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
          </Button>

          {/* Speaker Button */}
          <Button
            onClick={handleToggleSpeaker}
            variant="ghost"
            size="icon"
            className={`w-16 h-16 rounded-full ${
              isSpeakerOn 
                ? "bg-whatsapp-primary hover:bg-whatsapp-secondary" 
                : "bg-gray-600 bg-opacity-50 hover:bg-opacity-70"
            }`}
          >
            {isSpeakerOn ? <Volume2 className="h-8 w-8" /> : <VolumeX className="h-8 w-8" />}
          </Button>

          {/* End Call Button */}
          <Button
            onClick={handleEndCall}
            variant="ghost"
            size="icon"
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
          >
            <PhoneOff className="h-8 w-8" />
          </Button>

          {/* Translation Toggle */}
          <Button
            onClick={handleToggleTranslation}
            variant="ghost"
            size="icon"
            className={`w-16 h-16 rounded-full ${
              callTranslationEnabled 
                ? "bg-whatsapp-primary bg-opacity-80 hover:bg-opacity-100" 
                : "bg-gray-600 bg-opacity-50 hover:bg-opacity-70"
            }`}
          >
            <Languages className="h-8 w-8" />
          </Button>
        </div>
      </div>
    </div>
  );
}
