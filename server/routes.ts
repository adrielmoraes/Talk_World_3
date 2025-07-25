import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertOtpSchema, insertMessageSchema, insertCallSchema, insertContactSchema } from "@shared/schema";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { voiceTranslationService } from "./voice-translation";
import { groqTranslationService } from "./groq-translation";
import multer from "multer";
import type { FileFilterCallback } from "multer";
import fs from "fs";
import path from "path";

const JWT_SECRET = process.env.JWT_SECRET || "talk-world-secret-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30d";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_API_URL = process.env.TWILIO_API_URL;
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '26214400');
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const ALLOWED_FILE_TYPES = process.env.ALLOWED_FILE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'audio/mpeg', 'audio/wav'];
const TRANSLATION_RATE_LIMIT = parseInt(process.env.TRANSLATION_RATE_LIMIT || '100');
const VOICE_RATE_LIMIT = parseInt(process.env.VOICE_RATE_LIMIT || '50');
const OTP_RATE_LIMIT = parseInt(process.env.OTP_RATE_LIMIT || '5');
const WEBSOCKET_PATH = process.env.WEBSOCKET_PATH || '/ws';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
}

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: WEBSOCKET_PATH });

  const connectedClients = new Map<number, AuthenticatedWebSocket>();

  // WebSocket connection handling
  wss.on('connection', (ws: AuthenticatedWebSocket, request) => {
    console.log('WebSocket connection established');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('[WebSocket] Received message:', message);

        if (message.type === 'auth') {
          // Authenticate WebSocket connection
          try {
            const decoded = jwt.verify(message.token, JWT_SECRET) as { userId: number };
            ws.userId = decoded.userId;
            connectedClients.set(decoded.userId, ws);
            console.log('[WebSocket] User authenticated:', decoded.userId);
            console.log('[WebSocket] Connected clients:', Array.from(connectedClients.keys()));
            
            // Atualizar status online no banco de dados
            await storage.updateUserOnlineStatus(decoded.userId, true);
            
            ws.send(JSON.stringify({ type: 'auth_success' }));
            
            // Broadcast user online status to all connected users
            Array.from(connectedClients.entries()).forEach(([userId, client]) => {
              if (client.readyState === WebSocket.OPEN && userId !== decoded.userId) {
                client.send(JSON.stringify({
                  type: 'user_status',
                  userId: decoded.userId,
                  isOnline: true,
                  lastSeen: null
                }));
              }
            });
          } catch (error) {
            ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid token' }));
            ws.close();
          }
        } else if (message.type === 'send_message') {
          // Handle sending messages
          if (ws.userId) {
            console.log('[WebSocket] Sending message from userId:', ws.userId, 'to conversation:', message.conversationId);
            
            // Get conversation and recipient info for proper translation
            const conversation = await storage.getConversationById(message.conversationId, ws.userId);
            if (!conversation) {
              console.log('[WebSocket] Conversation not found for id:', message.conversationId);
              return;
            }

            const recipientId = conversation.otherUser?.id;
            const recipient = await storage.getUser(recipientId);
            
            let finalTranslatedText = message.translatedText;
            let finalTargetLanguage = message.targetLanguage;

            // Always translate if recipient has preferred language and it's different from original
            if (recipient?.preferredLanguage) {
              try {
                // First detect the language of the original message
                const detectionResult = await groqTranslationService.detectLanguage(message.text);
                const detectedLanguage = detectionResult?.language;
                
                // Only translate if the detected language is different from recipient's preferred language
                if (detectedLanguage && detectedLanguage !== recipient.preferredLanguage) {
                  // Get previous messages for context (up to 3)
                  const previousMessages = [];
                  try {
                    const messages = await storage.getConversationMessages(message.conversationId);
                    if (messages && messages.length > 0) {
                      for (const msg of messages) {
                        previousMessages.push({
                          text: msg.originalText || msg.text,
                          sender: msg.senderId === ws.userId ? 'sender' : 'recipient'
                        });
                      }
                    }
                  } catch (err) {
                    console.error('[WebSocket] Error getting previous messages for context:', err);
                  }
                  
                  // Translate to recipient's preferred language with conversation context
                  const translation = await groqTranslationService.translateWithContext({
                    text: message.text,
                    sourceLanguage: detectedLanguage,
                    targetLanguage: recipient.preferredLanguage,
                    context: {
                      conversationId: message.conversationId,
                      senderId: ws.userId.toString(),
                      recipientId: recipientId.toString(),
                      messageType: 'chat',
                      previousMessages: previousMessages
                    }
                  });
                  
                  if (translation && translation.translatedText) {
                    finalTranslatedText = translation.translatedText;
                    finalTargetLanguage = recipient.preferredLanguage;
                    console.log('[WebSocket] Message translated from', detectedLanguage, 'to', recipient.preferredLanguage);
                  }
                } else {
                  console.log('[WebSocket] Translation skipped - same language detected:', detectedLanguage);
                }
              } catch (error) {
                console.error('[WebSocket] Translation error:', error);
              }
            }
            
            const newMessage = await storage.createMessage({
              conversationId: message.conversationId,
              senderId: ws.userId,
              originalText: message.text,
              translatedText: finalTranslatedText,
              targetLanguage: finalTargetLanguage,
            });

            console.log('[WebSocket] Message created:', newMessage);

            // Send message to both sender and recipient
            const messageData = {
              type: 'new_message',
              message: newMessage,
            };

            // Send to sender (for their chat history)
            ws.send(JSON.stringify(messageData));
            console.log('[WebSocket] Message sent to sender');

            // Send to recipient if online and mark as delivered
            console.log('[WebSocket] Sending to recipient:', recipientId);
            const recipientWs = connectedClients.get(recipientId);
            if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
              console.log('[WebSocket] Recipient WebSocket found and open');
              
              // Mark message as delivered
              await storage.markMessageAsDelivered(newMessage.id);
              
              // Update message data with delivery status
              const updatedMessage = { ...newMessage, isDelivered: true, deliveredAt: new Date() };
              
              recipientWs.send(JSON.stringify({
                type: 'new_message',
                message: updatedMessage,
              }));
              
              // Notify sender about delivery
              ws.send(JSON.stringify({
                type: 'message_delivered',
                messageId: newMessage.id,
                deliveredAt: new Date(),
              }));
            } else {
              console.log('[WebSocket] Recipient WebSocket not found or closed');
            }
          }
        } else if (message.type === 'webrtc_signal') {
          // Handle WebRTC signaling
          if (ws.userId && message.targetUserId) {
            const targetWs = connectedClients.get(message.targetUserId);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(JSON.stringify({
                type: 'webrtc_signal',
                signal: message.signal,
                fromUserId: ws.userId,
              }));
            }
          }
        } else if (message.type === 'voice_translation') {
          // Handle voice translation result broadcasting
          if (ws.userId && message.conversationId && message.targetUserId) {
            const targetWs = connectedClients.get(message.targetUserId);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(JSON.stringify({
                type: 'voice_translation',
                originalText: message.originalText,
                translatedText: message.translatedText,
                sourceLanguage: message.sourceLanguage,
                targetLanguage: message.targetLanguage,
                fromUserId: ws.userId,
                conversationId: message.conversationId,
                timestamp: message.timestamp,
              }));
            }
          }
        } else if (message.type === 'call_cleanup') {
          // Handle call cleanup for voice translation
          if (ws.userId && message.conversationId) {
            voiceTranslationService.cleanupConversation(ws.userId, message.conversationId);
          }
        } else if (message.type === 'get_user_status') {
          // Handle user status request
          if (ws.userId && message.userId) {
            const targetUserId = message.userId;
            const targetWs = connectedClients.get(targetUserId);
            
            // Check if user is online (both WebSocket and database)
            const isOnlineWs = targetWs && targetWs.readyState === WebSocket.OPEN;
            
            try {
              // Obter dados do usuário do banco
              const user = await storage.getUser(targetUserId);
              const lastActivity = await storage.getUserLastActivity(targetUserId);
              
              // Verificar se o usuário está realmente online
              const isOnline = isOnlineWs && user?.isOnline;
              
              // Usar lastSeenAt do banco ou lastActivity
              const lastSeen = !isOnline ? (user?.lastSeenAt || lastActivity) : null;
              
              // Send status back to requester
              ws.send(JSON.stringify({
                type: 'user_status',
                userId: targetUserId,
                isOnline,
                lastSeen,
                lastActivity
              }));
            } catch (error) {
              console.error('Error getting user status:', error);
              // Fallback para método anterior
              ws.send(JSON.stringify({
                type: 'user_status',
                userId: targetUserId,
                isOnline: isOnlineWs,
                lastSeen: null
              }));
            }
          }
        } else if (message.type === 'user_activity') {
          // Handle user activity updates (typing, viewing chat, etc.)
          if (ws.userId) {
            try {
              await storage.updateUserActivity(
                ws.userId, 
                message.activityType, 
                message.conversationId, 
                message.metadata
              );
              
              // Broadcast typing status to conversation participants
              if (message.activityType === 'typing' && message.conversationId) {
                const conversation = await storage.getConversationById(message.conversationId, ws.userId);
                if (conversation?.otherUser) {
                  const otherUserWs = connectedClients.get(conversation.otherUser.id);
                  if (otherUserWs && otherUserWs.readyState === WebSocket.OPEN) {
                    otherUserWs.send(JSON.stringify({
                      type: 'user_activity',
                      userId: ws.userId,
                      activityType: message.activityType,
                      conversationId: message.conversationId,
                      isTyping: message.isTyping
                    }));
                  }
                }
              }
            } catch (error) {
              console.error('Error updating user activity:', error);
            }
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', async () => {
      if (ws.userId) {
        connectedClients.delete(ws.userId);
        
        // Atualizar status offline no banco de dados
        try {
          await storage.updateUserOnlineStatus(ws.userId, false);
        } catch (error) {
          console.error('Error updating user offline status:', error);
        }
        
        // Broadcast user offline status to all connected users
        const lastSeen = new Date().toISOString();
        Array.from(connectedClients.entries()).forEach(([userId, client]) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'user_status',
              userId: ws.userId,
              isOnline: false,
              lastSeen
            }));
          }
        });
      }
    });
  });

  // Authentication middleware
  const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      req.userId = decoded.userId;
      next();
    } catch (error) {
      return res.status(403).json({ message: 'Invalid token' });
    }
  };

  // Send OTP
  app.post('/api/auth/send-otp', async (req, res) => {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ message: 'Phone number is required' });
      }

      // Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await storage.createOtpCode({
        phoneNumber,
        code,
        expiresAt,
      });

      // In production, send SMS via Twilio
      console.log(`OTP for ${phoneNumber}: ${code}`);

      res.json({ message: 'OTP sent successfully' });
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({ message: 'Failed to send OTP' });
    }
  });

  // Verify OTP and login/register
  app.post('/api/auth/verify-otp', async (req, res) => {
    try {
      const { phoneNumber, code } = req.body;

      if (!phoneNumber || !code) {
        return res.status(400).json({ message: 'Phone number and code are required' });
      }

      const otpCode = await storage.getValidOtpCode(phoneNumber, code);
      if (!otpCode) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }

      // Mark OTP as used
      await storage.markOtpAsUsed(otpCode.id);

      // Check if user exists
      let user = await storage.getUserByPhoneNumber(phoneNumber);

      if (!user) {
        // User doesn't exist, create new user (profile setup required)
        user = await storage.createUser({
          phoneNumber,
          username: '', // Will be set during profile setup
          preferredLanguage: 'pt-BR',
          gender: '', // Will be set during profile setup
        });
      }

      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

      res.json({
        token,
        user,
        requiresProfileSetup: !user.username || !user.gender,
      });
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({ message: 'Failed to verify OTP' });
    }
  });

  // Complete profile setup
  app.post('/api/auth/complete-profile', authenticateToken, async (req, res) => {
    try {
      const { username, gender, preferredLanguage, profilePhoto } = req.body;

      if (!username || !gender) {
        return res.status(400).json({ message: 'Username and gender are required' });
      }

      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Check if username is already taken
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser && existingUser.id !== req.userId) {
        return res.status(400).json({ message: 'Username already taken' });
      }

      const updatedUser = await storage.updateUser(req.userId, {
        username,
        gender,
        preferredLanguage: preferredLanguage || 'pt-BR',
        profilePhoto,
        isVerified: true,
      });

      res.json({ user: updatedUser });
    } catch (error) {
      console.error('Complete profile error:', error);
      res.status(500).json({ message: 'Failed to complete profile' });
    }
  });

  // Get current user
  app.get('/api/user/me', authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({ user });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Failed to get user' });
    }
  });

  // Get user contacts
  app.get('/api/contacts', authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const contacts = await storage.getUserContacts(req.userId);
      res.json({ contacts });
    } catch (error) {
      console.error('Get contacts error:', error);
      res.status(500).json({ message: 'Failed to get contacts' });
    }
  });

  // Add contact by phone number
  app.post('/api/contacts', authenticateToken, async (req, res) => {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ message: 'Phone number is required' });
      }

      const contactUser = await storage.getUserByPhoneNumber(phoneNumber);
      if (!contactUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const contact = await storage.addContact(req.userId, contactUser.id, contactUser.username, contactUser.phoneNumber);
      res.json({ contact });
    } catch (error) {
      console.error('Add contact error:', error);
      res.status(500).json({ message: 'Failed to add contact' });
    }
  });

  // Add contact by user ID
  app.post('/api/contacts/add-user', authenticateToken, async (req, res) => {
    try {
      const { contactUserId } = req.body;

      if (!contactUserId) {
        return res.status(400).json({ message: 'Contact user ID is required' });
      }

      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Get the contact user's information first
      const contactUser = await storage.getUser(contactUserId);
      if (!contactUser) {
        return res.status(404).json({ message: 'Contact user not found' });
      }

      const contact = await storage.addContact(req.userId, contactUserId, contactUser.username, contactUser.phoneNumber);
      res.json({ contact });
    } catch (error) {
      console.error('Add contact by user ID error:', error);
      res.status(500).json({ message: 'Failed to add contact' });
    }
  });

  // Get user conversations
  app.get('/api/conversations', authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const conversations = await storage.getUserConversations(req.userId);
      res.json({ conversations });
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({ message: 'Failed to get conversations' });
    }
  });

  // Get specific conversation by ID
  app.get('/api/conversations/:id', authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversationById(conversationId, req.userId);

      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }

      res.json({ conversation });
    } catch (error) {
      console.error('Get conversation error:', error);
      res.status(500).json({ message: 'Failed to get conversation' });
    }
  });

  // Create or get conversation
  app.post('/api/conversations', authenticateToken, async (req, res) => {
    try {
      const { contactUserId } = req.body;

      if (!contactUserId) {
        return res.status(400).json({ message: 'Contact user ID is required' });
      }

      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      let conversation = await storage.getConversationByParticipants(req.userId, contactUserId);

      if (!conversation) {
        conversation = await storage.createConversation({
          participant1Id: req.userId,
          participant2Id: contactUserId,
        });
      }

      res.json({ conversation });
    } catch (error) {
      console.error('Create conversation error:', error);
      res.status(500).json({ message: 'Failed to create conversation' });
    }
  });

  // Get conversation messages
  app.get('/api/conversations/:id/messages', authenticateToken, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getConversationMessages(conversationId);
      res.json({ messages });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ message: 'Failed to get messages' });
    }
  });

  // Toggle conversation translation
  app.patch('/api/conversations/:id/translation', authenticateToken, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { translationEnabled } = req.body;

      const conversation = await storage.updateConversationTranslation(conversationId, translationEnabled);
      res.json({ conversation });
    } catch (error) {
      console.error('Update translation error:', error);
      res.status(500).json({ message: 'Failed to update translation setting' });
    }
  });

  // Mark conversation messages as read
  app.patch('/api/conversations/:id/mark-read', authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const conversationId = parseInt(req.params.id);
      
      // Get unread messages before marking as read
      const unreadMessages = await storage.getUnreadMessages(conversationId, req.userId);
      
      await storage.markMessagesAsRead(conversationId, req.userId);
      
      // Notify senders about read status
      for (const message of unreadMessages) {
        const senderWs = connectedClients.get(message.senderId);
        if (senderWs && senderWs.readyState === WebSocket.OPEN) {
          senderWs.send(JSON.stringify({
            type: 'message_read',
            messageId: message.id,
            readAt: new Date(),
            conversationId: conversationId,
          }));
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({ message: 'Failed to mark messages as read' });
    }
  });

  // Get user calls
  app.get('/api/calls', authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const calls = await storage.getUserCalls(req.userId);
      res.json({ calls });
    } catch (error) {
      console.error('Get calls error:', error);
      res.status(500).json({ message: 'Failed to get calls' });
    }
  });

  // Create call
  app.post('/api/calls', authenticateToken, async (req, res) => {
    try {
      const { receiverId } = req.body;

      if (!receiverId) {
        return res.status(400).json({ message: 'Receiver ID is required' });
      }

      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const call = await storage.createCall({
        callerId: req.userId,
        receiverId,
        status: 'ringing',
      });

      // Notify receiver via WebSocket
      const receiverWs = connectedClients.get(receiverId);
      if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
        receiverWs.send(JSON.stringify({
          type: 'incoming_call',
          call,
        }));
      }

      res.json({ call });
    } catch (error) {
      console.error('Create call error:', error);
      res.status(500).json({ message: 'Failed to create call' });
    }
  });

  // Update call status
  app.patch('/api/calls/:id', authenticateToken, async (req, res) => {
    try {
      const callId = parseInt(req.params.id);
      const { status, duration } = req.body;

      const call = await storage.updateCall(callId, { status, duration });
      res.json({ call });
    } catch (error) {
      console.error('Update call error:', error);
      res.status(500).json({ message: 'Failed to update call' });
    }
  });

  // Set up multer for audio file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb: FileFilterCallback) => {
      if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type'));
      }
    }
  });

  // Set up multer for profile photo uploads
  const profilePhotoUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), UPLOAD_DIR, 'profiles');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        // Generate unique filename with timestamp and user ID
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `profile-${req.userId}-${uniqueSuffix}${extension}`);
      }
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for profile photos
    fileFilter: (req, file, cb: FileFilterCallback) => {
      // Only allow image files for profile photos
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (allowedImageTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Apenas arquivos de imagem (JPEG, PNG, WebP) são permitidos'));
      }
    }
  });

  // Voice translation endpoint - process audio chunks
  app.post('/api/voice/translate', authenticateToken, upload.single('audio'), async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Audio file is required' });
      }

      const { conversationId, targetLanguage = 'en-US' } = req.body;

      if (!conversationId) {
        return res.status(400).json({ message: 'Conversation ID is required' });
      }

      // Process audio chunk with voice translation service
      const result = await voiceTranslationService.processAudioChunk(
        req.file.buffer,
        req.userId,
        parseInt(conversationId),
        targetLanguage
      );

      if (result) {
        // Broadcast translation result to WebSocket clients
        const conversation = await storage.getConversationById(parseInt(conversationId), req.userId);
        if (conversation) {
          const recipientId = conversation.otherUser?.id;

          const recipientWs = connectedClients.get(recipientId);
          if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
            recipientWs.send(JSON.stringify({
              type: 'voice_translation',
              ...result,
            }));
          }
        }

        res.json({ success: true, translation: result });
      } else {
        res.json({ success: true, message: 'Audio chunk processed, waiting for more data' });
      }
    } catch (error) {
      console.error('Voice translation error:', error);
      res.status(500).json({ message: 'Failed to process voice translation' });
    }
  });

  // Text-to-Speech endpoint
  app.post('/api/voice/tts', authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { text, language = 'en-US' } = req.body;

      if (!text) {
        return res.status(400).json({ message: 'Text is required' });
      }

      // Generate speech using voice translation service
      const audioBuffer = await voiceTranslationService.generateSpeech(text, language);

      if (!audioBuffer) {
        return res.status(500).json({ message: 'Failed to generate speech' });
      }

      // Set appropriate headers for audio file
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Disposition', 'attachment; filename="speech.wav"');

      // Send the audio buffer as response
      res.send(audioBuffer);
    } catch (error) {
      console.error('TTS error:', error);
      res.status(500).json({ message: 'Failed to generate speech' });
    }
  });

  // FASE 5: Tradução de Texto - API endpoints for text translation

  // Get supported languages
  app.get('/api/translation/languages', (req, res) => {
    try {
      const languages = groqTranslationService.getSupportedLanguages();
      res.json({ languages });
    } catch (error) {
      console.error('Get languages error:', error);
      res.status(500).json({ message: 'Failed to get supported languages' });
    }
  });

  // Detect language of text
  app.post('/api/translation/detect', authenticateToken, async (req, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ message: 'Text is required' });
      }

      const detection = await groqTranslationService.detectLanguage(text);
      res.json({ detection });
    } catch (error) {
      console.error('Language detection error:', error);
      res.status(500).json({ message: 'Failed to detect language' });
    }
  });

  // Translate text
  app.post('/api/translation/translate', authenticateToken, async (req, res) => {
    try {
      const { text, targetLanguage, sourceLanguage, context } = req.body;

      if (!text || !targetLanguage) {
        return res.status(400).json({ message: 'Text and target language are required' });
      }

      let translation;
      if (context) {
        translation = await groqTranslationService.translateWithContext({
          text, 
          targetLanguage, 
          sourceLanguage,
          context
        });
      } else {
        translation = await groqTranslationService.translateText(
          text, 
          targetLanguage, 
          sourceLanguage
        );
      }

      res.json({ translation });
    } catch (error) {
      console.error('Translation error:', error);
      res.status(500).json({ message: 'Failed to translate text' });
    }
  });

  // Batch translate multiple texts
  app.post('/api/translation/batch', authenticateToken, async (req, res) => {
    try {
      const { texts, targetLanguage, sourceLanguage } = req.body;

      if (!texts || !Array.isArray(texts) || !targetLanguage) {
        return res.status(400).json({ message: 'Texts array and target language are required' });
      }

      if (texts.length > 50) {
        return res.status(400).json({ message: 'Maximum 50 texts per batch request' });
      }

      const translations = await groqTranslationService.translateBatch(
        texts, 
        targetLanguage, 
        sourceLanguage
      );

      res.json({ translations });
    } catch (error) {
      console.error('Batch translation error:', error);
      res.status(500).json({ message: 'Failed to translate texts' });
    }
  });

  // FASE 3: Gerenciamento de Contatos - Contact management APIs

  // Sync contacts from device
  app.post('/api/contacts/sync', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId!;
      const { contacts: deviceContacts } = req.body;

      if (!deviceContacts || !Array.isArray(deviceContacts)) {
        return res.status(400).json({ message: 'Contacts array is required' });
      }

      // Validate contact format
      const validatedContacts = deviceContacts.filter(contact => 
        contact.name && contact.phoneNumber && 
        typeof contact.name === 'string' && 
        typeof contact.phoneNumber === 'string'
      );

      if (validatedContacts.length === 0) {
        return res.status(400).json({ message: 'No valid contacts provided' });
      }

      const syncSession = await storage.syncContacts(userId, validatedContacts);
      res.json({ syncSession });
    } catch (error) {
      console.error('Contact sync error:', error);
      res.status(500).json({ message: 'Failed to sync contacts' });
    }
  });

  // Get user's contacts
  app.get('/api/contacts', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId!;
      const contacts = await storage.getUserContacts(userId);
      res.json({ contacts });
    } catch (error) {
      console.error('Get contacts error:', error);
      res.status(500).json({ message: 'Failed to get contacts' });
    }
  });

  // Find users by phone numbers
  app.post('/api/contacts/find-users', authenticateToken, async (req, res) => {
    try {
      const { phoneNumbers } = req.body;

      if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
        return res.status(400).json({ message: 'Phone numbers array is required' });
      }

      if (phoneNumbers.length > 100) {
        return res.status(400).json({ message: 'Maximum 100 phone numbers per request' });
      }

      const users = await storage.findUsersByPhoneNumbers(phoneNumbers);

      // Don't expose sensitive user data
      const publicUsers = users.map(user => ({
        id: user.id,
        phoneNumber: user.phoneNumber,
        username: user.username,
        profilePhoto: user.profilePhoto,
        isVerified: user.isVerified
      }));

      res.json({ users: publicUsers });
    } catch (error) {
      console.error('Find users error:', error);
      res.status(500).json({ message: 'Failed to find users' });
    }
  });

  // Update contact nickname
  app.patch('/api/contacts/:contactId/nickname', authenticateToken, async (req, res) => {
    try {
      const contactId = parseInt(req.params.contactId);
      const { nickname } = req.body;

      if (!nickname || typeof nickname !== 'string') {
        return res.status(400).json({ message: 'Nickname is required' });
      }

      const contact = await storage.updateContactNickname(contactId, nickname);
      res.json({ contact });
    } catch (error) {
      console.error('Update nickname error:', error);
      res.status(500).json({ message: 'Failed to update contact nickname' });
    }
  });

  // Delete contact
  app.delete('/api/contacts/:contactId', authenticateToken, async (req, res) => {
    try {
      const contactId = parseInt(req.params.contactId);
      await storage.deleteContact(contactId);
      res.json({ message: 'Contact deleted successfully' });
    } catch (error) {
      console.error('Delete contact error:', error);
      res.status(500).json({ message: 'Failed to delete contact' });
    }
  });

  // Get contact sync history
  app.get('/api/contacts/sync-history', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId!;
      const history = await storage.getContactSyncHistory(userId);
      res.json({ history });
    } catch (error) {
      console.error('Get sync history error:', error);
      res.status(500).json({ message: 'Failed to get sync history' });
    }
  });

  // Add individual contact by user ID
  app.post('/api/contacts/add-user', authenticateToken, async (req, res) => {
    try {
      const userId = req.userId!;
      const { contactUserId } = req.body;

      if (!contactUserId || typeof contactUserId !== 'number') {
        return res.status(400).json({ message: 'Contact user ID is required' });
      }

      const contact = await storage.addContact(userId, contactUserId);
      res.json({ contact });
    } catch (error) {
      console.error('Add contact error:', error);
      res.status(500).json({ message: 'Failed to add contact' });
    }
  });





  // Update user profile
  app.patch("/api/user/profile", authenticateToken, async (req, res) => {
    try {
      const { username, preferredLanguage } = req.body;

      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const updatedUser = await storage.updateUser(req.userId, {
        username,
        preferredLanguage,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ user: updatedUser });
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Upload profile photo
  app.post("/api/user/profile-photo", authenticateToken, profilePhotoUpload.single('profilePhoto'), async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Nenhuma imagem foi enviada' });
      }

      // Generate the URL for the uploaded file
      const profilePhotoUrl = `/uploads/profiles/${req.file.filename}`;

      // Update user profile with new photo URL
      const updatedUser = await storage.updateUser(req.userId, {
        profilePhoto: profilePhotoUrl,
      });

      if (!updatedUser) {
        // If user update fails, delete the uploaded file
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting uploaded file:', unlinkError);
        }
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      res.json({ 
        message: 'Foto de perfil atualizada com sucesso',
        profilePhoto: profilePhotoUrl,
        user: updatedUser 
      });
    } catch (error) {
      console.error("Error uploading profile photo:", error);
      
      // Clean up uploaded file if there was an error
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting uploaded file after error:', unlinkError);
        }
      }
      
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Delete profile photo
  app.delete("/api/user/profile-photo", authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Get current user to find existing profile photo
      const currentUser = await storage.getUser(req.userId);
      if (!currentUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Delete the old profile photo file if it exists
      if (currentUser.profilePhoto) {
        const oldPhotoPath = path.join(process.cwd(), 'uploads', 'profiles', path.basename(currentUser.profilePhoto));
        try {
          if (fs.existsSync(oldPhotoPath)) {
            fs.unlinkSync(oldPhotoPath);
          }
        } catch (deleteError) {
          console.error('Error deleting old profile photo:', deleteError);
        }
      }

      // Update user profile to remove photo
      const updatedUser = await storage.updateUser(req.userId, {
        profilePhoto: null,
      });

      res.json({ 
        message: 'Foto de perfil removida com sucesso',
        user: updatedUser 
      });
    } catch (error) {
      console.error("Error deleting profile photo:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Get notification settings
  app.get("/api/user/notification-settings", authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const settings = await storage.getUserNotificationSettings(req.userId);
      res.json({ settings });
    } catch (error) {
      console.error("Error fetching notification settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update notification settings
  app.patch("/api/user/notification-settings", authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const settingsData = req.body;
      const updatedSettings = await storage.updateNotificationSettings(req.userId, settingsData);
      res.json({ message: "Settings updated successfully", settings: updatedSettings });
    } catch (error) {
      console.error("Error updating notification settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get storage information
  app.get("/api/user/storage", authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const storageData = await storage.getUserStorageData(req.userId);
      
      const responseData = {
        totalUsed: storageData.totalUsed,
        photos: storageData.photos,
        videos: storageData.videos,
        audio: storageData.audio,
        cache: storageData.cache,
        total: 1000, // Fixed total storage limit
      };

      const settings = {
        autoDownloadPhotos: storageData.autoDownloadPhotos,
        autoDownloadVideos: storageData.autoDownloadVideos,
        autoDownloadAudio: storageData.autoDownloadAudio,
      };

      res.json({ storage: responseData, settings });
    } catch (error) {
      console.error("Error fetching storage info:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update download settings
  app.patch("/api/user/download-settings", authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const settingsData = req.body;
      const updatedSettings = await storage.updateUserStorageData(req.userId, settingsData);
      res.json({ message: "Download settings updated successfully", settings: updatedSettings });
    } catch (error) {
      console.error("Error updating download settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Clear cache
  app.post("/api/user/clear-cache", authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      await storage.clearUserCache(req.userId);
      res.json({ message: "Cache cleared successfully" });
    } catch (error) {
      console.error("Error clearing cache:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete all user data
  app.delete("/api/user/delete-all-data", authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      await storage.deleteAllUserData(req.userId);
      res.json({ message: "All data deleted successfully" });
    } catch (error) {
      console.error("Error deleting user data:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get conversation settings
  app.get("/api/user/conversation-settings", authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const userSettings = await storage.getUserConversationSettings(req.userId);
      
      // Formatar os dados para o cliente
      const settings = {
        defaultTranslationEnabled: userSettings.defaultTranslationEnabled,
        defaultTargetLanguage: userSettings.defaultTargetLanguage,
        showOriginalText: userSettings.showOriginalText,
        archiveOldMessages: userSettings.archiveOldMessages,
        messageRetentionDays: String(userSettings.messageRetentionDays),
      };

      res.json({ settings });
    } catch (error) {
      console.error("Error fetching conversation settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update conversation settings
  app.patch("/api/user/conversation-settings", authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const settingsData = req.body;
      
      // Converter messageRetentionDays para número
      const formattedSettings = {
        ...settingsData,
        messageRetentionDays: parseInt(settingsData.messageRetentionDays, 10)
      };
      
      // Salvar no banco de dados
      const updatedSettings = await storage.updateUserConversationSettings(req.userId, formattedSettings);
      
      // Formatar os dados para o cliente
      const settings = {
        defaultTranslationEnabled: updatedSettings.defaultTranslationEnabled,
        defaultTargetLanguage: updatedSettings.defaultTargetLanguage,
        showOriginalText: updatedSettings.showOriginalText,
        archiveOldMessages: updatedSettings.archiveOldMessages,
        messageRetentionDays: String(updatedSettings.messageRetentionDays),
      };
      
      res.json({ message: "Conversation settings updated successfully", settings });
    } catch (error) {
      console.error("Error updating conversation settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get call settings
  app.get("/api/user/call-settings", authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Mock settings for now - in production, store in database
      const settings = {
        enableVoiceTranslation: true,
        voiceTranslationLanguage: "en-US",
        enableEchoCancellation: true,
        enableNoiseSuppression: true,
        microphoneVolume: 80,
        speakerVolume: 70,
        defaultCallType: "voice",
        autoAnswer: false,
        callWaiting: true,
      };

      res.json({ settings });
    } catch (error) {
      console.error("Error fetching call settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update call settings
  app.patch("/api/user/call-settings", authenticateToken, async (req, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const settingsData = req.body;
      // In production, save to database
      res.json({ message: "Call settings updated successfully", settings: settingsData });
    } catch (error) {
      console.error("Error updating call settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}