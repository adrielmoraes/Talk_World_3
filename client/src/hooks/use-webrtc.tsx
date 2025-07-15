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

  // Initialize WebRTC
  const initializeWebRTC = useCallback(async () => {
    try {
      // Get user media (audio only for voice calls)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });
      
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

    } catch (error) {
      console.error("Error initializing WebRTC:", error);
    }
  }, []);

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
