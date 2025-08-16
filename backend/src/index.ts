import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";
import dotenv from "dotenv";
import path from "path";

import { setupRoutes } from "./routes";
import { setupWebSocket } from "./websocket";
import { logger } from "./utils/logger";
import { errorHandler } from "./middleware/errorHandler";
import { setIO } from "./websocket/io";

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Make io available to route handlers
setIO(io);

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    console.log('Request origin:', origin);
    const allowedOrigins = ['http://localhost:3000', 'https://biuld.vercel.app'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Setup routes
setupRoutes(app);

// Setup WebSocket handlers
setupWebSocket(io);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    version: "4.0.1",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(Number(PORT), "0.0.0.0", () => {
  logger.info(`🚀 Biuld Backend v4.0.1 running on port ${PORT}`);
  logger.info(`📡 Socket.io server ready for connections`);
  logger.info(`🌐 Health check: http://localhost:${PORT}/api/health`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});
