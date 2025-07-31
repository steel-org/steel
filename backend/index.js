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
        ? ["https://your-frontend-domain.vercel.app"]
        : ["http://localhost:3000"],
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Store connected users
const connectedUsers = new Map();
const messages = [];

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user joining
  socket.on("join", (userData) => {
    const { username, avatar } = userData;

    connectedUsers.set(socket.id, {
      id: socket.id,
      username: username || `User-${socket.id.slice(0, 6)}`,
      avatar:
        avatar ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${socket.id}`,
      joinedAt: new Date(),
    });

    // Send current users list to all clients
    io.emit("users", Array.from(connectedUsers.values()));

    // Send message history to new user
    socket.emit("messageHistory", messages);

    // Notify others about new user
    socket.broadcast.emit("userJoined", connectedUsers.get(socket.id));

    console.log(`User ${username} joined the chat`);
  });

  // Handle chat messages
  socket.on("message", (messageData) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const message = {
      id: Date.now().toString(),
      text: messageData.text,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
      },
      timestamp: new Date().toISOString(),
      type: messageData.type || "text", // text, code, system
    };

    // Store message
    messages.push(message);

    // Keep only last 100 messages
    if (messages.length > 100) {
      messages.shift();
    }

    // Broadcast to all clients
    io.emit("message", message);
  });

  // Handle typing indicator
  socket.on("typing", (isTyping) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    socket.broadcast.emit("userTyping", {
      userId: socket.id,
      username: user.username,
      isTyping,
    });
  });

  // Handle code snippet sharing
  socket.on("codeSnippet", (snippetData) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const message = {
      id: Date.now().toString(),
      text: snippetData.code,
      language: snippetData.language || "javascript",
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
      },
      timestamp: new Date().toISOString(),
      type: "code",
    };

    messages.push(message);
    if (messages.length > 100) {
      messages.shift();
    }

    io.emit("message", message);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      connectedUsers.delete(socket.id);

      // Notify others about user leaving
      socket.broadcast.emit("userLeft", user);

      // Update users list
      io.emit("users", Array.from(connectedUsers.values()));

      console.log(`User ${user.username} left the chat`);
    }
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    connectedUsers: connectedUsers.size,
    totalMessages: messages.length,
  });
});

// Get server info
app.get("/info", (req, res) => {
  res.json({
    name: "Steel Chat Backend",
    version: "1.0.0",
    connectedUsers: connectedUsers.size,
    totalMessages: messages.length,
    uptime: process.uptime(),
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Steel Chat Backend running on port ${PORT}`);
  console.log(`📡 Socket.io server ready for connections`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});
