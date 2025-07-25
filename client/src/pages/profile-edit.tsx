
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Camera, User, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { UserResponse } from "@/types/api";

export default function ProfileEdit() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("pt-BR");
  const [profilePhoto, setProfilePhoto] = useState("");

  const { data: userData } = useQuery<UserResponse>({
    queryKey: ["/api/user/me"],
    enabled: !!localStorage.getItem("token"),
  });

  const uploadProfilePhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("profilePhoto", file);

      const response = await fetch("/api/user/profile-photo", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload profile photo");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setProfilePhoto(data.profilePhoto);
      queryClient.invalidateQueries({ queryKey: ["/api/user/me"] });
      toast({
        title: "Foto atualizada",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro no upload",
        description: error.message || "Não foi possível fazer upload da foto.",
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("user", JSON.stringify(data.user));
      queryClient.invalidateQueries({ queryKey: ["/api/user/me"] });
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
      setLocation("/app");
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar seu perfil. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (userData?.user) {
      setUsername(userData.user.username || "");
      setPhoneNumber(userData.user.phoneNumber || "");
      setPreferredLanguage(userData.user.preferredLanguage || "pt-BR");
      setProfilePhoto(userData.user.profilePhoto || "");
    }
  }, [userData]);

  const handleSave = () => {
    updateProfileMutation.mutate({
      username,
      preferredLanguage,
    });
  };

  const handleProfilePhoto = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Validar tamanho do arquivo (5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "Arquivo muito grande",
            description: "A imagem deve ter no máximo 5MB.",
            variant: "destructive",
          });
          return;
        }

        // Validar tipo do arquivo
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          toast({
            title: "Formato inválido",
            description: "Use apenas arquivos JPEG, PNG ou WebP.",
            variant: "destructive",
          });
          return;
        }

        uploadProfilePhotoMutation.mutate(file);
      }
    };
    input.click();
  };

  const goBack = () => {
    setLocation("/app");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-whatsapp-dark">
      {/* Header */}
      <div className="bg-whatsapp-secondary text-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={goBack} className="mr-3">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-medium">Editar Perfil</h1>
        </div>
        <Button 
          onClick={handleSave}
          disabled={updateProfileMutation.isPending}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white hover:bg-opacity-20"
        >
          <Save className="h-4 w-4 mr-2" />
          Salvar
        </Button>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-sm mx-auto space-y-6">
          {/* Profile Photo */}
          <div className="text-center">
            <div className="relative inline-block">
              {profilePhoto ? (
                <img 
                  src={profilePhoto}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-2xl">
                  {username?.[0]?.toUpperCase() || "U"}
                </div>
              )}
              <button 
                onClick={handleProfilePhoto}
                disabled={uploadProfilePhotoMutation.isPending}
                className="absolute bottom-0 right-0 bg-whatsapp-primary text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-whatsapp-secondary transition-colors disabled:opacity-50"
              >
                {uploadProfilePhotoMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {profilePhoto ? "Toque para alterar foto" : "Toque para adicionar foto"}
            </p>
          </div>

          {/* Username */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome de usuário
            </Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite seu nome de usuário"
            />
          </div>

          {/* Phone Number (read-only) */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Número de telefone
            </Label>
            <Input
              value={phoneNumber}
              disabled
              className="bg-gray-100 dark:bg-whatsapp-elevated"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Não é possível alterar o número de telefone
            </p>
          </div>

          {/* Language Preference */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Idioma preferido
            </Label>
            <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
              <SelectTrigger>
                {preferredLanguage && (
                  <div className="flex items-center space-x-1">
                    <span>{preferredLanguage === "pt-BR" ? "🇧🇷" :
                          preferredLanguage === "en-US" ? "🇺🇸" :
                          preferredLanguage === "es-ES" ? "🇪🇸" :
                          preferredLanguage === "fr-FR" ? "🇫🇷" :
                          preferredLanguage === "de-DE" ? "🇩🇪" :
                          preferredLanguage === "it-IT" ? "🇮🇹" :
                          preferredLanguage === "ja-JP" ? "🇯🇵" :
                          preferredLanguage === "ko-KR" ? "🇰🇷" :
                          preferredLanguage === "zh-CN" ? "🇨🇳" :
                          ""}</span>
                    <span>{preferredLanguage}</span>
                  </div>
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">🇧🇷 Português (Brasil)</SelectItem>
                <SelectItem value="en-US">🇺🇸 English (US)</SelectItem>
                <SelectItem value="es-ES">🇪🇸 Español</SelectItem>
                <SelectItem value="fr-FR">🇫🇷 Français</SelectItem>
                <SelectItem value="de-DE">🇩🇪 Deutsch</SelectItem>
                <SelectItem value="it-IT">🇮🇹 Italiano</SelectItem>
                <SelectItem value="ja-JP">🇯🇵 日本語</SelectItem>
                <SelectItem value="ko-KR">🇰🇷 한국어</SelectItem>
                <SelectItem value="zh-CN">🇨🇳 中文</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
