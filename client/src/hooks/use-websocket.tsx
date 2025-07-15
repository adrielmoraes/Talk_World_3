import { useEffect, useRef, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface SendMessageData {
  conversationId: number;
  text: string;
  translatedText?: string;
  targetLanguage?: string;
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
            // Invalidate conversations and messages queries to refresh UI
            queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
            queryClient.invalidateQueries({ queryKey: ["/api/conversations", message.message.conversationId.toString(), "messages"] });
            break;
            
          case "incoming_call":
            // Handle incoming call notification
            console.log("Incoming call:", message.call);
            break;
            
          case "webrtc_signal":
            // Handle WebRTC signaling
            console.log("WebRTC signal:", message.signal);
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
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: "send_message",
        ...data,
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

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    sendMessage,
    sendWebRTCSignal,
    isConnected: isConnectedRef.current,
  };
}
