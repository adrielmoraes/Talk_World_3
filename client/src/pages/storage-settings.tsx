
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Database, Trash2, Download, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export default function StorageSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [autoDownloadPhotos, setAutoDownloadPhotos] = useState(true);
  const [autoDownloadVideos, setAutoDownloadVideos] = useState(false);
  const [autoDownloadAudio, setAutoDownloadAudio] = useState(true);

  const { data: storageData } = useQuery({
    queryKey: ["/api/user/storage"],
    enabled: !!localStorage.getItem("token"),
  });

  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/user/clear-cache", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to clear cache");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/storage"] });
      toast({
        title: "Cache limpo",
        description: "Cache temporário foi limpo com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível limpar o cache.",
        variant: "destructive",
      });
    },
  });

  const deleteAllDataMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/user/delete-all-data", {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete data");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Dados removidos",
        description: "Todos os dados foram removidos com sucesso.",
      });
      // Logout user
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível remover os dados.",
        variant: "destructive",
      });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/user/download-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error("Failed to update settings");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configurações salvas",
        description: "Suas preferências de download foram atualizadas.",
      });
    },
  });

  useEffect(() => {
    if (storageData?.settings) {
      const s = storageData.settings;
      setAutoDownloadPhotos(s.autoDownloadPhotos ?? true);
      setAutoDownloadVideos(s.autoDownloadVideos ?? false);
      setAutoDownloadAudio(s.autoDownloadAudio ?? true);
    }
  }, [storageData]);

  const handleSettingChange = (key: string, value: boolean) => {
    const newSettings = {
      autoDownloadPhotos,
      autoDownloadVideos,
      autoDownloadAudio,
      [key]: value,
    };

    updateSettingsMutation.mutate(newSettings);

    switch (key) {
      case "autoDownloadPhotos":
        setAutoDownloadPhotos(value);
        break;
      case "autoDownloadVideos":
        setAutoDownloadVideos(value);
        break;
      case "autoDownloadAudio":
        setAutoDownloadAudio(value);
        break;
    }
  };

  const handleClearCache = () => {
    clearCacheMutation.mutate();
  };

  const handleDeleteAllData = () => {
    if (window.confirm("Tem certeza que deseja remover todos os seus dados? Esta ação não pode ser desfeita.")) {
      deleteAllDataMutation.mutate();
    }
  };

  const goBack = () => {
    setLocation("/app");
  };

  const storage = storageData?.storage || {
    totalUsed: 0,
    photos: 0,
    videos: 0,
    audio: 0,
    cache: 0,
    total: 1000,
  };

  const usagePercentage = (storage.totalUsed / storage.total) * 100;

  return (
    <div className="min-h-screen bg-white dark:bg-whatsapp-dark">
      {/* Header */}
      <div className="bg-whatsapp-secondary text-white p-4 flex items-center">
        <button onClick={goBack} className="mr-3">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-medium">Armazenamento e Dados</h1>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Storage Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <HardDrive className="h-5 w-5 mr-2" />
              Uso de Armazenamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Usado: {storage.totalUsed}MB</span>
                <span>Total: {storage.total}MB</span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>📷 Fotos</span>
                <span>{storage.photos}MB</span>
              </div>
              <div className="flex justify-between">
                <span>🎥 Vídeos</span>
                <span>{storage.videos}MB</span>
              </div>
              <div className="flex justify-between">
                <span>🔊 Áudios</span>
                <span>{storage.audio}MB</span>
              </div>
              <div className="flex justify-between">
                <span>🗂️ Cache</span>
                <span>{storage.cache}MB</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auto Download Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Download className="h-5 w-5 mr-2" />
              Download Automático
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-base">Fotos</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">Baixar fotos automaticamente</p>
              </div>
              <Switch 
                checked={autoDownloadPhotos}
                onCheckedChange={(value) => handleSettingChange("autoDownloadPhotos", value)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <span className="text-base">Vídeos</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">Baixar vídeos automaticamente</p>
              </div>
              <Switch 
                checked={autoDownloadVideos}
                onCheckedChange={(value) => handleSettingChange("autoDownloadVideos", value)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <span className="text-base">Áudios</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">Baixar mensagens de voz automaticamente</p>
              </div>
              <Switch 
                checked={autoDownloadAudio}
                onCheckedChange={(value) => handleSettingChange("autoDownloadAudio", value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Storage Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Gerenciar Armazenamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleClearCache}
              disabled={clearCacheMutation.isPending}
              variant="outline" 
              className="w-full justify-start"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Cache ({storage.cache}MB)
            </Button>
            
            <Button 
              onClick={handleDeleteAllData}
              disabled={deleteAllDataMutation.isPending}
              variant="destructive" 
              className="w-full justify-start"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remover Todos os Dados
            </Button>
            
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Atenção: Remover todos os dados irá excluir permanentemente suas conversas, 
              contatos e configurações. Esta ação não pode ser desfeita.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
