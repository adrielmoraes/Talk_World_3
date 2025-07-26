import { useEffect, useRef, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface SendMessageData {
  conversationId: number;
  text: string;
}

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const isConnectedRef = useRef(false);

  const connect = useCallback((token: string) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("WebSocket connected");
      isConnectedRef.current = true;

      // Send authentication
      if (ws.current) {
        ws.current.send(JSON.stringify({
          type: "auth",
          token,
        }));
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        switch (message.type) {
          case "auth_success":
            console.log("WebSocket authenticated");
            break;

          case "auth_error":
            console.error("WebSocket authentication failed:", message.message);
            break;

          case "new_message":
            // Invalidate conversations and messages queries to refresh the UI
            queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });

            // If the message is for the current conversation, also invalidate messages
            if (message.message?.conversationId) {
              queryClient.invalidateQueries({ 
                queryKey: ["/api/conversations", message.message.conversationId.toString(), "messages"] 
              });
            }
            break;

          case 'message_delivered':
            // Update message delivery status
            if (message.messageId) {
              queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
              // Invalidate messages for all conversations to update delivery status
              queryClient.invalidateQueries({ 
                queryKey: ["/api/conversations", undefined, "messages"] 
              });
            }
            break;

          case 'message_read':
            // Update message read status
            if (message.messageId) {
              queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
              // Invalidate messages for all conversations to update read status
              queryClient.invalidateQueries({ 
                queryKey: ["/api/conversations", undefined, "messages"] 
              });
            }
            break;

          case "incoming_call":
            // Handle incoming call notification
            console.log("Incoming call:", message.call);
            break;

          case "webrtc_signal":
            // Handle WebRTC signaling
            console.log("WebRTC signal:", message.signal);
            break;
            
          case "user_status":
            // Handle user status updates (online/offline)
            if (message.userId) {
              // Dispatch a custom event that components can listen for
              const statusEvent = new CustomEvent('user_status_update', {
                detail: {
                  userId: message.userId,
                  isOnline: message.isOnline,
                  lastSeen: message.lastSeen,
                  lastActivity: message.lastActivity
                }
              });
              window.dispatchEvent(statusEvent);
            }
            break;

          case "user_activity":
            // Handle user activity updates (typing, etc.)
            const activityEvent = new CustomEvent('user_activity_update', {
              detail: {
                userId: message.userId,
                activityType: message.activityType,
                conversationId: message.conversationId,
                isTyping: message.isTyping
              }
            });
            window.dispatchEvent(activityEvent);
            break;

          case "voice_translation_result":
            // Handle voice translation results
            const translationEvent = new CustomEvent('voice_translation_result', {
              detail: {
                originalText: message.originalText,
                translatedText: message.translatedText,
                sourceLanguage: message.sourceLanguage,
                targetLanguage: message.targetLanguage,
                audioBuffer: message.audioBuffer,
                fromUserId: message.fromUserId,
                conversationId: message.conversationId,
                timestamp: message.timestamp
              }
            });
            window.dispatchEvent(translationEvent);
            break;

          case "voice_translation_processed":
            // Handle voice translation processing confirmation
            const processedEvent = new CustomEvent('voice_translation_processed', {
              detail: {
                conversationId: message.conversationId,
                sequenceNumber: message.sequenceNumber,
                success: message.success,
                error: message.error
              }
            });
            window.dispatchEvent(processedEvent);
            break;

          default:
            console.log("Unknown message type:", message.type);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.current.onclose = () => {
      console.log("WebSocket disconnected");
      isConnectedRef.current = false;

      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!isConnectedRef.current) {
          connect(token);
        }
      }, 3000);
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (ws.current) {
      isConnectedRef.current = false;
      ws.current.close();
      ws.current = null;
    }
  }, []);

  const sendMessage = useCallback((data: SendMessageData) => {
    console.log('WebSocket sendMessage called with data:', data);
    console.log('WebSocket readyState:', ws.current?.readyState);
    console.log('WebSocket OPEN constant:', WebSocket.OPEN);

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const messageData = {
        type: "send_message",
        ...data,
      };
      console.log('Sending WebSocket message:', messageData);
      ws.current.send(JSON.stringify(messageData));
    } else {
      console.error('WebSocket not ready for sending message');
    }
  }, []);

  const sendUserActivity = useCallback((activityType: string, conversationId?: number, metadata?: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'user_activity',
        activityType,
        conversationId,
        metadata
      }));
    }
  }, []);

  const requestUserStatus = useCallback((userId: number) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'get_user_status',
        userId
      }));
    }
  }, []);

  const sendWebRTCSignal = useCallback((signal: any, targetUserId: number) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: "webrtc_signal",
        signal,
        targetUserId,
      }));
    }
  }, []);

  const sendVoiceAudioChunk = useCallback((
    audioData: string, // base64 encoded audio
    conversationId: number,
    targetUserId: number,
    targetLanguage: string = 'en-US',
    sequenceNumber: number = 0
  ) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'voice_audio_chunk',
        audioData,
        conversationId,
        targetUserId,
        targetLanguage,
        sequenceNumber
      }));
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    sendMessage,
    sendUserActivity,
    requestUserStatus,
    sendWebRTCSignal,
    sendVoiceAudioChunk,
    isConnected: isConnectedRef.current,
  };
}