import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import BottomNavigation from "@/components/bottom-navigation";
import ChatList from "@/components/chat-list";
import ContactsTab from "@/components/contacts-tab";
import CallsTab from "@/components/calls-tab";
import SettingsTab from "@/components/settings-tab";
import { useWebSocket } from "@/hooks/use-websocket";

export default function MainApp() {
  const [, setLocation] = useLocation();
  const [currentTab, setCurrentTab] = useState("chats");
  const { connect, disconnect } = useWebSocket();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("token");
    if (!token) {
      setLocation("/");
      return;
    }

    // Connect to WebSocket
    connect(token);

    return () => {
      disconnect();
    };
  }, []);

  const renderCurrentTab = () => {
    switch (currentTab) {
      case "chats":
        return <ChatList />;
      case "calls":
        return <CallsTab />;
      case "contacts":
        return <ContactsTab />;
      case "settings":
        return <SettingsTab />;
      default:
        return <ChatList />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-whatsapp-dark">
      <div className="flex-1 overflow-hidden">
        {renderCurrentTab()}
      </div>
      <BottomNavigation currentTab={currentTab} onTabChange={setCurrentTab} />
    </div>
  );
}
