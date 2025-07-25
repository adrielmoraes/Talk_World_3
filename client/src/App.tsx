import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import WelcomeScreen from "@/pages/welcome";
import OtpVerificationScreen from "@/pages/otp-verification";
import ProfileSetupScreen from "@/pages/profile-setup";
import MainApp from "@/pages/main-app";
import ChatScreen from "@/pages/chat";
import VoiceCallScreen from "@/pages/voice-call";
import ProfileEdit from "./pages/profile-edit";
import NotificationsSettings from "./pages/notifications-settings";
import StorageSettings from "./pages/storage-settings";
import NotFoundPage from "./pages/not-found";
import ConversationsSettings from "./pages/conversations-settings";
import CallsSettings from "./pages/calls-settings";


function Router() {
  return (
    <Switch>
      <Route path="/" component={WelcomeScreen} />
      <Route path="/verify-otp" component={OtpVerificationScreen} />
      <Route path="/profile-setup" component={ProfileSetupScreen} />
      <Route path="/app" component={MainApp} />
      <Route path="/chat/:conversationId" component={ChatScreen} />
      <Route path="/call/:contactId" component={VoiceCallScreen} />
      <Route path="/profile-edit" component={ProfileEdit} />
      <Route path="/notifications-settings" component={NotificationsSettings} />
      <Route path="/storage-settings" component={StorageSettings} />
      <Route path="/conversations-settings" component={ConversationsSettings} />
      <Route path="/calls-settings" component={CallsSettings} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Initialize dark mode from localStorage
    const savedDarkMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedDarkMode);

    if (savedDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem("darkMode", newDarkMode.toString());

    if (newDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-whatsapp-dark">

          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;