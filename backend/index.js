const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://steel-z6c6.vercel.app"]
        : ["http://localhost:3000"],
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

const connectedUsers = new Map();
const conversations = new Map();
const userConversations = new Map();

const getConversationId = (user1Id, user2Id) => {
  return [user1Id, user2Id].sort().join("_");
};

const getConversationParticipants = (conversationId) => {
  return conversationId.split("_");
};

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("join", (userData) => {
    const { username, avatar } = userData;

    connectedUsers.set(socket.id, {
      id: socket.id,
      username: username || `User-${socket.id.slice(0, 6)}`,
      avatar:
        avatar ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${socket.id}`,
      joinedAt: new Date(),
      isOnline: true,
      lastSeen: new Date(),
    });

    io.emit("users", Array.from(connectedUsers.values()));

    // Send user's conversations
    const userConversationIds = userConversations.get(socket.id) || [];
    const userConversationsData = userConversationIds.map((convId) => ({
      id: convId,
      participants: getConversationParticipants(convId)
        .map((participantId) => connectedUsers.get(participantId))
        .filter(Boolean),
      lastMessage: conversations.get(convId)?.slice(-1)[0] || null,
    }));

    socket.emit("userConversations", userConversationsData);

    // Notify others about new user
    socket.broadcast.emit("userJoined", connectedUsers.get(socket.id));

    console.log(`User ${username} joined the chat`);
  });

  socket.on("privateMessage", (messageData) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const { recipientId, text, type = "text" } = messageData;
    const conversationId = getConversationId(socket.id, recipientId);

    if (!conversations.has(conversationId)) {
      conversations.set(conversationId, []);

      [socket.id, recipientId].forEach((userId) => {
        if (!userConversations.has(userId)) {
          userConversations.set(userId, []);
        }
        if (!userConversations.get(userId).includes(conversationId)) {
          userConversations.get(userId).push(conversationId);
        }
      });
    }

    const message = {
      id: Date.now().toString(),
      text,
      senderId: socket.id,
      recipientId,
      conversationId,
      timestamp: new Date().toISOString(),
      type,
      status: "sent",
    };

    // Store message
    conversations.get(conversationId).push(message);

    // Keep only last 100 messages per conversation
    if (conversations.get(conversationId).length > 100) {
      conversations.get(conversationId).shift();
    }

    // Send to sender (for confirmation)
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

  socket.on("markAsRead", (data) => {
    const { conversationId } = data;
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const conversation = conversations.get(conversationId);
    if (!conversation) return;

    // Mark all messages from other user as read
    const updatedMessages = conversation.map((msg) => {
      if (msg.senderId !== socket.id && msg.status !== "read") {
        msg.status = "read";
        const senderSocket = io.sockets.sockets.get(msg.senderId);
        if (senderSocket) {
          senderSocket.emit("messageStatusUpdate", {
            messageId: msg.id,
            status: "read",
          });
        }
      }
      return msg;
    });

    conversations.set(conversationId, updatedMessages);
  });

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

    const { recipientId, code, language = "javascript" } = snippetData;
    const conversationId = getConversationId(socket.id, recipientId);

    if (!conversations.has(conversationId)) {
      conversations.set(conversationId, []);

      [socket.id, recipientId].forEach((userId) => {
        if (!userConversations.has(userId)) {
          userConversations.set(userId, []);
        }
        if (!userConversations.get(userId).includes(conversationId)) {
          userConversations.get(userId).push(conversationId);
        }
      });
    }

    const message = {
      id: Date.now().toString(),
      text: code,
      language,
      senderId: socket.id,
      recipientId,
      conversationId,
      timestamp: new Date().toISOString(),
      type: "code",
      status: "sent",
    };

    conversations.get(conversationId).push(message);
    if (conversations.get(conversationId).length > 100) {
      conversations.get(conversationId).shift();
    }

    socket.emit("messageReceived", message);

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

  socket.on("getConversation", (data) => {
    const { conversationId } = data;
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const messages = conversations.get(conversationId) || [];
    const participants = getConversationParticipants(conversationId);

    socket.emit("conversationData", {
      conversationId,
      messages,
      participants: participants
        .map((participantId) => connectedUsers.get(participantId))
        .filter(Boolean),
    });
  });

  // Handle message deletion
  socket.on("deleteMessage", (data) => {
    const { messageId, conversationId } = data;
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const conversation = conversations.get(conversationId);
    if (!conversation) return;

    const messageIndex = conversation.findIndex(
      (msg) => msg.id === messageId && msg.senderId === socket.id
    );

    if (messageIndex !== -1) {
      const deletedMessage = conversation.splice(messageIndex, 1)[0];

      socket.emit("messageDeleted", { messageId, conversationId });

      const recipientSocket = io.sockets.sockets.get(
        deletedMessage.recipientId
      );
      if (recipientSocket) {
        recipientSocket.emit("messageDeleted", { messageId, conversationId });
      }
    }
  });

  // Handle user going offline
  socket.on("disconnect", () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      user.isOnline = false;
      user.lastSeen = new Date();

      io.emit("users", Array.from(connectedUsers.values()));

      socket.broadcast.emit("userLeft", user);

      connectedUsers.delete(socket.id);
      console.log(`User ${user.username} left the chat`);
    }
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    connectedUsers: connectedUsers.size,
    totalConversations: conversations.size,
  });
});

app.get("/info", (req, res) => {
  res.json({
    name: "Steel Private Chat Backend",
    version: "2.0.0",
    connectedUsers: connectedUsers.size,
    totalConversations: conversations.size,
    uptime: process.uptime(),
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Steel Private Chat Backend running on port ${PORT}`);
  console.log(`📡 Socket.io server ready for connections`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`This is Version 2.0.0`);
});
