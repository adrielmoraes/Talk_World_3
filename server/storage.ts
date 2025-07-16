import { 
  users, 
  otpCodes, 
  contacts, 
  conversations, 
  messages, 
  calls, 
  contactSyncHistory,
  contactSyncSessions,
  notificationSettings,
  userStorageData,
  type User,
  type OtpCode,
  type Contact,
  type Conversation,
  type Message,
  type Call,
  type ContactSyncHistory,
  type ContactSyncSession,
  insertUserSchema,
  insertOtpSchema,
  insertContactSchema,
  insertConversationSchema,
  insertMessageSchema,
  insertCallSchema,
  insertContactSyncHistorySchema,
  insertContactSyncSessionSchema,
  insertNotificationSettingsSchema,
  insertUserStorageDataSchema,
} from "@shared/schema";
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
  getUserContacts(userId: number): Promise<any[]>;
  addContact(userId: number, contactUserId: number, contactName?: string, phoneNumber?: string): Promise<Contact>;
  syncContacts(userId: number, contacts: Array<{name: string, phoneNumber: string}>): Promise<ContactSyncSession>;
  findUsersByPhoneNumbers(phoneNumbers: string[]): Promise<User[]>;
  updateContactNickname(contactId: number, nickname: string): Promise<Contact>;
  deleteContact(contactId: number): Promise<void>;
  getContactSyncHistory(userId: number): Promise<ContactSyncSession[]>;

  // Conversation methods
  getUserConversations(userId: number): Promise<any[]>;
  getConversationById(id: number): Promise<Conversation | undefined>;
  getConversationByParticipants(user1Id: number, user2Id: number): Promise<Conversation | undefined>;
  createConversation(insertConversation: InsertConversation): Promise<Conversation>;
  updateConversationTranslation(id: number, enabled: boolean): Promise<Conversation>;

  // Message methods
  createMessage(insertMessage: InsertMessage): Promise<Message>;
  getConversationMessages(conversationId: number): Promise<any[]>;

  // Call methods
  getUserCalls(userId: number): Promise<any[]>;
  createCall(insertCall: InsertCall): Promise<Call>;
  updateCall(id: number, updates: Partial<Call>): Promise<Call>;

  // Settings methods
  getUserNotificationSettings(userId: number): Promise<any>;
  updateNotificationSettings(userId: number, settings: Partial<any>): Promise<any>;
  getUserStorageData(userId: number): Promise<any>;
  updateUserStorageData(userId: number, data: Partial<any>): Promise<any>;
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
  async getUserContacts(userId: number): Promise<any[]> {
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
        contactUser: {
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
  async getUserConversations(userId: number): Promise<any[]> {
    const result = await db
      .select({
        id: conversations.id,
        translationEnabled: conversations.translationEnabled,
        updatedAt: conversations.updatedAt,
        otherUser: {
          id: users.id,
          username: users.username,
          profilePhoto: users.profilePhoto,
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

  async getConversationById(conversationId: number, userId: number) {
    const conversation = await db
      .select({
        id: conversations.id,
        translationEnabled: conversations.translationEnabled,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
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
    const readAt = new Date();
    await db
      .update(messages)
      .set({ 
        isRead: true,
        readAt: readAt,
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
    const deliveredAt = new Date();
    await db
      .update(messages)
      .set({
        isDelivered: true,
        deliveredAt: deliveredAt,
      })
      .where(eq(messages.id, messageId));
  }

  async markMessageAsRead(messageId: number): Promise<void> {
    const readAt = new Date();
    await db
      .update(messages)
      .set({
        isRead: true,
        readAt: readAt,
      })
      .where(eq(messages.id, messageId));
  }

  async getUnreadMessages(conversationId: number, userId: number): Promise<any[]> {
    const result = await db
      .select()
      .from(messages)
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
  async getUserNotificationSettings(userId: number) {
    const settings = await db.select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId))
      .limit(1);

    if (settings.length === 0) {
      // Create default settings if none exist
      const defaultSettings = await db.insert(notificationSettings)
        .values({ userId })
        .returning();
      return defaultSettings[0];
    }

    return settings[0];
  }

  async updateNotificationSettings(userId: number, settings: Partial<typeof notificationSettings.$inferInsert>) {
    await db.update(notificationSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(notificationSettings.userId, userId));

    return this.getUserNotificationSettings(userId);
  }

  // User Storage Data
  async getUserStorageData(userId: number) {
    const storage = await db.select()
      .from(userStorageData)
      .where(eq(userStorageData.userId, userId))
      .limit(1);

    if (storage.length === 0) {
      // Create default storage data if none exist
      const defaultStorage = await db.insert(userStorageData)
        .values({ userId })
        .returning();
      return defaultStorage[0];
    }

    return storage[0];
  }

  async updateUserStorageData(userId: number, data: Partial<typeof userStorageData.$inferInsert>) {
    await db.update(userStorageData)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userStorageData.userId, userId));

    return this.getUserStorageData(userId);
  }

  async clearUserCache(userId: number) {
    const currentData = await this.getUserStorageData(userId);
    const newTotalUsed = currentData.totalUsed - currentData.cache;

    await this.updateUserStorageData(userId, {
      cache: 0,
      totalUsed: newTotalUsed,
    });
  }

  async deleteAllUserData(userId: number) {
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
      .values(insertMessage)
      .returning();
    return message;
  }

  async getConversationMessages(conversationId: number): Promise<any[]> {
    const result = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        originalText: messages.originalText,
        translatedText: messages.translatedText,
        targetLanguage: messages.targetLanguage,
        isDelivered: messages.isDelivered,
        isRead: messages.isRead,
        createdAt: messages.createdAt,
        sender: {
          id: users.id,
          username: users.username,
        }
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    console.log(`[Storage] Found ${result.length} messages for conversation ${conversationId}`);
    return result;
  }

  // Call methods
  async getUserCalls(userId: number): Promise<any[]> {
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
}

export const storage = new DatabaseStorage();