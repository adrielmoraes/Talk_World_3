import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface DeviceContact {
  name: string;
  phoneNumber: string;
}

export interface Contact {
  id: number;
  userId: number;
  contactUserId?: number;
  contactName: string;
  phoneNumber: string;
  isRegistered: boolean;
  nickname?: string;
  syncedAt: string;
  createdAt: string;
  contactUser?: {
    id: number;
    username: string;
    profilePhoto?: string;
    isVerified: boolean;
  };
}

export interface ContactSyncSession {
  id: number;
  userId: number;
  totalContacts: number;
  syncedContacts: number;
  registeredContacts: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
}

export function useContacts() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<ContactSyncSession | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get user's contacts
  const { data: contactsData, isLoading: isLoadingContacts, refetch: refetchContacts } = useQuery({
    queryKey: ['/api/contacts'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Get sync history
  const { data: syncHistoryData, isLoading: isLoadingSyncHistory } = useQuery({
    queryKey: ['/api/contacts/sync-history'],
    staleTime: 60 * 1000, // Cache for 1 minute
  });

  // Sync contacts mutation
  const syncContactsMutation = useMutation({
    mutationFn: async (deviceContacts: DeviceContact[]) => {
      const response = await apiRequest('POST', '/api/contacts/sync', {
        contacts: deviceContacts,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setSyncProgress(data.syncSession);
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/sync-history'] });
      toast({
        title: "Sincronização concluída",
        description: `${data.syncSession.registeredContacts} contatos encontrados no Talk World`,
      });
    },
    onError: (error) => {
      console.error('Contact sync error:', error);
      toast({
        title: "Erro na sincronização",
        description: "Não foi possível sincronizar os contatos. Tente novamente.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSyncing(false);
    },
  });

  // Find users by phone numbers
  const findUsersMutation = useMutation({
    mutationFn: async (phoneNumbers: string[]) => {
      const response = await apiRequest('POST', '/api/contacts/find-users', {
        phoneNumbers,
      });
      return response.json();
    },
  });

  // Update contact nickname
  const updateNicknameMutation = useMutation({
    mutationFn: async ({ contactId, nickname }: { contactId: number; nickname: string }) => {
      const response = await apiRequest('PATCH', `/api/contacts/${contactId}/nickname`, {
        nickname,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      toast({
        title: "Apelido atualizado",
        description: "O apelido do contato foi alterado com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Update nickname error:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o apelido do contato.",
        variant: "destructive",
      });
    },
  });

  // Delete contact
  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: number) => {
      const response = await apiRequest('DELETE', `/api/contacts/${contactId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      toast({
        title: "Contato removido",
        description: "O contato foi removido da sua lista.",
      });
    },
    onError: (error) => {
      console.error('Delete contact error:', error);
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover o contato.",
        variant: "destructive",
      });
    },
  });

  // Add contact by user ID
  const addContactMutation = useMutation({
    mutationFn: async (contactUserId: number) => {
      const response = await apiRequest('POST', '/api/contacts/add-user', {
        contactUserId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      toast({
        title: "Contato adicionado",
        description: "O contato foi adicionado à sua lista.",
      });
    },
    onError: (error) => {
      console.error('Add contact error:', error);
      toast({
        title: "Erro ao adicionar",
        description: "Não foi possível adicionar o contato.",
        variant: "destructive",
      });
    },
  });

  // Request device contacts permission and sync
  const syncDeviceContacts = useCallback(async () => {
    setIsSyncing(true);
    setSyncProgress(null);

    try {
      // Check if Contacts API is supported
      if (!('contacts' in navigator)) {
        toast({
          title: "Não suportado",
          description: "Seu navegador não suporta acesso aos contatos. Use o app móvel para sincronizar.",
          variant: "destructive",
        });
        setIsSyncing(false);
        return;
      }

      // Request permission and get contacts (for mobile PWA)
      // Note: This is a simplified version. In a real app, you'd use:
      // 1. React Native Contacts API for mobile apps
      // 2. Contact Picker API for web (limited support)
      // 3. Manual contact input as fallback
      
      // For demo purposes, we'll simulate some contacts
      const mockDeviceContacts: DeviceContact[] = [
        { name: "João Silva", phoneNumber: "+5511987654321" },
        { name: "Maria Santos", phoneNumber: "+5511876543210" },
        { name: "Pedro Oliveira", phoneNumber: "+5511765432109" },
        { name: "Ana Costa", phoneNumber: "+5511654321098" },
        { name: "Carlos Pereira", phoneNumber: "+5511543210987" },
      ];

      // In a real implementation, you would:
      // const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: true });
      // const deviceContacts = contacts.map(contact => ({
      //   name: contact.name[0],
      //   phoneNumber: contact.tel[0]
      // }));

      await syncContactsMutation.mutateAsync(mockDeviceContacts);
    } catch (error) {
      console.error('Device contacts sync error:', error);
      toast({
        title: "Erro de permissão",
        description: "Não foi possível acessar os contatos do dispositivo.",
        variant: "destructive",
      });
      setIsSyncing(false);
    }
  }, [syncContactsMutation, toast]);

  // Manual contact sync (for testing)
  const syncTestContacts = useCallback(async () => {
    const testContacts: DeviceContact[] = [
      { name: "Talk World User 1", phoneNumber: "+5511999888777" },
      { name: "Talk World User 2", phoneNumber: "+5511888777666" },
      { name: "Talk World User 3", phoneNumber: "+5511777666555" },
      { name: "Contato Não Registrado", phoneNumber: "+5511666555444" },
    ];

    setIsSyncing(true);
    await syncContactsMutation.mutateAsync(testContacts);
  }, [syncContactsMutation]);

  // Add contact by phone number
  const addContactByPhone = useCallback(async (phoneNumber: string, name?: string) => {
    try {
      // First, try to find if the user exists
      const users = await findUsersMutation.mutateAsync([phoneNumber]);
      
      if (users.users && users.users.length > 0) {
        // User exists, add them as a contact
        const user = users.users[0];
        await addContactMutation.mutateAsync(user.id);
        return user;
      } else {
        // User doesn't exist, create a manual contact entry
        const deviceContacts: DeviceContact[] = [
          { name: name || phoneNumber, phoneNumber }
        ];
        await syncContactsMutation.mutateAsync(deviceContacts);
        return null;
      }
    } catch (error) {
      console.error('Error adding contact by phone:', error);
      throw error;
    }
  }, [findUsersMutation, addContactMutation, syncContactsMutation]);

  // Find users by phone numbers
  const findUsersByPhone = useCallback(async (phoneNumbers: string[]) => {
    return await findUsersMutation.mutateAsync(phoneNumbers);
  }, [findUsersMutation]);

  return {
    // Data
    contacts: contactsData?.contacts || [],
    syncHistory: syncHistoryData?.history || [],
    syncProgress,
    
    // Loading states
    isLoadingContacts,
    isLoadingSyncHistory,
    isSyncing,
    isUpdatingNickname: updateNicknameMutation.isPending,
    isDeletingContact: deleteContactMutation.isPending,
    isAddingContact: addContactMutation.isPending,
    
    // Actions
    syncDeviceContacts,
    syncTestContacts,
    findUsersByPhoneNumbers: findUsersMutation.mutateAsync,
    updateContactNickname: updateNicknameMutation.mutateAsync,
    deleteContact: deleteContactMutation.mutateAsync,
    addContact: addContactMutation.mutateAsync,
    addContactByPhone,
    findUsersByPhone,
    refetchContacts,
    
    // Clear sync progress
    clearSyncProgress: () => setSyncProgress(null),
  };
}