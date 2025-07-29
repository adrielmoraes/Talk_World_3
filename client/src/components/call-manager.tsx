import { useWebSocket } from "@/hooks/use-websocket";
import IncomingCallNotification from "./incoming-call-notification";

export default function CallManager() {
  const { incomingCall, clearIncomingCall } = useWebSocket();

  const handleAnswer = () => {
    clearIncomingCall();
  };

  const handleDecline = () => {
    clearIncomingCall();
  };

  return (
    <IncomingCallNotification
      call={incomingCall}
      onAnswer={handleAnswer}
      onDecline={handleDecline}
    />
  );
}