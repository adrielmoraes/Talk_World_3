
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, MessageSquare, Languages, Globe, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export default function ConversationsSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [defaultTranslationEnabled, setDefaultTranslationEnabled] = useState(false);
  const [defaultTargetLanguage, setDefaultTargetLanguage] = useState("en-US");
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [showOriginalText, setShowOriginalText] = useState(true);
  const [archiveOldMessages, setArchiveOldMessages] = useState(false);
  const [messageRetentionDays, setMessageRetentionDays] = useState("30");

  const { data: settings } = useQuery({
    queryKey: ["/api/user/conversation-settings"],
    enabled: !!localStorage.getItem("token"),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settingsData: any) => {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/user/conversation-settings", {
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
      queryClient.invalidateQueries({ queryKey: ["/api/user/conversation-settings"] });
      toast({
        title: "Configurações salvas",
        description: "Suas preferências de conversas e tradução foram atualizadas.",
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
    if (settings?.settings) {
      const s = settings.settings;
      setDefaultTranslationEnabled(s.defaultTranslationEnabled ?? false);
      setDefaultTargetLanguage(s.defaultTargetLanguage ?? "en-US");
      setAutoTranslate(s.autoTranslate ?? true);
      setShowOriginalText(s.showOriginalText ?? true);
      setArchiveOldMessages(s.archiveOldMessages ?? false);
      setMessageRetentionDays(s.messageRetentionDays ?? "30");
    }
  }, [settings]);

  const handleSettingChange = (key: string, value: any) => {
    const newSettings = {
      defaultTranslationEnabled,
      defaultTargetLanguage,
      autoTranslate,
      showOriginalText,
      archiveOldMessages,
      messageRetentionDays,
      [key]: value,
    };

    updateSettingsMutation.mutate(newSettings);

    // Update local state
    switch (key) {
      case "defaultTranslationEnabled":
        setDefaultTranslationEnabled(value);
        break;
      case "defaultTargetLanguage":
        setDefaultTargetLanguage(value);
        break;
      case "autoTranslate":
        setAutoTranslate(value);
        break;
      case "showOriginalText":
        setShowOriginalText(value);
        break;
      case "archiveOldMessages":
        setArchiveOldMessages(value);
        break;
      case "messageRetentionDays":
        setMessageRetentionDays(value);
        break;
    }
  };

  const supportedLanguages = [
    { code: "pt-BR", name: "Português (Brasil)", flag: "🇧🇷" },
    { code: "en-US", name: "English (US)", flag: "🇺🇸" },
    { code: "es-ES", name: "Español", flag: "🇪🇸" },
    { code: "fr-FR", name: "Français", flag: "🇫🇷" },
    { code: "de-DE", name: "Deutsch", flag: "🇩🇪" },
    { code: "it-IT", name: "Italiano", flag: "🇮🇹" },
    { code: "ja-JP", name: "日本語", flag: "🇯🇵" },
    { code: "ko-KR", name: "한국어", flag: "🇰🇷" },
    { code: "zh-CN", name: "中文", flag: "🇨🇳" },
    { code: "ru-RU", name: "Русский", flag: "🇷🇺" },
    { code: "ar-SA", name: "العربية", flag: "🇸🇦" },
    { code: "hi-IN", name: "हिन्दी", flag: "🇮🇳" },
  ];

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
        <h1 className="text-lg font-medium">Conversas e Tradução</h1>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Translation Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Languages className="h-5 w-5 mr-2" />
              Configurações de Tradução
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-base">Tradução padrão habilitada</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Novas conversas terão tradução habilitada por padrão
                </p>
              </div>
              <Switch 
                checked={defaultTranslationEnabled}
                onCheckedChange={(value) => handleSettingChange("defaultTranslationEnabled", value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Idioma de tradução padrão
              </label>
              <Select 
                value={defaultTargetLanguage} 
                onValueChange={(value) => handleSettingChange("defaultTargetLanguage", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedLanguages.map((language) => (
                    <SelectItem key={language.code} value={language.code}>
                      <span className="flex items-center">
                        <span className="mr-2">{language.flag}</span>
                        {language.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-base">Tradução automática</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Traduzir mensagens automaticamente ao receber
                </p>
              </div>
              <Switch 
                checked={autoTranslate}
                onCheckedChange={(value) => handleSettingChange("autoTranslate", value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-base">Mostrar texto original</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Exibir texto original junto com a tradução
                </p>
              </div>
              <Switch 
                checked={showOriginalText}
                onCheckedChange={(value) => handleSettingChange("showOriginalText", value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Message Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Gerenciamento de Mensagens
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-base">Arquivar mensagens antigas</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Arquivar mensagens automaticamente após período definido
                </p>
              </div>
              <Switch 
                checked={archiveOldMessages}
                onCheckedChange={(value) => handleSettingChange("archiveOldMessages", value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Reter mensagens por
              </label>
              <Select 
                value={messageRetentionDays} 
                onValueChange={(value) => handleSettingChange("messageRetentionDays", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                  <SelectItem value="180">6 meses</SelectItem>
                  <SelectItem value="365">1 ano</SelectItem>
                  <SelectItem value="0">Nunca excluir</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Translation Quality */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              Qualidade da Tradução
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Mecanismo de tradução:</span>
                <span className="font-medium">Groq AI</span>
              </div>
              <div className="flex justify-between">
                <span>Idiomas suportados:</span>
                <span className="font-medium">{supportedLanguages.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Detecção automática:</span>
                <span className="font-medium">Habilitada</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
