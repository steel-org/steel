import { Express, Request, Response } from "express";
import authRoutes from "./auth";
import chatRoutes from "./chat";
import messageRoutes from "./message";
import fileRoutes from "./file";
import userRoutes from "./user";

export const setupRoutes = (app: Express) => {
  app.use("/api/auth", authRoutes);
  app.use("/api/chats", chatRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/files", fileRoutes);
  app.use("/api/users", userRoutes);

  // API documentation
  app.get("/api/docs", (req: Request, res: Response) => {
    res.json({
      name: "Steel Chat API",
      version: "3.0.5",
      endpoints: {
        auth: {
          "POST /api/auth/register": "Register new user",
          "POST /api/auth/login": "Login user",
          "POST /api/auth/logout": "Logout user",
          "GET /api/auth/me": "Get current user",
        },
        chats: {
          "GET /api/chats": "Get user chats",
          "POST /api/chats": "Create new chat",
          "GET /api/chats/:id": "Get chat details",
          "PUT /api/chats/:id": "Update chat",
          "DELETE /api/chats/:id": "Delete chat",
        },
        messages: {
          "GET /api/chats/:id/messages": "Get chat messages",
          "POST /api/chats/:id/messages": "Send message",
          "PUT /api/messages/:id": "Edit message",
          "DELETE /api/messages/:id": "Delete message",
        },
        files: {
          "POST /api/files/upload": "Upload file",
          "GET /api/files/:id": "Get file info",
          "GET /api/files/:id/download": "Download file",
        },
        users: {
          "GET /api/users": "Search users",
          "GET /api/users/:id": "Get user profile",
        },
      },
      websocket: {
        events: {
          join_chat: "Join chat room",
          send_message: "Send message",
          typing: "Typing indicator",
          react_to_message: "React to message",
        },
      },
    });
  });
};
