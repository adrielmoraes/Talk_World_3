import { MessageCircle, Phone, Users, Settings } from "lucide-react";

interface BottomNavigationProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export default function BottomNavigation({ currentTab, onTabChange }: BottomNavigationProps) {
  const tabs = [
    { id: "chats", icon: MessageCircle, label: "Chats" },
    { id: "calls", icon: Phone, label: "Chamadas" },
    { id: "contacts", icon: Users, label: "Contatos" },
    { id: "settings", icon: Settings, label: "Configurações" },
  ];

  return (
    <div className="bg-white dark:bg-whatsapp-surface border-t border-gray-200 dark:border-whatsapp-elevated">
      <div className="flex">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 py-3 px-4 text-center transition-colors ${
                currentTab === tab.id
                  ? "text-whatsapp-primary"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <Icon className="h-6 w-6 mb-1 mx-auto" />
              <div className="text-xs">{tab.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
