import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull().unique(),
  username: text("username").notNull().unique(),
  preferredLanguage: text("preferred_language").notNull().default('pt-BR'),
  gender: text("gender").notNull(), // 'male' or 'female'
  profilePhoto: text("profile_photo"),
  isVerified: boolean("is_verified").notNull().default(false),
  isOnline: boolean("is_online").notNull().default(false),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  contactUserId: integer("contact_user_id").references(() => users.id), // Null if contact not registered
  contactName: text("contact_name").notNull(), // Name from device contacts
  phoneNumber: text("phone_number").notNull(), // Original phone number from device
  isRegistered: boolean("is_registered").default(false).notNull(), // Whether contact is registered in Talk World
  nickname: text("nickname"), // Custom nickname set by user
  syncedAt: timestamp("synced_at").defaultNow().notNull(), // When contact was synced
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// New table for contact sync sessions
export const contactSyncSessions = pgTable("contact_sync_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  totalContacts: integer("total_contacts").notNull(),
  syncedContacts: integer("synced_contacts").notNull(),
  registeredContacts: integer("registered_contacts").notNull(),
  status: text("status", { enum: ["pending", "in_progress", "completed", "failed"] }).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  participant1Id: integer("participant1_id").notNull().references(() => users.id),
  participant2Id: integer("participant2_id").notNull().references(() => users.id),
  translationEnabled: boolean("translation_enabled").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  senderId: integer("sender_id").notNull().references(() => users.id),
  originalText: text("original_text").notNull(),
  translatedText: text("translated_text"),
  targetLanguage: text("target_language"),
  messageType: text("message_type").default("text"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  fileType: text("file_type"),
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration"),
  replyToMessageId: integer("reply_to_message_id"),
  isForwarded: boolean("is_forwarded").default(false),
  isStarred: boolean("is_starred").default(false),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  editedAt: timestamp("edited_at"),
  isDelivered: boolean("is_delivered").notNull().default(false),
  isRead: boolean("is_read").notNull().default(false),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  callerId: integer("caller_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  status: text("status").notNull(), // 'ringing', 'answered', 'missed', 'ended'
  duration: integer("duration"), // in seconds
  translationEnabled: boolean("translation_enabled").notNull().default(false),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

// Nova tabela para rastrear atividade detalhada dos usuários
export const userActivity = pgTable("user_activity", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  activityType: text("activity_type").notNull(), // 'online', 'typing', 'viewing_chat', 'app_background', 'app_foreground'
  conversationId: integer("conversation_id").references(() => conversations.id), // Para atividades específicas de conversa
  metadata: jsonb("metadata"), // Dados adicionais da atividade
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tabela de reações de mensagens
export const messageReactions = pgTable("message_reactions", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  emoji: varchar("emoji", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tabela de anexos de mensagens
export const messageAttachments = pgTable("message_attachments", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  fileType: text("file_type").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tabela de configurações de conversa por usuário
export const conversationUserSettings = pgTable("conversation_user_settings", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isMuted: boolean("is_muted").default(false),
  mutedUntil: timestamp("muted_until"),
  isArchived: boolean("is_archived").default(false),
  isPinned: boolean("is_pinned").default(false),
  customNotificationSound: text("custom_notification_sound"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tabela de status de mensagens por usuário
export const messageUserStatus = pgTable("message_user_status", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("sent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sentMessages: many(messages),
  conversations1: many(conversations, { relationName: "participant1" }),
  conversations2: many(conversations, { relationName: "participant2" }),
  contacts: many(contacts),
  outgoingCalls: many(calls, { relationName: "caller" }),
  incomingCalls: many(calls, { relationName: "receiver" }),
  activities: many(userActivity),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  user: one(users, {
    fields: [contacts.userId],
    references: [users.id],
  }),
  contactUser: one(users, {
    fields: [contacts.contactUserId],
    references: [users.id],
  }),
}));

export const contactSyncSessionsRelations = relations(contactSyncSessions, ({ one }) => ({
  user: one(users, {
    fields: [contactSyncSessions.userId],
    references: [users.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  participant1: one(users, {
    fields: [conversations.participant1Id],
    references: [users.id],
    relationName: "participant1",
  }),
  participant2: one(users, {
    fields: [conversations.participant2Id],
    references: [users.id],
    relationName: "participant2",
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  replyToMessage: one(messages, {
    fields: [messages.replyToMessageId],
    references: [messages.id],
  }),
  reactions: many(messageReactions),
  attachments: many(messageAttachments),
  userStatuses: many(messageUserStatus),
}));

export const callsRelations = relations(calls, ({ one }) => ({
  caller: one(users, {
    fields: [calls.callerId],
    references: [users.id],
    relationName: "caller",
  }),
  receiver: one(users, {
    fields: [calls.receiverId],
    references: [users.id],
    relationName: "receiver",
  }),
}));

export const userActivityRelations = relations(userActivity, ({ one }) => ({
  user: one(users, {
    fields: [userActivity.userId],
    references: [users.id],
  }),
  conversation: one(conversations, {
    fields: [userActivity.conversationId],
    references: [conversations.id],
  }),
}));

export const messageReactionsRelations = relations(messageReactions, ({ one }) => ({
  message: one(messages, {
    fields: [messageReactions.messageId],
    references: [messages.id],
  }),
  user: one(users, {
    fields: [messageReactions.userId],
    references: [users.id],
  }),
}));

export const messageAttachmentsRelations = relations(messageAttachments, ({ one }) => ({
  message: one(messages, {
    fields: [messageAttachments.messageId],
    references: [messages.id],
  }),
}));

export const conversationUserSettingsRelations = relations(conversationUserSettings, ({ one }) => ({
  user: one(users, {
    fields: [conversationUserSettings.userId],
    references: [users.id],
  }),
}));

export const messageUserStatusRelations = relations(messageUserStatus, ({ one }) => ({
  message: one(messages, {
    fields: [messageUserStatus.messageId],
    references: [messages.id],
  }),
  user: one(users, {
    fields: [messageUserStatus.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  isVerified: true,
});

export const insertOtpSchema = createInsertSchema(otpCodes).omit({
  id: true,
  createdAt: true,
  isUsed: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  syncedAt: true,
  createdAt: true,
});

export const insertContactSyncSessionSchema = createInsertSchema(contactSyncSessions).omit({
  id: true,
  startedAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  isDelivered: true,
  isRead: true,
});

export const insertCallSchema = createInsertSchema(calls).omit({
  id: true,
  startedAt: true,
});

export const insertUserActivitySchema = createInsertSchema(userActivity).omit({
  id: true,
  createdAt: true,
});

export const insertMessageReactionSchema = createInsertSchema(messageReactions).omit({
  id: true,
  createdAt: true,
});

export const insertMessageAttachmentSchema = createInsertSchema(messageAttachments).omit({
  id: true,
  createdAt: true,
});

export const insertConversationUserSettingsSchema = createInsertSchema(conversationUserSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageUserStatusSchema = createInsertSchema(messageUserStatus).omit({
  id: true,
  timestamp: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = z.infer<typeof insertOtpSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type ContactSyncSession = typeof contactSyncSessions.$inferSelect;
export type InsertContactSyncSession = z.infer<typeof insertContactSyncSessionSchema>;
export type UserActivity = typeof userActivity.$inferSelect;
export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Call = typeof calls.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;
export const selectCallSchema = createSelectSchema(calls);

export type MessageReaction = typeof messageReactions.$inferSelect;
export type InsertMessageReaction = z.infer<typeof insertMessageReactionSchema>;
export type MessageAttachment = typeof messageAttachments.$inferSelect;
export type InsertMessageAttachment = z.infer<typeof insertMessageAttachmentSchema>;
export type ConversationUserSettings = typeof conversationUserSettings.$inferSelect;
export type InsertConversationUserSettings = z.infer<typeof insertConversationUserSettingsSchema>;
export type MessageUserStatus = typeof messageUserStatus.$inferSelect;
export type InsertMessageUserStatus = z.infer<typeof insertMessageUserStatusSchema>;

// Contact sync sessions schema  
export const selectContactSyncSessionSchema = createSelectSchema(contactSyncSessions);

// Notification Settings
export const notificationSettings = pgTable('notification_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  messageNotifications: boolean('message_notifications').default(true),
  callNotifications: boolean('call_notifications').default(true),
  groupNotifications: boolean('group_notifications').default(true),
  soundEnabled: boolean('sound_enabled').default(true),
  vibrationEnabled: boolean('vibration_enabled').default(true),
  notificationSound: text('notification_sound').default('default'),
  ringtone: text('ringtone').default('default'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// User Storage Data
export const userStorageData = pgTable('user_storage_data', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  totalUsed: integer('total_used').default(0), // in MB
  photos: integer('photos').default(0),
  videos: integer('videos').default(0),
  audio: integer('audio').default(0),
  cache: integer('cache').default(0),
  autoDownloadPhotos: boolean('auto_download_photos').default(true),
  autoDownloadVideos: boolean('auto_download_videos').default(false),
  autoDownloadAudio: boolean('auto_download_audio').default(true),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertNotificationSettingsSchema = createInsertSchema(notificationSettings);
export const selectNotificationSettingsSchema = createSelectSchema(notificationSettings);
export const insertUserStorageDataSchema = createInsertSchema(userStorageData);
export const selectUserStorageDataSchema = createSelectSchema(userStorageData);

// User Conversation Settings
export const conversationSettings = pgTable('conversation_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  defaultTranslationEnabled: boolean('default_translation_enabled').default(false),
  defaultTargetLanguage: text('default_target_language').default('en-US'),
  showOriginalText: boolean('show_original_text').default(true),
  archiveOldMessages: boolean('archive_old_messages').default(false),
  messageRetentionDays: integer('message_retention_days').default(30),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertConversationSettingsSchema = createInsertSchema(conversationSettings);
export const selectConversationSettingsSchema = createSelectSchema(conversationSettings);

// Export types for notification settings, user storage data, and conversation settings
export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type UserStorageData = typeof userStorageData.$inferSelect;
export type ConversationSettings = typeof conversationSettings.$inferSelect;