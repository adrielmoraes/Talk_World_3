import { 
  users, 
  otpCodes, 
  contacts, 
  conversations, 
  messages, 
  calls, 
  contactSyncSessions,
  userActivity,
  notificationSettings,
  userStorageData,
  conversationSettings,
  messageReactions,
  type User,
  type OtpCode,
  type Contact,
  type Conversation,
  type Message,
  type Call,
  type ContactSyncSession,
  type UserActivity,

  insertUserSchema,
  insertOtpSchema,
  insertContactSchema,
  insertConversationSchema,
  insertMessageSchema,
  insertCallSchema,
  insertContactSyncSessionSchema,
  insertUserActivitySchema,
  insertNotificationSettingsSchema,
  insertUserStorageDataSchema,
  insertConversationSettingsSchema,
  insertMessageReactionSchema,
} from "../shared/schema";
import { db } from "./db";
import { eq, and, or, desc, inArray, ne } from "drizzle-orm";

// Storage interface
// Type definitions for storage interface
type InsertUser = typeof users.$inferInsert;
type InsertOtpCode = typeof otpCodes.$inferInsert;
type InsertContact = typeof contacts.$inferInsert;
type InsertConversation = typeof conversations.$inferInsert;
type InsertMessage = typeof messages.$inferInsert;
type InsertCall = typeof calls.$inferInsert;
type InsertContactSyncSession = typeof contactSyncSessions.$inferInsert;
type InsertUserActivity = typeof userActivity.$inferInsert;
type InsertNotificationSettings = typeof notificationSettings.$inferInsert;
type InsertUserStorageData = typeof userStorageData.$inferInsert;
type InsertConversationSettings = typeof conversationSettings.$inferInsert;
type InsertMessageReaction = typeof messageReactions.$inferInsert;

// Local type definitions
type NotificationSettings = typeof notificationSettings.$inferSelect;
type UserStorageData = typeof userStorageData.$inferSelect;
type ConversationSettings = typeof conversationSettings.$inferSelect;
type MessageReaction = typeof messageReactions.$inferSelect;

// Types are now imported from schema

// Extended types for joined queries
type ContactWithUser = Contact & {
  user: {
    id: number;
    username: string;
    phoneNumber: string;
    preferredLanguage: string;
    profilePhoto?: string | null;
    isVerified: boolean;
  } | null;
};

type ConversationWithParticipant = {
  id: number;
  translationEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  participant1Id: number;
  participant2Id: number;
  otherUser: {
    id: number;
    username: string;
    profilePhoto: string | null;
    isVerified: boolean;
  };
};

type MessageWithSender = Message & {
  sender: {
    id: number;
    username: string;
    profilePhoto?: string | null;
  };
  reactions?: MessageReaction[];
};

type CallWithCaller = Call & {
  caller: {
    id: number;
    username: string;
    profilePhoto?: string | null;
  };
};



type UserLastSeen = {
  userId: number;
  lastSeenAt: Date | null;
  isOnline: boolean;
};

interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;

  // OTP methods
  createOtpCode(insertOtp: InsertOtpCode): Promise<OtpCode>;
  getValidOtpCode(phoneNumber: string, code: string): Promise<OtpCode | undefined>;
  markOtpAsUsed(id: number): Promise<void>;

  // Contact methods
  getUserContacts(userId: number): Promise<ContactWithUser[]>;
  addContact(userId: number, contactUserId: number, contactName?: string, phoneNumber?: string): Promise<Contact>;
  syncContacts(userId: number, contacts: Array<{name: string, phoneNumber: string}>): Promise<ContactSyncSession>;
  findUsersByPhoneNumbers(phoneNumbers: string[]): Promise<User[]>;
  updateContactNickname(contactId: number, nickname: string): Promise<Contact>;
  deleteContact(contactId: number): Promise<void>;
  getContactSyncHistory(userId: number): Promise<ContactSyncSession[]>;

  // Conversation methods
  getUserConversations(userId: number): Promise<ConversationWithParticipant[]>;
  getConversationById(id: number, userId: number): Promise<ConversationWithParticipant | null>;
  getConversationByParticipants(user1Id: number, user2Id: number): Promise<Conversation | undefined>;
  createConversation(insertConversation: InsertConversation): Promise<Conversation>;
  updateConversationTranslation(id: number, enabled: boolean): Promise<Conversation>;

  // Message methods
  createMessage(insertMessage: InsertMessage): Promise<Message>;
  getConversationMessages(conversationId: number): Promise<MessageWithSender[]>;
  getUnreadMessages(conversationId: number, userId: number): Promise<MessageWithSender[]>;
  markMessagesAsRead(conversationId: number, userId: number): Promise<void>;
  getMessageById(messageId: number): Promise<MessageWithSender | null>;
  markMessageAsDelivered(messageId: number): Promise<void>;
  addMessageReaction(messageId: number, userId: number, emoji: string): Promise<MessageReaction>;
  removeMessageReaction(messageId: number, userId: number, emoji: string): Promise<void>;

  // Call methods
  getUserCalls(userId: number): Promise<CallWithCaller[]>;
  createCall(insertCall: InsertCall): Promise<Call>;
  updateCall(id: number, updates: Partial<Call>): Promise<Call>;

  // User Activity methods
  updateUserOnlineStatus(userId: number, isOnline: boolean): Promise<void>;
  updateUserActivity(userId: number, activityType: string, conversationId?: number, metadata?: any): Promise<UserActivity>;
  getUserLastActivity(userId: number): Promise<Date | null>;
  getOnlineUsers(): Promise<User[]>;
  getUsersLastSeen(userIds: number[]): Promise<UserLastSeen[]>;
  cleanupOldActivity(olderThanDays?: number): Promise<void>;

  // Settings methods
  getUserNotificationSettings(userId: number): Promise<NotificationSettings>;
  updateNotificationSettings(userId: number, settings: Partial<InsertNotificationSettings>): Promise<NotificationSettings>;
  getUserStorageData(userId: number): Promise<UserStorageData>;
  updateUserStorageData(userId: number, data: Partial<InsertUserStorageData>): Promise<UserStorageData>;
  getUserConversationSettings(userId: number): Promise<ConversationSettings>;
  updateUserConversationSettings(userId: number, settings: Partial<InsertConversationSettings>): Promise<ConversationSettings>;
  clearUserCache(userId: number): Promise<void>;
  deleteAllUserData(userId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // OTP methods
  async createOtpCode(insertOtp: InsertOtpCode): Promise<OtpCode> {
    const [otp] = await db
      .insert(otpCodes)
      .values(insertOtp)
      .returning();
    return otp;
  }

  async getValidOtpCode(phoneNumber: string, code: string): Promise<OtpCode | undefined> {
    const [otp] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.phoneNumber, phoneNumber),
          eq(otpCodes.code, code),
          eq(otpCodes.isUsed, false)
        )
      );

    if (otp && new Date() < otp.expiresAt) {
      return otp;
    }
    return undefined;
  }

  async markOtpAsUsed(id: number): Promise<void> {
    await db
      .update(otpCodes)
      .set({ isUsed: true })
      .where(eq(otpCodes.id, id));
  }

  // Contact methods
  async getUserContacts(userId: number): Promise<ContactWithUser[]> {
    const result = await db
      .select({
        id: contacts.id,
        userId: contacts.userId,
        contactUserId: contacts.contactUserId,
        contactName: contacts.contactName,
        phoneNumber: contacts.phoneNumber,
        isRegistered: contacts.isRegistered,
        nickname: contacts.nickname,
        syncedAt: contacts.syncedAt,
        createdAt: contacts.createdAt,
        user: {
          id: users.id,
          username: users.username,
          phoneNumber: users.phoneNumber,
          preferredLanguage: users.preferredLanguage,
          profilePhoto: users.profilePhoto,
          isVerified: users.isVerified,
        }
      })
      .from(contacts)
      .leftJoin(users, eq(contacts.contactUserId, users.id))
      .where(eq(contacts.userId, userId));

    return result;
  }

  async addContact(userId: number, contactUserId: number, contactName?: string, phoneNumber?: string): Promise<Contact> {
    // Get the contact user's information if name/phone not provided
    const contactUser = await this.getUser(contactUserId);
    if (!contactUser) {
      throw new Error('Contact user not found');
    }

    // Check if contact already exists
    const existingContact = await db
      .select()
      .from(contacts)
      .where(and(
        eq(contacts.userId, userId),
        eq(contacts.contactUserId, contactUserId)
      ))
      .limit(1);

    if (existingContact.length > 0) {
      // Update existing contact
      const [updatedContact] = await db
        .update(contacts)
        .set({
          contactName: contactName || contactUser.username || contactUser.phoneNumber,
          phoneNumber: phoneNumber || contactUser.phoneNumber,
          isRegistered: true,
          syncedAt: new Date()
        })
        .where(eq(contacts.id, existingContact[0].id))
        .returning();
      return updatedContact;
    }

    // Create new contact
    const [contact] = await db
      .insert(contacts)
      .values({ 
        userId, 
        contactUserId,
        contactName: contactName || contactUser.username || contactUser.phoneNumber,
        phoneNumber: phoneNumber || contactUser.phoneNumber,
        isRegistered: true
      })
      .returning();
    return contact;
  }

  async syncContacts(userId: number, deviceContacts: Array<{name: string, phoneNumber: string}>): Promise<ContactSyncSession> {
    // Start sync session
    const [syncSession] = await db
      .insert(contactSyncSessions)
      .values({
        userId,
        totalContacts: deviceContacts.length,
        syncedContacts: 0,
        registeredContacts: 0,
        status: "in_progress"
      })
      .returning();

    let syncedCount = 0;
    let registeredCount = 0;

    try {
      // Find registered users by phone numbers
      const phoneNumbers = deviceContacts.map(c => c.phoneNumber);
      const registeredUsers = await this.findUsersByPhoneNumbers(phoneNumbers);
      const registeredPhoneMap = new Map(registeredUsers.map(u => [u.phoneNumber, u]));

      // Process each contact
      for (const deviceContact of deviceContacts) {
        const registeredUser = registeredPhoneMap.get(deviceContact.phoneNumber);
        const isRegistered = !!registeredUser;

        if (isRegistered) {
          registeredCount++;
        }

        // Insert or update contact
        try {
          await db
            .insert(contacts)
            .values({
              userId,
              contactUserId: registeredUser?.id || null,
              contactName: deviceContact.name,
              phoneNumber: deviceContact.phoneNumber,
              isRegistered,
            });
        } catch (error) {
          // Handle duplicate contacts by updating existing ones
          await db
            .update(contacts)
            .set({
              contactName: deviceContact.name,
              contactUserId: registeredUser?.id || null,
              isRegistered,
              syncedAt: new Date(),
            })
            .where(and(
              eq(contacts.userId, userId),
              eq(contacts.phoneNumber, deviceContact.phoneNumber)
            ));
        }

        syncedCount++;
      }

      // Update sync session
      const [completedSession] = await db
        .update(contactSyncSessions)
        .set({
          syncedContacts: syncedCount,
          registeredContacts: registeredCount,
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(contactSyncSessions.id, syncSession.id))
        .returning();

      return completedSession;

    } catch (error) {
      // Mark session as failed
      await db
        .update(contactSyncSessions)
        .set({
          status: "failed",
          completedAt: new Date(),
        })
        .where(eq(contactSyncSessions.id, syncSession.id));

      throw error;
    }
  }

  async findUsersByPhoneNumbers(phoneNumbers: string[]): Promise<User[]> {
    if (phoneNumbers.length === 0) return [];

    return await db
      .select()
      .from(users)
      .where(inArray(users.phoneNumber, phoneNumbers));
  }

  async updateContactNickname(contactId: number, nickname: string): Promise<Contact> {
    const [contact] = await db
      .update(contacts)
      .set({ nickname })
      .where(eq(contacts.id, contactId))
      .returning();
    return contact;
  }

  async deleteContact(contactId: number): Promise<void> {
    await db
      .delete(contacts)
      .where(eq(contacts.id, contactId));
  }

  async getContactSyncHistory(userId: number): Promise<ContactSyncSession[]> {
    return await db
      .select()
      .from(contactSyncSessions)
      .where(eq(contactSyncSessions.userId, userId))
      .orderBy(desc(contactSyncSessions.startedAt));
  }

  // Conversation methods
  async getUserConversations(userId: number): Promise<ConversationWithParticipant[]> {
    const result = await db
      .select({
        id: conversations.id,
        translationEnabled: conversations.translationEnabled,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        participant1Id: conversations.participant1Id,
        participant2Id: conversations.participant2Id,
        otherUser: {
          id: users.id,
          username: users.username,
          profilePhoto: users.profilePhoto,
          isVerified: users.isVerified,
        }
      })
      .from(conversations)
      .innerJoin(
        users, 
        or(
          and(eq(conversations.participant1Id, userId), eq(users.id, conversations.participant2Id)),
          and(eq(conversations.participant2Id, userId), eq(users.id, conversations.participant1Id))
        )
      )
      .where(
        or(
          eq(conversations.participant1Id, userId),
          eq(conversations.participant2Id, userId)
        )
      )
      .orderBy(desc(conversations.updatedAt));

    return result;
  }

  async getConversationById(conversationId: number, userId: number): Promise<ConversationWithParticipant | null> {
    const conversation = await db
      .select({
        id: conversations.id,
        translationEnabled: conversations.translationEnabled,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        participant1Id: conversations.participant1Id,
        participant2Id: conversations.participant2Id,
        otherUser: {
          id: users.id,
          username: users.username,
          profilePhoto: users.profilePhoto,
          isVerified: users.isVerified,
        },
      })
      .from(conversations)
      .innerJoin(users, 
        or(
          and(eq(conversations.participant1Id, userId), eq(users.id, conversations.participant2Id)),
          and(eq(conversations.participant2Id, userId), eq(users.id, conversations.participant1Id))
        )
      )
      .where(
        and(
          eq(conversations.id, conversationId),
          or(
            eq(conversations.participant1Id, userId),
            eq(conversations.participant2Id, userId)
          )
        )
      )
      .limit(1);

    return conversation[0] || null;
  }

  async getConversationByParticipants(user1Id: number, user2Id: number): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        or(
          and(eq(conversations.participant1Id, user1Id), eq(conversations.participant2Id, user2Id)),
          and(eq(conversations.participant1Id, user2Id), eq(conversations.participant2Id, user1Id))
        )
      );
    return conversation || undefined;
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(insertConversation)
      .returning();
    return conversation;
  }

  async updateConversationTranslation(id: number, enabled: boolean): Promise<Conversation> {
    const [conversation] = await db
      .update(conversations)
      .set({ translationEnabled: enabled })
      .where(eq(conversations.id, id))
      .returning();
    return conversation;
  }

  async markMessagesAsRead(conversationId: number, userId: number): Promise<void> {
    await db
      .update(messages)
      .set({ 
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          ne(messages.senderId, userId), // Don't mark own messages as read
          eq(messages.isRead, false)
        )
      );
  }

  async markMessageAsDelivered(messageId: number): Promise<void> {
    await db
      .update(messages)
      .set({
        isDelivered: true,
        deliveredAt: new Date(),
      })
      .where(eq(messages.id, messageId));
  }

  async markMessageAsRead(messageId: number): Promise<void> {
    await db
      .update(messages)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(eq(messages.id, messageId));
  }

  async getUnreadMessages(conversationId: number, userId: number): Promise<MessageWithSender[]> {
    const result = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        originalText: messages.originalText,
        translatedText: messages.translatedText,
        targetLanguage: messages.targetLanguage,
        messageType: messages.messageType,
        fileUrl: messages.fileUrl,
        fileName: messages.fileName,
        fileSize: messages.fileSize,
        fileType: messages.fileType,
        thumbnailUrl: messages.thumbnailUrl,
        duration: messages.duration,
        replyToMessageId: messages.replyToMessageId,
        isForwarded: messages.isForwarded,
        isStarred: messages.isStarred,
        isDeleted: messages.isDeleted,
        deletedAt: messages.deletedAt,
        editedAt: messages.editedAt,
        isDelivered: messages.isDelivered,
        isRead: messages.isRead,
        deliveredAt: messages.deliveredAt,
        readAt: messages.readAt,
        createdAt: messages.createdAt,
        sender: {
          id: users.id,
          username: users.username,
          profilePhoto: users.profilePhoto,
        }
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(
        and(
          eq(messages.conversationId, conversationId),
          ne(messages.senderId, userId), // Messages not sent by the current user
          eq(messages.isRead, false)
        )
      );

    return result;
  }

  // Notification Settings
  async getUserNotificationSettings(userId: number): Promise<NotificationSettings> {
    const [settings] = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId));
    
    if (!settings) {
      // Create default settings if none exist
      const [defaultSettings] = await db
        .insert(notificationSettings)
        .values({ 
          userId,
          messageNotifications: true,
          callNotifications: true,
          soundEnabled: true,
          vibrationEnabled: true
        })
        .returning();
      return defaultSettings;
    }

    return settings;
  }

  async updateNotificationSettings(userId: number, settings: Partial<InsertNotificationSettings>): Promise<NotificationSettings> {
    const [updated] = await db
      .update(notificationSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(notificationSettings.userId, userId))
      .returning();
    
    return updated || await this.getUserNotificationSettings(userId);
  }

  // User Storage Data
  async getUserStorageData(userId: number): Promise<UserStorageData> {
    const [storage] = await db
      .select()
      .from(userStorageData)
      .where(eq(userStorageData.userId, userId));

    if (!storage) {
      // Create default storage data if none exist
      const [defaultStorage] = await db
        .insert(userStorageData)
        .values({ 
          userId
        })
        .returning();
      return defaultStorage;
    }

    return storage;
  }

  async updateUserStorageData(userId: number, data: Partial<InsertUserStorageData>): Promise<UserStorageData> {
    const [updated] = await db.update(userStorageData)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userStorageData.userId, userId))
      .returning();

    return updated || await this.getUserStorageData(userId);
  }

  // User Conversation Settings
  async getUserConversationSettings(userId: number): Promise<ConversationSettings> {
    const [settings] = await db
      .select()
      .from(conversationSettings)
      .where(eq(conversationSettings.userId, userId));

    if (!settings) {
      // Create default settings if none exist
      const [defaultSettings] = await db
        .insert(conversationSettings)
        .values({ 
          userId,
          defaultTranslationEnabled: true,
          defaultTargetLanguage: 'en-US'
        })
        .returning();
      return defaultSettings;
    }

    return settings;
  }

  async updateUserConversationSettings(userId: number, settings: Partial<InsertConversationSettings>): Promise<ConversationSettings> {
    const [updated] = await db.update(conversationSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(conversationSettings.userId, userId))
      .returning();

    return updated || await this.getUserConversationSettings(userId);
  }

  async clearUserCache(userId: number): Promise<void> {
    const currentData = await this.getUserStorageData(userId);
    const totalUsed = currentData.totalUsed || 0;
    const cache = currentData.cache || 0;
    const newTotalUsed = totalUsed - cache;

    await this.updateUserStorageData(userId, {
      cache: 0,
      totalUsed: newTotalUsed,
    });
  }

  async deleteAllUserData(userId: number): Promise<void> {
    // Delete in order to respect foreign key constraints
    await db.delete(messages).where(eq(messages.senderId, userId));
    await db.delete(calls).where(or(
      eq(calls.callerId, userId),
      eq(calls.receiverId, userId)
    ));
    await db.delete(conversations).where(or(
      eq(conversations.participant1Id, userId),
      eq(conversations.participant2Id, userId)
    ));
    await db.delete(contacts).where(eq(contacts.userId, userId));
    await db.delete(contactSyncSessions).where(eq(contactSyncSessions.userId, userId));
    await db.delete(otpCodes).where(eq(otpCodes.phoneNumber, 
      (await this.getUser(userId))?.phoneNumber || ''
    ));
    await db.delete(notificationSettings).where(eq(notificationSettings.userId, userId));
    await db.delete(userStorageData).where(eq(userStorageData.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }

  // Message methods
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        conversationId: insertMessage.conversationId,
        senderId: insertMessage.senderId,
        originalText: insertMessage.originalText,
        translatedText: insertMessage.translatedText,
        targetLanguage: insertMessage.targetLanguage,
        messageType: insertMessage.messageType || 'text',
        fileUrl: insertMessage.fileUrl,
        fileName: insertMessage.fileName,
        fileSize: insertMessage.fileSize,
        fileType: insertMessage.fileType,
        thumbnailUrl: insertMessage.thumbnailUrl,
        duration: insertMessage.duration,
        replyToMessageId: insertMessage.replyToMessageId,
        isForwarded: insertMessage.isForwarded,
        isStarred: insertMessage.isStarred,
      })
      .returning();
    return message;
  }

  async getConversationMessages(conversationId: number): Promise<MessageWithSender[]> {
    const result = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        originalText: messages.originalText,
        translatedText: messages.translatedText,
        targetLanguage: messages.targetLanguage,
        messageType: messages.messageType,
        fileUrl: messages.fileUrl,
        fileName: messages.fileName,
        fileSize: messages.fileSize,
        fileType: messages.fileType,
        thumbnailUrl: messages.thumbnailUrl,
        duration: messages.duration,
        replyToMessageId: messages.replyToMessageId,
        isForwarded: messages.isForwarded,
        isStarred: messages.isStarred,
        isDeleted: messages.isDeleted,
        deletedAt: messages.deletedAt,
        editedAt: messages.editedAt,
        isDelivered: messages.isDelivered,
        isRead: messages.isRead,
        deliveredAt: messages.deliveredAt,
        readAt: messages.readAt,
        createdAt: messages.createdAt,
        sender: {
          id: users.id,
          username: users.username,
          profilePhoto: users.profilePhoto,
        }
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    // Buscar reações para cada mensagem
    const messageIds = result.map(msg => msg.id);
    let reactions: any[] = [];
    
    if (messageIds.length > 0) {
      const { messageReactions } = await import("../shared/schema");
      reactions = await db
        .select({
          messageId: messageReactions.messageId,
          userId: messageReactions.userId,
          emoji: messageReactions.emoji,
          createdAt: messageReactions.createdAt,
        })
        .from(messageReactions)
        .innerJoin(users, eq(messageReactions.userId, users.id))
        .where(inArray(messageReactions.messageId, messageIds));
    }

    // Agrupar reações por mensagem
    const reactionsMap = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.messageId]) {
        acc[reaction.messageId] = [];
      }
      acc[reaction.messageId].push(reaction);
      return acc;
    }, {} as Record<number, any[]>);

    // Adicionar reações às mensagens
    const messagesWithReactions = result.map(message => ({
      ...message,
      reactions: reactionsMap[message.id] || []
    }));

    console.log(`[Storage] Found ${result.length} messages for conversation ${conversationId}`);
    return messagesWithReactions;
  }

  // Call methods
  async getUserCalls(userId: number): Promise<CallWithCaller[]> {
    const result = await db
      .select({
        id: calls.id,
        callerId: calls.callerId,
        receiverId: calls.receiverId,
        status: calls.status,
        duration: calls.duration,
        translationEnabled: calls.translationEnabled,
        startedAt: calls.startedAt,
        endedAt: calls.endedAt,
        caller: {
          id: users.id,
          username: users.username,
          profilePhoto: users.profilePhoto,
        }
      })
      .from(calls)
      .innerJoin(users, eq(calls.callerId, users.id))
      .where(
        or(
          eq(calls.callerId, userId),
          eq(calls.receiverId, userId)
        )
      )
      .orderBy(desc(calls.startedAt));

    return result;
  }

  async createCall(insertCall: InsertCall): Promise<Call> {
    const [call] = await db
      .insert(calls)
      .values(insertCall)
      .returning();
    return call;
  }

  async updateCall(id: number, updates: Partial<Call>): Promise<Call> {
    const [call] = await db
      .update(calls)
      .set(updates)
      .where(eq(calls.id, id))
      .returning();
    return call;
  }

  // User Activity methods
  async updateUserOnlineStatus(userId: number, isOnline: boolean): Promise<void> {
    const now = new Date();
    await db
      .update(users)
      .set({ 
        isOnline,
        lastSeenAt: isOnline ? now : now,
        lastActivityAt: now
      })
      .where(eq(users.id, userId));

    // Registrar atividade
    await this.updateUserActivity(userId, isOnline ? 'online' : 'offline');
  }

  async updateUserActivity(userId: number, activityType: string, conversationId?: number, metadata?: any): Promise<UserActivity> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Usar transação para garantir consistência
        const result = await db.transaction(async (tx) => {
          const [activity] = await tx
            .insert(userActivity)
            .values({
              userId,
              activityType,
              conversationId,
              metadata
            })
            .returning();

          // Atualizar lastActivityAt do usuário
          await tx
            .update(users)
            .set({ lastActivityAt: new Date() })
            .where(eq(users.id, userId));

          return activity;
        });

        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(`Erro na tentativa ${attempt}/${maxRetries} de updateUserActivity:`, {
          userId,
          activityType,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });

        // Se não é o último retry, aguardar antes de tentar novamente
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Backoff exponencial, máximo 5s
          console.log(`Aguardando ${delay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    console.error('Todas as tentativas de updateUserActivity falharam:', {
      userId,
      activityType,
      finalError: lastError?.message
    });
    
    throw new Error(`Falha ao atualizar atividade do usuário após ${maxRetries} tentativas: ${lastError?.message}`);
  }

  async getUserLastActivity(userId: number): Promise<Date | null> {
    const [user] = await db
      .select({ lastActivityAt: users.lastActivityAt })
      .from(users)
      .where(eq(users.id, userId));
    
    return user?.lastActivityAt || null;
  }

  async getOnlineUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.isOnline, true));
  }

  async getUsersLastSeen(userIds: number[]): Promise<UserLastSeen[]> {
    const result = await db
      .select({
        userId: users.id,
        lastSeenAt: users.lastSeenAt,
        isOnline: users.isOnline
      })
      .from(users)
      .where(inArray(users.id, userIds));
    
    return result;
  }

  async cleanupOldActivity(olderThanDays: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    await db
      .delete(userActivity)
      .where(and(
        eq(userActivity.activityType, 'typing'), // Limpar apenas atividades de digitação antigas
        // Adicionar condição de data quando disponível
      ));
  }

  // Message reaction methods
  async addMessageReaction(messageId: number, userId: number, emoji: string): Promise<MessageReaction> {
    const { messageReactions } = await import("../shared/schema");
    
    // Check if reaction already exists
    const [existingReaction] = await db
      .select()
      .from(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.userId, userId),
          eq(messageReactions.emoji, emoji)
        )
      );

    if (existingReaction) {
      return existingReaction;
    }

    const [reaction] = await db
      .insert(messageReactions)
      .values({
        messageId,
        userId,
        emoji
      })
      .returning();

    return reaction;
  }

  async removeMessageReaction(messageId: number, userId: number, emoji: string): Promise<void> {
    const { messageReactions } = await import("../shared/schema");
    
    await db
      .delete(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.userId, userId),
          eq(messageReactions.emoji, emoji)
        )
      );
  }

  async getMessageById(messageId: number): Promise<MessageWithSender | null> {
    const [message] = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        originalText: messages.originalText,
        translatedText: messages.translatedText,
        targetLanguage: messages.targetLanguage,
        messageType: messages.messageType,
        fileUrl: messages.fileUrl,
        fileName: messages.fileName,
        fileSize: messages.fileSize,
        fileType: messages.fileType,
        thumbnailUrl: messages.thumbnailUrl,
        duration: messages.duration,
        replyToMessageId: messages.replyToMessageId,
        isForwarded: messages.isForwarded,
        isStarred: messages.isStarred,
        isDeleted: messages.isDeleted,
        deletedAt: messages.deletedAt,
        editedAt: messages.editedAt,
        isDelivered: messages.isDelivered,
        isRead: messages.isRead,
        deliveredAt: messages.deliveredAt,
        readAt: messages.readAt,
        createdAt: messages.createdAt,
        sender: {
          id: users.id,
          username: users.username,
          profilePhoto: users.profilePhoto,
        }
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.id, messageId));

    return message || null;
  }

}

export const storage = new DatabaseStorage();