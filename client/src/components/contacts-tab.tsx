import { useState } from "react";
import { useLocation } from "wouter";
import { 
  Phone, 
  MessageCircle, 
  Search, 
  UserPlus, 
  RefreshCw, 
  Users, 
  Smartphone,
  Check,
  X,
  Settings,
  Trash2,
  Edit3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useContacts } from "@/hooks/use-contacts";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ContactsTab() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [showAddContactDialog, setShowAddContactDialog] = useState(false);
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactName, setNewContactName] = useState("");
  
  const {
    contacts,
    syncHistory,
    syncProgress,
    isLoadingContacts,
    isSyncing,
    syncDeviceContacts,
    syncTestContacts,
    updateContactNickname,
    deleteContact,
    clearSyncProgress,
    addContactByPhone,
    findUsersByPhone,
  } = useContacts();

  // Filter contacts based on search
  const filteredContacts = contacts.filter(contact =>
    contact.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phoneNumber.includes(searchQuery) ||
    contact.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.contactUser?.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const registeredContacts = filteredContacts.filter(c => c.isRegistered);
  const unregisteredContacts = filteredContacts.filter(c => !c.isRegistered);

  const startChat = (contact: any) => {
    if (contact.isRegistered && contact.contactUserId) {
      // Find or create conversation with this user
      setLocation(`/chat/${contact.contactUserId}`);
    }
  };

  const startCall = (contact: any) => {
    if (contact.isRegistered && contact.contactUserId) {
      setLocation(`/call/${contact.contactUserId}`);
    }
  };

  const handleAddContact = async () => {
    if (!newContactPhone.trim()) return;
    
    try {
      await addContactByPhone(newContactPhone.trim(), newContactName.trim());
      setNewContactPhone("");
      setNewContactName("");
      setShowAddContactDialog(false);
    } catch (error) {
      console.error('Error adding contact:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Contatos
          </h2>
          <div className="flex space-x-2">
            <Dialog open={showAddContactDialog} onOpenChange={setShowAddContactDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Contato</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome (opcional)</label>
                    <Input
                      placeholder="Digite o nome do contato"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Número de telefone *</label>
                    <Input
                      placeholder="+55 11 99999-9999"
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleAddContact}
                      disabled={!newContactPhone.trim()}
                      className="flex-1"
                    >
                      Adicionar Contato
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddContactDialog(false);
                        setNewContactPhone("");
                        setNewContactName("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sincronizar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Sincronizar Contatos</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Sincronize seus contatos para encontrar amigos que já usam o Talk World.
                  </p>
                  
                  {syncProgress && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Status:</span>
                            <Badge variant={syncProgress.status === 'completed' ? 'default' : 'secondary'}>
                              {syncProgress.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Contatos sincronizados:</span>
                            <span>{syncProgress.syncedContacts}/{syncProgress.totalContacts}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Registrados no Talk World:</span>
                            <span className="font-medium text-green-600">{syncProgress.registeredContacts}</span>
                          </div>
                          <Progress 
                            value={(syncProgress.syncedContacts / syncProgress.totalContacts) * 100} 
                            className="mt-2"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex space-x-2">
                    <Button 
                      onClick={syncDeviceContacts} 
                      disabled={isSyncing}
                      className="flex-1"
                    >
                      {isSyncing ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Smartphone className="h-4 w-4 mr-2" />
                      )}
                      Sincronizar do Dispositivo
                    </Button>
                    
                    <Button 
                      onClick={syncTestContacts} 
                      disabled={isSyncing}
                      variant="outline"
                      className="flex-1"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Teste (Demo)
                    </Button>
                  </div>

                  {syncProgress && (
                    <Button 
                      onClick={() => {
                        clearSyncProgress();
                        setShowSyncDialog(false);
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      Fechar
                    </Button>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input 
            placeholder="Buscar contatos..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingContacts ? (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Carregando contatos...</span>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    No Talk World
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold text-green-600">
                    {registeredContacts.length}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {contacts.length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Registered Contacts */}
            {registeredContacts.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  No Talk World ({registeredContacts.length})
                </h3>
                <div className="space-y-2">
                  {registeredContacts.map((contact) => (
                    <Card key={contact.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center">
                          <div className="relative">
                            {contact.contactUser?.profilePhoto ? (
                              <img 
                                src={contact.contactUser.profilePhoto}
                                alt={contact.contactName}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-medium">
                                {contact.contactName.charAt(0)}
                              </div>
                            )}
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                          </div>
                          
                          <div className="flex-1 ml-3">
                            <div className="flex items-center">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {contact.nickname || contact.contactName}
                              </h4>
                              {contact.contactUser?.isVerified && (
                                <Check className="h-4 w-4 text-blue-500 ml-1" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              @{contact.contactUser?.username}
                            </p>
                            <p className="text-xs text-gray-500">
                              {contact.phoneNumber}
                            </p>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => startChat(contact)}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => startCall(contact)}
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Unregistered Contacts */}
            {unregisteredContacts.length > 0 && (
              <div>
                <Separator className="my-4" />
                <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center">
                  <X className="h-5 w-5 text-gray-400 mr-2" />
                  Não cadastrados ({unregisteredContacts.length})
                </h3>
                <div className="space-y-2">
                  {unregisteredContacts.map((contact) => (
                    <Card key={contact.id} className="opacity-75">
                      <CardContent className="p-4">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 font-medium">
                            {contact.contactName.charAt(0)}
                          </div>
                          
                          <div className="flex-1 ml-3">
                            <h4 className="font-medium text-gray-700 dark:text-gray-300">
                              {contact.contactName}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {contact.phoneNumber}
                            </p>
                          </div>
                          
                          <Button size="sm" variant="outline" disabled>
                            <UserPlus className="h-4 w-4 mr-1" />
                            Convidar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {contacts.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Nenhum contato encontrado
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Sincronize seus contatos para encontrar amigos no Talk World
                </p>
                <Button onClick={() => setShowSyncDialog(true)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sincronizar Contatos
                </Button>
              </div>
            )}

            {/* Sync History */}
            {syncHistory.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                  Histórico de Sincronização
                </h3>
                <div className="space-y-2">
                  {syncHistory.slice(0, 3).map((session) => (
                    <div key={session.id} className="text-xs text-gray-500 flex justify-between">
                      <span>
                        {session.registeredContacts} de {session.totalContacts} contatos
                      </span>
                      <span>
                        {formatDistanceToNow(new Date(session.startedAt), { 
                          addSuffix: true,
                          locale: ptBR 
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}