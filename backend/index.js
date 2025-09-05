const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://biuld.vercel.app"]
        : ["http://localhost:3000", "https://g17zp77p-3000.eun1.devtunnels.ms/"],
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Store connected users
const connectedUsers = new Map();

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user joining
  socket.on("join", async (userData) => {
    const { username, userId, avatar } = userData;

    try {
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            status: 'online',
            lastSeen: new Date()
          }
        });
      }

      const userInfo = {
        id: userId || socket.id,
        username: username || `User-${socket.id.slice(0, 6)}`,
        avatar: avatar || `https://ui-avatars.com/api/?name=${username || socket.id}&size=128&background=000000&color=ffffff`,
        isOnline: true,
        lastSeen: new Date(),
        userId: userId 
      };

      connectedUsers.set(socket.id, userInfo);

      // Get updated online users list
      const onlineUsers = Array.from(connectedUsers.values());
      
      // Send current users list to all clients
      io.emit("users", onlineUsers);

      // Notify others about new user
      socket.broadcast.emit("userJoined", userInfo);

      console.log(`User ${username} (${userId || 'guest'}) joined the chat`);
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  });

  // Handle private messages
  socket.on("privateMessage", (messageData) => {
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
  socket.on("markAsRead", (data) => {
    const { senderId } = data;
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    // Notify sender about read status
    const senderSocket = io.sockets.sockets.get(senderId);
    if (senderSocket) {
      senderSocket.emit("messageStatusUpdate", {
        messageId: data.messageId,
        status: "read",
      });
    }
  });

  // Handle typing indicator
  socket.on("typing", (data) => {
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
  socket.on("codeSnippet", (snippetData) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const {
      recipientId,
      code,
      language = "javascript",
      replyTo = null,
    } = snippetData;

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
  socket.on("deleteMessage", (data) => {
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
  socket.on("disconnect", async () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      try {
        if (user.userId) {
          await prisma.user.update({
            where: { id: user.userId },
            data: {
              status: 'offline',
              lastSeen: new Date()
            }
          });
        }

        user.isOnline = false;
        user.lastSeen = new Date();

        const onlineUsers = Array.from(connectedUsers.values())
          .filter(u => u.id !== socket.id);

        io.emit("users", onlineUsers);

        socket.broadcast.emit("userLeft", user);

        console.log(`User ${user.username} (${user.userId || 'guest'}) left the chat`);
      } catch (error) {
        console.error('Error updating user status on disconnect:', error);
      } finally {
        connectedUsers.delete(socket.id);
      }
    }
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    connectedUsers: connectedUsers.size,
  });
});

// Get server info
app.get("/info", (req, res) => {
  res.json({
    name: "Biuld Private Chat Backend",
    version: "4.1.1",
    connectedUsers: connectedUsers.size,
    uptime: process.uptime(),
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Biuld Private Chat Backend running on port ${PORT}`);
  console.log(`📡 Socket.io server ready for connections`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`This is Version 4.2.1`);
});
