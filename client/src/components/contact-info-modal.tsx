import { useState } from "react";
import { X, Phone, MessageCircle, User, Calendar, Globe, Settings, Star, Archive, Trash2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContactInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: {
    id: number;
    username: string;
    contactName?: string;
    phoneNumber?: string;
    profilePhoto?: string;
    preferredLanguage?: string;
    isOnline?: boolean;
    lastSeen?: string;
    bio?: string;
    joinedAt?: string;
  };
  conversationId?: string;
}

export default function ContactInfoModal({ open, onOpenChange, contact, conversationId }: ContactInfoModalProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleStartCall = () => {
    setLocation(`/voice-call/${contact.id}`);
    onOpenChange(false);
  };

  const handleSendMessage = () => {
    if (conversationId) {
      onOpenChange(false);
    } else {
      setLocation(`/chat/${contact.id}`);
      onOpenChange(false);
    }
  };

  const handleEditContact = () => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "A edição de contatos será implementada em breve"
    });
  };

  const handleBlockContact = () => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "O bloqueio de contatos será implementado em breve"
    });
  };

  const getLanguageName = (code: string) => {
    const languages: { [key: string]: string } = {
      'pt': 'Português',
      'en': 'Inglês',
      'es': 'Espanhol',
      'fr': 'Francês',
      'de': 'Alemão',
      'it': 'Italiano',
      'ja': 'Japonês',
      'ko': 'Coreano',
      'zh': 'Chinês',
      'ru': 'Russo',
      'ar': 'Árabe'
    };
    return languages[code] || code;
  };

  const getLanguageFlag = (code: string) => {
    const flags: { [key: string]: string } = {
      'pt': '🇧🇷',
      'en': '🇺🇸',
      'es': '🇪🇸',
      'fr': '🇫🇷',
      'de': '🇩🇪',
      'it': '🇮🇹',
      'ja': '🇯🇵',
      'ko': '🇰🇷',
      'zh': '🇨🇳',
      'ru': '🇷🇺',
      'ar': '🇸🇦'
    };
    return flags[code] || '🌐';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Informações do Contato</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Profile Section */}
          <div className="flex flex-col items-center text-center space-y-3">
            {contact.profilePhoto ? (
              <img 
                src={contact.profilePhoto}
                alt={`${contact.username}'s profile`}
                className="w-24 h-24 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    contact.contactName || contact.username || '?'
                  )}&background=128C7E&color=fff&size=96`;
                }}
              />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-2xl">
                {contact.username?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            
            <div>
              <h3 className="text-xl font-semibold">
                {contact.contactName || contact.username}
              </h3>
              {contact.contactName && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  @{contact.username}
                </p>
              )}
            </div>
            
            {/* Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                contact.isOnline ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {contact.isOnline ? 'Online' : 
                 contact.lastSeen ? `Visto por último ${formatDistanceToNow(new Date(contact.lastSeen), { addSuffix: true, locale: ptBR })}` : 
                 'Offline'}
              </span>
            </div>
          </div>

          <Separator />

          {/* Contact Details */}
          <div className="space-y-4">
            {contact.phoneNumber && (
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Telefone</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{contact.phoneNumber}</p>
                </div>
              </div>
            )}
            
            {contact.preferredLanguage && (
              <div className="flex items-center space-x-3">
                <Globe className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Idioma Preferido</p>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {getLanguageName(contact.preferredLanguage)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {getLanguageFlag(contact.preferredLanguage)}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
            
            {contact.bio && (
              <div className="flex items-start space-x-3">
                <User className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Sobre</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{contact.bio}</p>
                </div>
              </div>
            )}
            
            {contact.joinedAt && (
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Membro desde</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(contact.joinedAt).toLocaleDateString('pt-BR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-3">
            <div className="flex space-x-3">
              <Button 
                onClick={handleSendMessage}
                className="flex-1"
                variant="default"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                {conversationId ? 'Continuar Chat' : 'Enviar Mensagem'}
              </Button>
              <Button 
                onClick={handleStartCall}
                className="flex-1"
                variant="outline"
              >
                <Phone className="w-4 h-4 mr-2" />
                Ligar
              </Button>
            </div>
            
            <div className="flex space-x-3">
              <Button 
                onClick={handleEditContact}
                className="flex-1"
                variant="outline"
              >
                <Settings className="w-4 h-4 mr-2" />
                Editar Contato
              </Button>
              <Button 
                onClick={handleBlockContact}
                className="flex-1"
                variant="outline"
              >
                <Shield className="w-4 h-4 mr-2" />
                Bloquear
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}