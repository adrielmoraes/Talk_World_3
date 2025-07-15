import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull().unique(),
  username: text("username").notNull().unique(),
  preferredLanguage: text("preferred_language").notNull().default('pt-BR'),
  gender: text("gender").notNull(), // 'male' or 'female'
  profilePhoto: text("profile_photo"),
  isVerified: boolean("is_verified").notNull().default(false),
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
  isDelivered: boolean("is_delivered").notNull().default(false),
  isRead: boolean("is_read").notNull().default(false),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sentMessages: many(messages),
  conversations1: many(conversations, { relationName: "participant1" }),
  conversations2: many(conversations, { relationName: "participant2" }),
  contacts: many(contacts),
  outgoingCalls: many(calls, { relationName: "caller" }),
  incomingCalls: many(calls, { relationName: "receiver" }),
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

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
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

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = z.infer<typeof insertOtpSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type ContactSyncSession = typeof contactSyncSessions.$inferSelect;
export type InsertContactSyncSession = z.infer<typeof insertContactSyncSessionSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Call = typeof calls.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;
export const selectCallSchema = createSelectSchema(calls);

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