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
    translations,
    startRecording: startVoiceTranslation,
    stopRecording: stopVoiceTranslation,
    clearTranslations,
  } = useVoiceTranslation({
    conversationId: parseInt(contactId!) || 0,
    targetLanguage: 'en-US', // Could be based on contact's preferred language
    enabled: callTranslationEnabled,
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

  const contact = contactData?.user || { username: "Usuário", profilePhoto: null };

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
      </div>

      {/* Translation Status */}
      {callTranslationEnabled && (
        <div className="mx-6 mb-4">
          <div className="bg-whatsapp-primary bg-opacity-20 border border-whatsapp-primary border-opacity-30 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Languages className="h-5 w-5 text-whatsapp-primary mr-2" />
                <span className="text-sm">
                  {isTranslationRecording ? "Gravando e traduzindo..." : 
                   isTranslationProcessing ? "Processando..." :
                   "Tradução em tempo real ativa"}
                </span>
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
        <div className="mx-6 mb-4 max-h-40 overflow-y-auto">
          <div className="bg-gray-800 bg-opacity-50 rounded-lg p-3 space-y-2">
            {translations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center">
                Aguardando tradução...
              </p>
            ) : (
              translations.slice(-5).map((translation, index) => (
                <div key={`${translation.timestamp}-${index}`} className="text-sm">
                  <div className="text-gray-300">
                    <strong>Original:</strong> {translation.originalText}
                  </div>
                  <div className="text-whatsapp-primary">
                    <strong>Tradução:</strong> {translation.translatedText}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {translation.sourceLanguage} → {translation.targetLanguage}
                  </div>
                </div>
              ))
            )}
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
