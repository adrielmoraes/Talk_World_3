import { useState } from "react";
import { useLocation } from "wouter";
import { Search, MessageCircle, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import type { ContactsResponse, Contact } from "@/types/api";

interface ContactSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactSelect?: (contact: Contact) => void;
  title?: string;
  actionType?: 'chat' | 'call';
}

export default function ContactSelector({ 
  open, 
  onOpenChange, 
  onContactSelect,
  title = "Selecionar Contato",
  actionType = 'chat'
}: ContactSelectorProps) {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: contactsData, isLoading } = useQuery<ContactsResponse>({
    queryKey: ["/api/contacts"],
    enabled: !!localStorage.getItem("token") && open,
  });

  const contacts = contactsData?.contacts || [];
  const registeredContacts = contacts.filter((c: Contact) => c.isRegistered);
  
  const filteredContacts = registeredContacts.filter((contact: Contact) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      contact.contactName?.toLowerCase().includes(query) ||
      contact.phoneNumber?.includes(query)
    );
  });

  const startChat = async (contact: Contact) => {
    if (contact.isRegistered && contact.contactUserId) {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/conversations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ contactUserId: contact.contactUserId }),
        });
        
        if (!response.ok) {
          throw new Error("Failed to create conversation");
        }
        
        const { conversation } = await response.json();
        onOpenChange(false);
        setLocation(`/chat/${conversation.id}`);
      } catch (error) {
        console.error("Error creating conversation:", error);
      }
    }
  };

  const startCall = (contact: Contact) => {
    if (contact.isRegistered && contact.contactUserId) {
      onOpenChange(false);
      setLocation(`/call/${contact.contactUserId}`);
    }
  };

  const handleContactAction = (contact: Contact) => {
    if (onContactSelect) {
      onContactSelect(contact);
      return;
    }

    if (actionType === 'chat') {
      startChat(contact);
    } else if (actionType === 'call') {
      startCall(contact);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input 
            placeholder="Buscar contatos..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Contacts List */}
        <ScrollArea className="flex-1 max-h-96">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-whatsapp-primary"></div>
              <span className="ml-2">Carregando contatos...</span>
            </div>
          ) : filteredContacts.length > 0 ? (
            <div className="space-y-2">
              {filteredContacts.map((contact: Contact) => (
                <div
                  key={contact.id}
                  onClick={() => handleContactAction(contact)}
                  className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium mr-3">
                    {contact.contactName ? contact.contactName[0]?.toUpperCase() : <User className="h-5 w-5" />}
                  </div>
                  
                  {/* Contact Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {contact.contactName || contact.phoneNumber}
                    </h3>
                    {contact.contactName && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {contact.phoneNumber}
                      </p>
                    )}
                  </div>
                  
                  {/* Action Icon */}
                  <div className="ml-2">
                    {actionType === 'chat' ? (
                      <MessageCircle className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Phone className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <User className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                {searchQuery ? "Nenhum contato encontrado" : "Nenhum contato registrado"}
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {searchQuery 
                  ? "Tente uma busca diferente" 
                  : "Adicione contatos para começar a conversar"
                }
              </p>
            </div>
          )}
        </ScrollArea>
        
        {/* Footer */}
        <div className="flex justify-end space-x-2 mt-4 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button 
            onClick={() => {
              onOpenChange(false);
              setLocation("/app?tab=contacts");
            }}
            variant="outline"
          >
            Ver Todos os Contatos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}