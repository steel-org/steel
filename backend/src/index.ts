import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";
import dotenv from "dotenv";

import { setupRoutes } from "./routes";
import { setupWebSocket } from "./websocket";
import { logger } from "./utils/logger";
import { errorHandler } from "./middleware/errorHandler";
import { setIO } from "./websocket/io";

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Build CORS allow-list (supports comma-separated CORS_ORIGIN)
const buildAllowedOrigins = () => {
  const env = (process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
  const defaults = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://biuld.vercel.app",
  ];
  return Array.from(new Set([...defaults, ...env]));
};

// Runtime origin checker: allow localhost, 127.0.0.1, *.local, and LAN IPs in dev
const isDevOriginAllowed = (origin?: string | null) => {
  if (!origin) return true; // allow non-browser clients or same-origin server calls
  try {
    const u = new URL(origin);
    const host = u.hostname;
    // localhost and loopback
    if (host === 'localhost' || host === '127.0.0.1') return true;
    // *.local domains
    if (/^[a-z0-9-]+\.local$/i.test(host)) return true;
    // IPv4 LAN (e.g., 192.168.x.x or 10.x.x.x or 172.16-31.x.x)
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)) return true;
  } catch {}
  return false;
};

const allowedOrigins = buildAllowedOrigins();

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || isDevOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by Socket.IO CORS'));
    },
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
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || isDevOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  optionsSuccessStatus: 204,
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
    version: "4.2.0",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(Number(PORT), "0.0.0.0", () => {
  logger.info(`🚀 Biuld Backend v4.2.0 running on port ${PORT}`);
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
