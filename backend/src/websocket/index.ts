
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";
import { PrismaClient } from "@prisma/client";
import { sendPushToSubscription } from "../utils/push";

const prisma = new PrismaClient();

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

interface ConnectedUser {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  status?: string;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  roles?: string[];
  joinedAt: Date;
  isOnline: boolean;
  lastSeen: Date;
}

const connectedUsers = new Map<string, ConnectedUser>();

export const setupWebSocket = (io: Server) => {
  // Authentication middleware for Socket.IO
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error("Authentication error"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    logger.info(`User connected: ${socket.id} (userId: ${socket.userId})`);

    // Join a stable per-user room for targeted events
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    socket.on("join", async (userData: { userId: string; username: string; avatar?: string }) => {
      const { userId, username, avatar } = userData;

      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            status: 'online',
            lastSeen: new Date()
          },
        });

        const user: ConnectedUser = {
          id: userId,
          username: username || `User-${socket.id.slice(0, 6)}`,
          avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(username || `User-${socket.id.slice(0, 6)}`)}&background=3b82f6&color=ffffff&size=128&rounded=true`,
          joinedAt: new Date(),
          isOnline: true,
          lastSeen: new Date(),
        };

        connectedUsers.set(userId, user);

        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            status: true,
            lastSeen: true,
            createdAt: true,
            bio: true,
            location: true,
            website: true,
            roles: true
          }
        });

        if (dbUser) {   
          const connectedUser: ConnectedUser = {
            id: dbUser.id,
            username: dbUser.username,
            displayName: dbUser.displayName || undefined,
            avatar: dbUser.avatar || undefined,
            status: dbUser.status,
            bio: dbUser.bio || undefined,
            location: dbUser.location || undefined,
            website: dbUser.website || undefined,
            roles: dbUser.roles,
            joinedAt: new Date(),
            isOnline: true,
            lastSeen: new Date(dbUser.lastSeen)
          };
          connectedUsers.set(userId, connectedUser);

          io.emit("users", Array.from(connectedUsers.values()));

          socket.broadcast.emit("userStatusChange", {
            userId: dbUser.id,
            status: 'online',
            lastSeen: new Date()
          });

          logger.info(`User ${username} (${userId}) joined the chat`);
        }
      } catch (error) {
        logger.error('Error in join handler:', error);
      }
    });

    // Handle read receipts for a batch of messages in a chat
    socket.on("mark_read", async (data: { chatId: string; messageIds: string[] }) => {
      try {
        if (!socket.userId) return;
        const { chatId, messageIds } = data || {} as any;
        if (!chatId || !Array.isArray(messageIds) || messageIds.length === 0) return;

        // Verify membership
        const chat = await prisma.chat.findUnique({
          where: { id: chatId },
          include: { members: { select: { userId: true } } },
        });
        if (!chat) return;
        const isParticipant = chat.members.some((m) => m.userId === socket.userId);
        if (!isParticipant) return;

        // Only mark as READ for messages in this chat that were NOT sent by this user
        const messages = await prisma.message.findMany({
          where: {
            id: { in: messageIds },
            chatId,
            senderId: { not: socket.userId },
          },
          select: { id: true },
        });
        const validIds = messages.map((m) => m.id);
        if (validIds.length === 0) return;

        await prisma.message.updateMany({
          where: { id: { in: validIds } },
          data: { status: 'READ' },
        });

        // Emit status to all participants so UIs update consistently
        for (const mId of validIds) {
          for (const member of chat.members) {
            io.to(`user:${member.userId}`).emit("message_status", { messageId: mId, status: 'READ' });
          }
        }
      } catch (err) {
        console.error('Error handling mark_read:', err);
      }
    });

    // New unified chat message handler
    socket.on("send_message", async (data: {
      chatId: string;
      content: string;
      type?: string;
      replyToId?: string;
      language?: string;
      filename?: string;
      attachments?: Array<{
        url: string;
        originalName: string;
        mimeType: string;
        size: number;
        thumbnail?: string | null;
        // storage metadata from upload response
        path?: string;                // e.g., "chat-files/<userId>/<file>"
        storageKey?: string;          // alias for path
        storageBucket?: string;       // override bucket if provided
        storageProvider?: string;     // e.g., "supabase"
      }>;
    }) => {
      try {
        if (!socket.userId) return;

        const { chatId, content, type = "TEXT", replyToId } = data;

        // Verify membership
        const chat = await prisma.chat.findUnique({
          where: { id: chatId },
          include: {
            members: { select: { userId: true } },
          },
        });

        if (!chat) return;

        const isParticipant = chat.members.some((m) => m.userId === socket.userId);
        if (!isParticipant) return;

        // Persist message first
        const created = await prisma.message.create({
          data: {
            chatId,
            content,
            type: type as any,
            senderId: socket.userId,
            replyToId: replyToId || null,
            ...(data.language ? { language: data.language } : {}),
            ...(data.filename ? { filename: data.filename } : {}),
          },
        });

        // Persist attachments if provided
        if (Array.isArray(data.attachments) && data.attachments.length > 0) {
          for (const att of data.attachments) {
            try {
              const storageProvider = att.storageProvider || 'supabase';
              const storageBucket = att.storageBucket || process.env.SUPABASE_BUCKET || null;
              const storageKey = att.storageKey || att.path || null;

              await prisma.attachment.create({
                data: {
                  filename: att.originalName,
                  originalName: att.originalName,
                  mimeType: att.mimeType,
                  size: Math.max(0, Number(att.size) || 0),
                  url: att.url,
                  thumbnail: att.thumbnail || null,
                  messageId: created.id,
                  ...(storageProvider ? { storageProvider } : {}),
                  ...(storageBucket ? { storageBucket } : {}),
                  ...(storageKey ? { storageKey } : {}),
                },
              });
            } catch (e) {
              console.error("Failed to create attachment for message", created.id, e);
            }
          }
        }

        const message = await prisma.message.findUnique({
          where: { id: created.id },
          include: {
            sender: {
              select: { id: true, username: true, avatar: true },
            },
            replyTo: {
              include: {
                sender: { select: { id: true, username: true } },
              },
            },
            attachments: true,
            reactions: {
              include: { user: { select: { id: true, username: true } } },
            },
          },
        });

        // Update chat lastMessage
        await prisma.chat.update({
          where: { id: chatId },
          data: { lastMessage: new Date() },
        });

        // Broadcast to all participants via per-user rooms (single event to prevent duplication)
        if (message) {
          const participantIds = chat.members.map((m) => m.userId);
          for (const uid of participantIds) {
            io.to(`user:${uid}`).emit("message_received", { message });
          }
          // Fire-and-forget push notifications to all other participants.
          // The Service Worker will decide whether to surface UI based on client visibility.
          try {
            const targetIds = participantIds.filter((uid) => uid !== socket.userId);
            if (targetIds.length > 0) {
              for (const uid of targetIds) {
                const subs = await prisma.pushSubscription.findMany({ where: { userId: uid } });
                for (const sub of subs) {
                  try {
                    await sendPushToSubscription(
                      {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth },
                      },
                      {
                        title: message.sender?.username ? `${message.sender.username}` : 'New message',
                        body: message.content?.slice(0, 140) || 'You have a new message',
                        data: { url: process.env.CORS_ORIGIN || 'http://localhost:3000', chatId: message.chatId },
                      }
                    );
                  } catch (e: any) {
                    if (e?.code === 404 || e?.code === 410) {
                      // Cleanup stale subscription
                      await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
                    } else {
                      console.warn('Failed to send push', e);
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.warn('Push notification dispatch failed', e);
          }
        }
      } catch (err) {
        console.error("Error handling send_message:", err);
      }
    });

    // Handle private messages
    socket.on("privateMessage", (messageData: {
      recipientId: string;
      text: string;
      type?: string;
      replyTo?: string;
    }) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const { recipientId, text, type = "text", replyTo = null } = messageData;

      const message = {
        id: Date.now().toString(),
        text,
        senderId: socket.id,
        recipientId,
        timestamp: new Date().toISOString(),
        type,
        status: "sent",
        replyTo,
        senderName: user.username,
      };

      // Send to sender (for confirmation)
      socket.emit("messageReceived", message);

      // Send to recipient if online
      const recipientSocket = io.sockets.sockets.get(recipientId);
      if (recipientSocket) {
        recipientSocket.emit("newMessage", message);
        // Mark as delivered
        message.status = "delivered";
        socket.emit("messageStatusUpdate", {
          messageId: message.id,
          status: "delivered",
        });
      }
    });

    // Handle message read receipts
    socket.on("markAsRead", (data: { senderId: string; messageId: string }) => {
      const { senderId, messageId } = data;
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      // Notify sender about read status
      const senderSocket = io.sockets.sockets.get(senderId);
      if (senderSocket) {
        senderSocket.emit("messageStatusUpdate", {
          messageId,
          status: "read",
        });
      }
    });

    // Handle typing indicator by chatId for all participants
    socket.on("typing", async (data: { chatId: string; isTyping: boolean }) => {
      try {
        if (!socket.userId) return;
        const { chatId, isTyping } = data;

        const chat = await prisma.chat.findUnique({
          where: { id: chatId },
          include: { members: { select: { userId: true, user: { select: { username: true } } } } },
        });
        if (!chat) return;
        const me = chat.members.find((m) => m.userId === socket.userId);
        const username = me?.user?.username || "";

        for (const m of chat.members) {
          if (m.userId === socket.userId) continue;
          io.to(`user:${m.userId}`).emit("user_typing", {
            chatId,
            userId: socket.userId,
            username,
            isTyping,
          });
        }
      } catch (err) {
        console.error("Error handling typing event:", err);
      }
    });

    // Handle message reactions (toggle per user/message/reaction)
    socket.on("react_to_message", async (data: { messageId: string; reaction: string }) => {
      try {
        if (!socket.userId) return;
        const { messageId, reaction } = data || ({} as any);
        if (!messageId || !reaction) return;

        // Load message with chat and members
        const message = await prisma.message.findUnique({
          where: { id: messageId },
          include: {
            chat: { include: { members: { select: { userId: true, user: { select: { username: true } } } } } },
          },
        });
        if (!message || !message.chat) return;

        // Verify participant
        const isParticipant = message.chat.members.some((m) => m.userId === socket.userId);
        if (!isParticipant) return;

        // Toggle reaction
        const existing = await prisma.messageReaction.findUnique({
          where: {
            userId_messageId_reaction: {
              userId: socket.userId,
              messageId: messageId,
              reaction,
            },
          },
        });

        if (existing) {
          await prisma.messageReaction.delete({ where: { id: existing.id } });
        } else {
          await prisma.messageReaction.create({
            data: { userId: socket.userId, messageId, reaction },
          });
        }

        // Emit to all participants in the chat
        const me = message.chat.members.find((m) => m.userId === socket.userId);
        const username = me?.user?.username || "";
        for (const m of message.chat.members) {
          const payload = {
            chatId: message.chatId,
            messageId,
            reaction,
            userId: socket.userId,
            username,
            toggledOff: !!existing,
          } as any;
          io.to(`user:${m.userId}`).emit("message_reaction", payload);
        }
      } catch (err) {
        console.error("Error handling react_to_message:", err);
      }
    });

    // Handle code snippet sharing
    socket.on("codeSnippet", (snippetData: {
      recipientId: string;
      code: string;
      language?: string;
      replyTo?: string;
    }) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const { recipientId, code, language = "javascript", replyTo = null } = snippetData;

      const message = {
        id: Date.now().toString(),
        text: code,
        language,
        senderId: socket.id,
        recipientId,
        timestamp: new Date().toISOString(),
        type: "code",
        status: "sent",
        replyTo,
        senderName: user.username,
      };

      // Send to sender
      socket.emit("messageReceived", message);

      // Send to recipient if online
      const recipientSocket = io.sockets.sockets.get(recipientId);
      if (recipientSocket) {
        recipientSocket.emit("newMessage", message);
        message.status = "delivered";
        socket.emit("messageStatusUpdate", {
          messageId: message.id,
          status: "delivered",
        });
      }
    });

    // Handle message deletion (delete for me vs delete for everyone)
    socket.on("delete_message", async (data: {
      messageId: string;
      chatId: string;
      deleteForEveryone?: boolean;
    }) => {
      const { messageId, chatId, deleteForEveryone = false } = data;
      const userId = socket.userId;
      if (!userId) return;

      try {
        const messageWithChat = await prisma.message.findUnique({
          where: { id: messageId },
          include: { 
            chat: {
              include: { members: true }
            }
          }
        });

        if (!messageWithChat || !messageWithChat.chat) {
          console.log('Message or chat not found');
          return;
        }

        const isParticipant = messageWithChat.chat.members.some(member => member.userId === userId);
        if (!isParticipant) {
          console.log('User is not a participant in this chat');
          return;
        }

        // Only the sender may delete for everyone. Anyone can delete for self.
        if (deleteForEveryone) {
          if (messageWithChat.senderId !== userId) {
            console.log('User is not the sender; cannot delete for everyone');
            return;
          }

          await prisma.message.delete({ where: { id: messageId } });

          const participants = await prisma.chat.findUnique({
            where: { id: chatId },
            select: { members: { select: { userId: true } } }
          });

          if (participants) {
            for (const m of participants.members) {
              io.to(`user:${m.userId}`).emit("message_deleted", { messageId, chatId, deletedForEveryone: true });
            }
          }
        } else {
          // Delete for me: mark relation so this user no longer sees it; do not affect others
          await prisma.message.update({
            where: { id: messageId },
            data: { deletedFor: { connect: { id: userId } } }
          });
          // Emit only to this user's room so their client removes it
          io.to(`user:${userId}`).emit("message_deleted", { messageId, chatId, deletedForEveryone: false });
        }
      } catch (error) {
        console.error('Error in deleteMessage handler:', error);
        socket.emit("messageDeletionFailed", { messageId, error: "Failed to delete message" });
      }
    });
    
    // Handle user going offline
    socket.on("disconnect", async () => {
      try {
        const user = Array.from(connectedUsers.values()).find(u => u.id === socket.userId);
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              status: 'offline',
              lastSeen: new Date()
            },
          });

          connectedUsers.delete(user.id);

          socket.broadcast.emit("userStatusChange", {
            userId: user.id,
            status: 'offline',
            lastSeen: new Date()
          });

          io.emit("users", Array.from(connectedUsers.values()));

          logger.info(`User ${user.username} (${user.id}) left the chat`);
        }
      } catch (error) {
        logger.error('Error in disconnect handler:', error);
      }
    });
  });
};
