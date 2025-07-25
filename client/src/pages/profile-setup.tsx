import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, User, UserIcon, Heart } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ProfileSetupScreen() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("pt-BR");
  const [profilePhoto, setProfilePhoto] = useState("");
  const { toast } = useToast();

  const completeProfileMutation = useMutation({
    mutationFn: async (data: {
      username: string;
      gender: string;
      preferredLanguage: string;
      profilePhoto?: string;
    }) => {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("user", JSON.stringify(data.user));
      setLocation("/app");
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao configurar perfil. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!username || !gender) return;
    
    completeProfileMutation.mutate({
      username,
      gender,
      preferredLanguage,
      profilePhoto,
    });
  };

  const uploadProfilePhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append('profilePhoto', file);
      
      const response = await fetch("/api/user/profile-photo", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setProfilePhoto(data.profilePhoto);
      toast({
        title: "Sucesso",
        description: "Foto de perfil atualizada com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao fazer upload da foto. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleProfilePhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/jpg,image/png,image/webp';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "Erro",
            description: "A imagem deve ter no máximo 5MB.",
            variant: "destructive",
          });
          return;
        }
        
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          toast({
            title: "Erro",
            description: "Apenas arquivos de imagem (JPEG, PNG, WebP) são permitidos.",
            variant: "destructive",
          });
          return;
        }
        
        uploadProfilePhotoMutation.mutate(file);
      }
    };
    input.click();
  };

  const isValid = username.length >= 3 && gender;

  return (
    <div className="min-h-screen bg-white dark:bg-whatsapp-dark">
      {/* Header */}
      <div className="bg-whatsapp-secondary text-white p-4">
        <h1 className="text-lg font-medium text-center">Configurar Perfil</h1>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-sm mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">
              Quase pronto!
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Configure seu perfil para começar a usar o Talk World
            </p>
          </div>

          {/* Profile Photo */}
          <div className="text-center mb-6">
            <div className="relative inline-block">
              <div className="w-24 h-24 bg-gray-200 dark:bg-whatsapp-elevated rounded-full flex items-center justify-center overflow-hidden">
                {profilePhoto ? (
                  <img 
                    src={profilePhoto} 
                    alt="Foto de perfil" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-8 w-8 text-gray-400" />
                )}
              </div>
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
          <div className="mb-4">
            <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome de usuário*
            </Label>
            <Input 
              type="text" 
              placeholder="@seunome"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Gender Selection */}
          <div className="mb-4">
            <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sexo (para personalização de voz)*
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setGender("male")}
                className={`border ${gender === "male" ? "border-whatsapp-primary bg-whatsapp-primary bg-opacity-5" : "border-gray-300 dark:border-gray-600"} rounded-lg p-3 text-center hover:border-whatsapp-primary hover:bg-whatsapp-primary hover:bg-opacity-5 transition-colors`}
              >
                <UserIcon className="mx-auto h-6 w-6 text-blue-500 mb-2" />
                <div className="text-sm text-gray-700 dark:text-gray-300">Masculino</div>
              </button>
              <button 
                onClick={() => setGender("female")}
                className={`border ${gender === "female" ? "border-whatsapp-primary bg-whatsapp-primary bg-opacity-5" : "border-gray-300 dark:border-gray-600"} rounded-lg p-3 text-center hover:border-whatsapp-primary hover:bg-whatsapp-primary hover:bg-opacity-5 transition-colors`}
              >
                <Heart className="mx-auto h-6 w-6 text-pink-500 mb-2" />
                <div className="text-sm text-gray-700 dark:text-gray-300">Feminino</div>
              </button>
            </div>
          </div>

          {/* Language Preference */}
          <div className="mb-8">
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

          {/* Complete Button */}
          <Button 
            onClick={handleSubmit}
            disabled={!isValid || completeProfileMutation.isPending}
            className="w-full bg-whatsapp-primary hover:bg-whatsapp-secondary"
          >
            {completeProfileMutation.isPending ? "Configurando..." : "Concluir"}
          </Button>
        </div>
      </div>
    </div>
  );
}
