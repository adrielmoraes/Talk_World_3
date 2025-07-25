
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Bell, MessageSquare, Phone, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export default function NotificationsSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [callNotifications, setCallNotifications] = useState(true);
  const [groupNotifications, setGroupNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [notificationSound, setNotificationSound] = useState("default");
  const [ringtone, setRingtone] = useState("default");

  const { data: settings } = useQuery({
    queryKey: ["/api/user/notification-settings"],
    enabled: !!localStorage.getItem("token"),
  }) as { data?: { settings?: any } };

  const updateSettingsMutation = useMutation({
    mutationFn: async (settingsData: any) => {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/user/notification-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(settingsData),
      });

      if (!response.ok) {
        throw new Error("Failed to update settings");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/notification-settings"] });
      toast({
        title: "Configurações salvas",
        description: "Suas preferências de notificação foram atualizadas.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (settings && settings.settings) {
      const s = settings.settings;
      setMessageNotifications(s.messageNotifications ?? true);
      setCallNotifications(s.callNotifications ?? true);
      setGroupNotifications(s.groupNotifications ?? true);
      setSoundEnabled(s.soundEnabled ?? true);
      setVibrationEnabled(s.vibrationEnabled ?? true);
      setNotificationSound(s.notificationSound ?? "default");
      setRingtone(s.ringtone ?? "default");
    }
  }, [settings]);

  const handleSettingChange = (key: string, value: any) => {
    const newSettings = {
      messageNotifications,
      callNotifications,
      groupNotifications,
      soundEnabled,
      vibrationEnabled,
      notificationSound,
      ringtone,
      [key]: value,
    };

    updateSettingsMutation.mutate(newSettings);

    // Update local state
    switch (key) {
      case "messageNotifications":
        setMessageNotifications(value);
        break;
      case "callNotifications":
        setCallNotifications(value);
        break;
      case "groupNotifications":
        setGroupNotifications(value);
        break;
      case "soundEnabled":
        setSoundEnabled(value);
        break;
      case "vibrationEnabled":
        setVibrationEnabled(value);
        break;
      case "notificationSound":
        setNotificationSound(value);
        break;
      case "ringtone":
        setRingtone(value);
        break;
    }
  };

  const goBack = () => {
    setLocation("/app");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-whatsapp-dark">
      {/* Header */}
      <div className="bg-whatsapp-secondary text-white p-4 flex items-center">
        <button onClick={goBack} className="mr-3">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-medium">Notificações</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Message Notifications */}
        <div className="p-4 border-b border-gray-100 dark:border-whatsapp-elevated">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <MessageSquare className="h-6 w-6 text-gray-500 mr-4" />
              <div>
                <span className="text-base text-gray-900 dark:text-white">Notificações de mensagens</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">Receber notificações de novas mensagens</p>
              </div>
            </div>
            <Switch 
              checked={messageNotifications}
              onCheckedChange={(value) => handleSettingChange("messageNotifications", value)}
            />
          </div>
        </div>

        {/* Call Notifications */}
        <div className="p-4 border-b border-gray-100 dark:border-whatsapp-elevated">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Phone className="h-6 w-6 text-gray-500 mr-4" />
              <div>
                <span className="text-base text-gray-900 dark:text-white">Notificações de chamadas</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">Receber notificações de chamadas</p>
              </div>
            </div>
            <Switch 
              checked={callNotifications}
              onCheckedChange={(value) => handleSettingChange("callNotifications", value)}
            />
          </div>
        </div>

        {/* Group Notifications */}
        <div className="p-4 border-b border-gray-100 dark:border-whatsapp-elevated">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Bell className="h-6 w-6 text-gray-500 mr-4" />
              <div>
                <span className="text-base text-gray-900 dark:text-white">Notificações de grupos</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">Receber notificações de grupos</p>
              </div>
            </div>
            <Switch 
              checked={groupNotifications}
              onCheckedChange={(value) => handleSettingChange("groupNotifications", value)}
            />
          </div>
        </div>

        <Separator className="my-4" />

        {/* Sound */}
        <div className="p-4 border-b border-gray-100 dark:border-whatsapp-elevated">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Volume2 className="h-6 w-6 text-gray-500 mr-4" />
              <span className="text-base text-gray-900 dark:text-white">Som</span>
            </div>
            <Switch 
              checked={soundEnabled}
              onCheckedChange={(value) => handleSettingChange("soundEnabled", value)}
            />
          </div>
        </div>

        {/* Vibration */}
        <div className="p-4 border-b border-gray-100 dark:border-whatsapp-elevated">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-6 h-6 mr-4 flex items-center justify-center">
                <div className="w-4 h-4 bg-gray-500 rounded"></div>
              </div>
              <span className="text-base text-gray-900 dark:text-white">Vibração</span>
            </div>
            <Switch 
              checked={vibrationEnabled}
              onCheckedChange={(value) => handleSettingChange("vibrationEnabled", value)}
            />
          </div>
        </div>

        {/* Notification Sound */}
        <div className="p-4 border-b border-gray-100 dark:border-whatsapp-elevated">
          <div className="mb-2">
            <span className="text-base text-gray-900 dark:text-white">Som de notificação</span>
          </div>
          <Select 
            value={notificationSound} 
            onValueChange={(value) => handleSettingChange("notificationSound", value)}
          >
            <SelectTrigger>
              {notificationSound && (
                <div className="flex items-center space-x-1">
                  <span>🔊</span>
                  <span>
                    {notificationSound === "default" ? "Padrão" :
                     notificationSound === "chime" ? "Sino" :
                     notificationSound === "ding" ? "Ding" :
                     notificationSound === "pop" ? "Pop" :
                     notificationSound === "whistle" ? "Assobio" :
                     notificationSound}
                  </span>
                </div>
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Padrão</SelectItem>
              <SelectItem value="chime">Sino</SelectItem>
              <SelectItem value="ding">Ding</SelectItem>
              <SelectItem value="pop">Pop</SelectItem>
              <SelectItem value="whistle">Assobio</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Ringtone */}
        <div className="p-4">
          <div className="mb-2">
            <span className="text-base text-gray-900 dark:text-white">Toque de chamada</span>
          </div>
          <Select 
            value={ringtone} 
            onValueChange={(value) => handleSettingChange("ringtone", value)}
          >
            <SelectTrigger>
              {ringtone && (
                <div className="flex items-center space-x-1">
                  <span>🔔</span>
                  <span>
                    {ringtone === "default" ? "Padrão" :
                     ringtone === "classic" ? "Clássico" :
                     ringtone === "modern" ? "Moderno" :
                     ringtone === "jazz" ? "Jazz" :
                     ringtone === "electronic" ? "Eletrônico" :
                     ringtone}
                  </span>
                </div>
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Padrão</SelectItem>
              <SelectItem value="classic">Clássico</SelectItem>
              <SelectItem value="modern">Moderno</SelectItem>
              <SelectItem value="jazz">Jazz</SelectItem>
              <SelectItem value="electronic">Eletrônico</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
