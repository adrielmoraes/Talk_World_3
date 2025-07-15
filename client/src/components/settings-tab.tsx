import { useLocation } from "wouter";
import { 
  User, 
  Settings, 
  MessageSquare, 
  Phone, 
  Bell, 
  Database, 
  HelpCircle, 
  Moon, 
  ChevronRight 
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function SettingsTab() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: userData } = useQuery({
    queryKey: ["/api/user/me"],
    enabled: !!localStorage.getItem("token"),
  });

  const user = userData?.user || JSON.parse(localStorage.getItem("user") || "{}");

  const handleEditProfile = () => {
    toast({
      title: "Recurso não implementado",
      description: "Edição de perfil será implementada em versão futura.",
    });
  };

  const handleSettingClick = (setting: string) => {
    toast({
      title: "Recurso não implementado",
      description: `Configurações de ${setting} serão implementadas em versão futura.`,
    });
  };

  const toggleDarkMode = () => {
    const isDark = document.documentElement.classList.contains("dark");
    const newDarkMode = !isDark;
    
    localStorage.setItem("darkMode", newDarkMode.toString());
    
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("phoneNumber");
    setLocation("/");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-whatsapp-secondary text-white p-4">
        <h1 className="text-lg font-medium">Configurações</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-whatsapp-dark">
        {/* Profile Section */}
        <div 
          onClick={handleEditProfile}
          className="p-4 border-b border-gray-100 dark:border-whatsapp-elevated cursor-pointer hover:bg-gray-50 dark:hover:bg-whatsapp-elevated"
        >
          <div className="flex items-center">
            {user.profilePhoto ? (
              <img 
                src={user.profilePhoto}
                alt="Your profile picture"
                className="w-16 h-16 rounded-full object-cover mr-4"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-xl mr-4">
                {user.username?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {user.username || "@seuusuario"}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user.phoneNumber || "+55 11 99999-0000"}
              </p>
              <p className="text-xs text-whatsapp-primary mt-1">Toque para editar perfil</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* Settings Options */}
        <div className="space-y-1">
          {/* Account */}
          <div 
            onClick={() => handleSettingClick("conta")}
            className="p-4 border-b border-gray-100 dark:border-whatsapp-elevated cursor-pointer hover:bg-gray-50 dark:hover:bg-whatsapp-elevated"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <User className="h-6 w-6 text-gray-500 mr-4" />
                <span className="text-base text-gray-900 dark:text-white">Conta</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Conversations & Translation */}
          <div 
            onClick={() => handleSettingClick("conversas e tradução")}
            className="p-4 border-b border-gray-100 dark:border-whatsapp-elevated cursor-pointer hover:bg-gray-50 dark:hover:bg-whatsapp-elevated"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <MessageSquare className="h-6 w-6 text-gray-500 mr-4" />
                <span className="text-base text-gray-900 dark:text-white">Conversas e Tradução</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Calls */}
          <div 
            onClick={() => handleSettingClick("chamadas")}
            className="p-4 border-b border-gray-100 dark:border-whatsapp-elevated cursor-pointer hover:bg-gray-50 dark:hover:bg-whatsapp-elevated"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Phone className="h-6 w-6 text-gray-500 mr-4" />
                <span className="text-base text-gray-900 dark:text-white">Chamadas</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Notifications */}
          <div 
            onClick={() => handleSettingClick("notificações")}
            className="p-4 border-b border-gray-100 dark:border-whatsapp-elevated cursor-pointer hover:bg-gray-50 dark:hover:bg-whatsapp-elevated"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Bell className="h-6 w-6 text-gray-500 mr-4" />
                <span className="text-base text-gray-900 dark:text-white">Notificações</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Storage & Data */}
          <div 
            onClick={() => handleSettingClick("armazenamento e dados")}
            className="p-4 border-b border-gray-100 dark:border-whatsapp-elevated cursor-pointer hover:bg-gray-50 dark:hover:bg-whatsapp-elevated"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Database className="h-6 w-6 text-gray-500 mr-4" />
                <span className="text-base text-gray-900 dark:text-white">Armazenamento e Dados</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Help */}
          <div 
            onClick={() => handleSettingClick("ajuda")}
            className="p-4 border-b border-gray-100 dark:border-whatsapp-elevated cursor-pointer hover:bg-gray-50 dark:hover:bg-whatsapp-elevated"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <HelpCircle className="h-6 w-6 text-gray-500 mr-4" />
                <span className="text-base text-gray-900 dark:text-white">Ajuda</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Dark Mode Toggle */}
          <div className="p-4 border-b border-gray-100 dark:border-whatsapp-elevated">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Moon className="h-6 w-6 text-gray-500 mr-4" />
                <span className="text-base text-gray-900 dark:text-white">Modo Escuro</span>
              </div>
              <Switch 
                checked={document.documentElement.classList.contains("dark")}
                onCheckedChange={toggleDarkMode}
              />
            </div>
          </div>

          {/* Logout */}
          <div 
            onClick={handleLogout}
            className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-whatsapp-elevated"
          >
            <div className="flex items-center">
              <Settings className="h-6 w-6 text-red-500 mr-4" />
              <span className="text-base text-red-500">Sair</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
