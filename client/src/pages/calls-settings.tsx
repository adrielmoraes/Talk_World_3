
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Phone, Mic, Video, Volume2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export default function CallsSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [enableVoiceTranslation, setEnableVoiceTranslation] = useState(true);
  const [voiceTranslationLanguage, setVoiceTranslationLanguage] = useState("en-US");
  const [enableEchoCancellation, setEnableEchoCancellation] = useState(true);
  const [enableNoiseSuppression, setEnableNoiseSuppression] = useState(true);
  const [microphoneVolume, setMicrophoneVolume] = useState([80]);
  const [speakerVolume, setSpeakerVolume] = useState([70]);
  const [defaultCallType, setDefaultCallType] = useState("voice");
  const [autoAnswer, setAutoAnswer] = useState(false);
  const [callWaiting, setCallWaiting] = useState(true);

  const { data: settings } = useQuery({
    queryKey: ["/api/user/call-settings"],
    enabled: !!localStorage.getItem("token"),
  }) as { data?: { settings?: any } };

  const updateSettingsMutation = useMutation({
    mutationFn: async (settingsData: any) => {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/user/call-settings", {
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
      queryClient.invalidateQueries({ queryKey: ["/api/user/call-settings"] });
      toast({
        title: "Configurações salvas",
        description: "Suas preferências de chamadas foram atualizadas.",
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
      setEnableVoiceTranslation(s.enableVoiceTranslation ?? true);
      setVoiceTranslationLanguage(s.voiceTranslationLanguage ?? "en-US");
      setEnableEchoCancellation(s.enableEchoCancellation ?? true);
      setEnableNoiseSuppression(s.enableNoiseSuppression ?? true);
      setMicrophoneVolume([s.microphoneVolume ?? 80]);
      setSpeakerVolume([s.speakerVolume ?? 70]);
      setDefaultCallType(s.defaultCallType ?? "voice");
      setAutoAnswer(s.autoAnswer ?? false);
      setCallWaiting(s.callWaiting ?? true);
    }
  }, [settings]);

  const handleSettingChange = (key: string, value: any) => {
    const newSettings = {
      enableVoiceTranslation,
      voiceTranslationLanguage,
      enableEchoCancellation,
      enableNoiseSuppression,
      microphoneVolume: microphoneVolume[0],
      speakerVolume: speakerVolume[0],
      defaultCallType,
      autoAnswer,
      callWaiting,
      [key]: value,
    };

    updateSettingsMutation.mutate(newSettings);

    // Update local state
    switch (key) {
      case "enableVoiceTranslation":
        setEnableVoiceTranslation(value);
        break;
      case "voiceTranslationLanguage":
        setVoiceTranslationLanguage(value);
        break;
      case "enableEchoCancellation":
        setEnableEchoCancellation(value);
        break;
      case "enableNoiseSuppression":
        setEnableNoiseSuppression(value);
        break;
      case "microphoneVolume":
        setMicrophoneVolume([value]);
        break;
      case "speakerVolume":
        setSpeakerVolume([value]);
        break;
      case "defaultCallType":
        setDefaultCallType(value);
        break;
      case "autoAnswer":
        setAutoAnswer(value);
        break;
      case "callWaiting":
        setCallWaiting(value);
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
        <h1 className="text-lg font-medium">Configurações de Chamadas</h1>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Voice Translation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Phone className="h-5 w-5 mr-2" />
              Tradução de Voz
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-base">Tradução de voz em tempo real</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Traduzir automaticamente durante chamadas
                </p>
              </div>
              <Switch 
                checked={enableVoiceTranslation}
                onCheckedChange={(value) => handleSettingChange("enableVoiceTranslation", value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Idioma para tradução de voz
              </label>
              <Select 
                value={voiceTranslationLanguage} 
                onValueChange={(value) => handleSettingChange("voiceTranslationLanguage", value)}
              >
                <SelectTrigger>
                  {voiceTranslationLanguage && (
                    <div className="flex items-center space-x-1">
                      {supportedLanguages.find(lang => lang.code === voiceTranslationLanguage) && (
                        <>
                          <span>{supportedLanguages.find(lang => lang.code === voiceTranslationLanguage)?.flag}</span>
                          <span>{voiceTranslationLanguage}</span>
                        </>
                      )}
                    </div>
                  )}
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
          </CardContent>
        </Card>

        {/* Audio Quality */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Volume2 className="h-5 w-5 mr-2" />
              Qualidade do Áudio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-base">Cancelamento de eco</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Reduzir eco durante chamadas
                </p>
              </div>
              <Switch 
                checked={enableEchoCancellation}
                onCheckedChange={(value) => handleSettingChange("enableEchoCancellation", value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-base">Supressão de ruído</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Reduzir ruído de fundo
                </p>
              </div>
              <Switch 
                checked={enableNoiseSuppression}
                onCheckedChange={(value) => handleSettingChange("enableNoiseSuppression", value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Volume do microfone: {microphoneVolume[0]}%
              </label>
              <Slider
                value={microphoneVolume}
                onValueChange={(value) => handleSettingChange("microphoneVolume", value[0])}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Volume do alto-falante: {speakerVolume[0]}%
              </label>
              <Slider
                value={speakerVolume}
                onValueChange={(value) => handleSettingChange("speakerVolume", value[0])}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Call Behavior */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings2 className="h-5 w-5 mr-2" />
              Comportamento de Chamadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Tipo de chamada padrão
              </label>
              <Select 
                value={defaultCallType} 
                onValueChange={(value) => handleSettingChange("defaultCallType", value)}
              >
                <SelectTrigger>
                  {defaultCallType && (
                    <div className="flex items-center space-x-1">
                      {defaultCallType === "voice" ? (
                        <>
                          <Phone className="h-4 w-4" />
                          <span>Chamada de voz</span>
                        </>
                      ) : defaultCallType === "video" ? (
                        <>
                          <Video className="h-4 w-4" />
                          <span>Chamada de vídeo</span>
                        </>
                      ) : (
                        <span>{defaultCallType}</span>
                      )}
                    </div>
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="voice">
                    <span className="flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      Chamada de voz
                    </span>
                  </SelectItem>
                  <SelectItem value="video">
                    <span className="flex items-center">
                      <Video className="h-4 w-4 mr-2" />
                      Chamada de vídeo
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-base">Atender automaticamente</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Atender chamadas automaticamente após 3 segundos
                </p>
              </div>
              <Switch 
                checked={autoAnswer}
                onCheckedChange={(value) => handleSettingChange("autoAnswer", value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-base">Chamada em espera</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Permitir chamadas em espera
                </p>
              </div>
              <Switch 
                checked={callWaiting}
                onCheckedChange={(value) => handleSettingChange("callWaiting", value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
