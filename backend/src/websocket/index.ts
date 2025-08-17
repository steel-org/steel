
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";
import { PrismaClient } from "@prisma/client";

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

    // New unified chat message handler
    socket.on("send_message", async (data: {
      chatId: string;
      content: string;
      type?: string;
      replyToId?: string;
      language?: string;
      filename?: string;
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

        // Persist message
        const message = await prisma.message.create({
          data: {
            chatId,
            content,
            type: type as any,
            senderId: socket.userId,
            replyToId: replyToId || null,
          },
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

        // Broadcast to all participants via per-user rooms
        const participantIds = chat.members.map((m) => m.userId);
        for (const uid of participantIds) {
          io.to(`user:${uid}`).emit("message_received", { message });
          io.to(`user:${uid}`).emit("new_message", message);
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

    // Handle message deletion
    socket.on("delete_message", async (data: {
      messageId: string;
      chatId: string;
      deleteForEveryone?: boolean;
    }) => {
      const { messageId, chatId } = data;
      const userId = socket.userId;
      if (!userId) return;

      try {
        const messageWithChat = await prisma.message.findUnique({
          where: { id: messageId },
          include: { 
            chat: {
              include: {
                members: true
              }
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

        if (messageWithChat.senderId !== userId) {
          console.log('User is not the sender of this message');
          return;
        }

        await prisma.message.delete({ where: { id: messageId } });

        const participants = await prisma.chat.findUnique({
          where: { id: chatId },
          select: { members: { select: { userId: true } } }
        });

        if (participants) {
          for (const m of participants.members) {
            io.to(`user:${m.userId}`).emit("message_deleted", { messageId, chatId });
          }
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
