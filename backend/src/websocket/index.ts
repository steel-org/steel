
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

interface ConnectedUser {
  id: string;
  username: string;
  avatar?: string;
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

    // Handle user joining
    socket.on("join", (userData: { username: string; avatar?: string }) => {
      const { username, avatar } = userData;

      const user: ConnectedUser = {
        id: socket.id,
        username: username || `User-${socket.id.slice(0, 6)}`,
        avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${socket.id}`,
        joinedAt: new Date(),
        isOnline: true,
        lastSeen: new Date(),
      };

      connectedUsers.set(socket.id, user);

      // Send current users list to all clients
      io.emit("users", Array.from(connectedUsers.values()));

      // Notify others about new user
      socket.broadcast.emit("userJoined", user);

      logger.info(`User ${username} joined the chat`);
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

    // Handle typing indicator
    socket.on("typing", (data: { recipientId: string; isTyping: boolean }) => {
      const { recipientId, isTyping } = data;
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const recipientSocket = io.sockets.sockets.get(recipientId);
      if (recipientSocket) {
        recipientSocket.emit("userTyping", {
          userId: socket.id,
          username: user.username,
          isTyping,
        });
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
    socket.on("deleteMessage", (data: { messageId: string; recipientId: string }) => {
      const { messageId, recipientId } = data;
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      // Notify sender about deletion
      socket.emit("messageDeleted", { messageId });

      // Notify recipient about deletion
      const recipientSocket = io.sockets.sockets.get(recipientId);
      if (recipientSocket) {
        recipientSocket.emit("messageDeleted", { messageId });
      }
    });

    // Handle user going offline
    socket.on("disconnect", () => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        user.isOnline = false;
        user.lastSeen = new Date();

        // Update users list
        io.emit("users", Array.from(connectedUsers.values()));

        // Notify others about user going offline
        socket.broadcast.emit("userLeft", user);

        connectedUsers.delete(socket.id);
        logger.info(`User ${user.username} left the chat`);
      }
    });
  });
};
