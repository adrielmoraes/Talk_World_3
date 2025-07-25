import type { User, Conversation, Message } from '@shared/schema';

// API Response types
export interface ConversationResponse {
  conversation: Conversation & {
    otherUser: User & {
      contactName?: string;
    };
  };
}

export interface MessagesResponse {
  messages: Message[];
}

export interface ConversationsResponse {
  conversations: (Conversation & {
    otherUser: User & {
      contactName?: string;
    };
    lastMessage?: Message;
    unreadCount?: number;
  })[];
}

export interface UserResponse {
  user: User;
}

export interface CallsResponse {
  calls: any[]; // Define proper call type if needed
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

export interface ContactsResponse {
  contacts: Contact[];
}

export interface ConversationSettings {
  defaultTranslationEnabled: boolean;
  defaultTargetLanguage: string;
  showOriginalText: boolean;
  archiveOldMessages: boolean;
  messageRetentionDays: string;
}

export interface ConversationSettingsResponse {
  settings: ConversationSettings;
}