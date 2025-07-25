import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Check } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import { supportedLanguages } from "@/i18n";

export function LanguageSelector() {
  const { currentLanguage, switchLanguage } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = (languageCode: string) => {
    switchLanguage(languageCode);
    setIsOpen(false);
  };

  const currentLangInfo = supportedLanguages.find(lang => lang.code === currentLanguage) || supportedLanguages[0];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="text-sm">{currentLangInfo.flag} {currentLangInfo.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {supportedLanguages.map((lang) => {
          const isSelected = lang.code === currentLanguage;
          
          return (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{lang.flag}</span>
                <span className="text-sm">{lang.name}</span>
              </div>
              {isSelected && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}