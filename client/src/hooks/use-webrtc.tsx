import { useEffect, useRef, useState, useCallback } from "react";
import { useWebSocket } from "./use-websocket";

export function useWebRTC() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const { sendWebRTCSignal } = useWebSocket();

  // Check if browser supports required APIs
  const checkBrowserSupport = useCallback(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Seu navegador não suporta acesso ao microfone. Por favor, use um navegador mais recente.');
    }
    
    if (!window.RTCPeerConnection) {
      throw new Error('Seu navegador não suporta chamadas de voz. Por favor, use um navegador mais recente.');
    }
  }, []);

  // Request microphone permission
  const requestMicrophonePermission = useCallback(async () => {
    try {
      // Check if permission is already granted
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      if (permission.state === 'denied') {
        throw new Error('Permissão para usar o microfone foi negada. Por favor, permita o acesso ao microfone nas configurações do navegador.');
      }
      
      // Request access to microphone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }, 
        video: false 
      });
      
      return stream;
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Permissão para usar o microfone foi negada. Por favor, clique no ícone de microfone na barra de endereços e permita o acesso.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('Nenhum microfone foi encontrado. Por favor, conecte um microfone e tente novamente.');
      } else if (error.name === 'NotReadableError') {
        throw new Error('Microfone está sendo usado por outro aplicativo. Por favor, feche outros aplicativos que possam estar usando o microfone.');
      } else {
        throw new Error(`Erro ao acessar o microfone: ${error.message}`);
      }
    }
  }, []);

  // Initialize WebRTC
  const initializeWebRTC = useCallback(async () => {
    try {
      // Check browser support
      checkBrowserSupport();
      
      // Request microphone permission and get stream
      const stream = await requestMicrophonePermission();
      
      setLocalStream(stream);

      // Create peer connection
      peerConnection.current = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        if (peerConnection.current) {
          peerConnection.current.addTrack(track, stream);
        }
      });

      // Handle remote stream
      peerConnection.current.ontrack = (event) => {
        const [remoteStream] = event.streams;
        setRemoteStream(remoteStream);
        
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
        }
      };

      // Handle connection state changes
      peerConnection.current.onconnectionstatechange = () => {
        if (peerConnection.current) {
          setIsConnected(peerConnection.current.connectionState === "connected");
        }
      };

      // Handle ICE candidates
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          // Send ICE candidate via WebSocket
          // sendWebRTCSignal(event.candidate, targetUserId);
        }
      };

    } catch (error: any) {
      console.error("Error initializing WebRTC:", error);
      // Dispatch custom event for UI to handle the error
      const errorEvent = new CustomEvent('webrtc_error', {
        detail: {
          message: error.message || 'Erro desconhecido ao inicializar chamada de voz',
          type: error.name || 'UnknownError'
        }
      });
      window.dispatchEvent(errorEvent);
      throw error;
    }
  }, [checkBrowserSupport, requestMicrophonePermission]);

  const startCall = useCallback(async (targetUserId: number) => {
    await initializeWebRTC();
    
    if (peerConnection.current) {
      try {
        // Create offer
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        
        // Send offer via WebSocket
        sendWebRTCSignal(offer, targetUserId);
      } catch (error) {
        console.error("Error starting call:", error);
      }
    }
  }, [initializeWebRTC, sendWebRTCSignal]);

  const answerCall = useCallback(async (offer: RTCSessionDescriptionInit, callerUserId: number) => {
    await initializeWebRTC();
    
    if (peerConnection.current) {
      try {
        // Set remote description
        await peerConnection.current.setRemoteDescription(offer);
        
        // Create answer
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        
        // Send answer via WebSocket
        sendWebRTCSignal(answer, callerUserId);
      } catch (error) {
        console.error("Error answering call:", error);
      }
    }
  }, [initializeWebRTC, sendWebRTCSignal]);

  const endCall = useCallback(() => {
    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    // Clear remote stream
    setRemoteStream(null);
    setIsConnected(false);
  }, [localStream]);

  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn(!isSpeakerOn);
    // In a real implementation, this would route audio to speaker/earpiece
  }, [isSpeakerOn]);

  // Create audio elements for playback
  useEffect(() => {
    if (!localAudioRef.current) {
      localAudioRef.current = new Audio();
      localAudioRef.current.muted = true; // Prevent echo
    }

    if (!remoteAudioRef.current) {
      remoteAudioRef.current = new Audio();
      remoteAudioRef.current.autoplay = true;
    }

    return () => {
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = null;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
      }
    };
  }, []);

  // Set local audio stream
  useEffect(() => {
    if (localStream && localAudioRef.current) {
      localAudioRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    localStream,
    remoteStream,
    isConnected,
    isMuted,
    isSpeakerOn,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleSpeaker,
  };
}
