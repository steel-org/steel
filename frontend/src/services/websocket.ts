import { io, Socket } from "socket.io-client";
import { apiService } from "./api";
import { useChatStore } from "@/stores/chatStore";
import { MessageEvent, TypingEvent, ReactionEvent } from "@/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:5000";

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = apiService.getToken();

      if (!token) {
        reject(new Error("No authentication token"));
        return;
      }

      this.socket = io(WS_URL, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
      });

      this.socket.on("connect", () => {
        console.log("Connected to WebSocket server");
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on("disconnect", (reason) => {
        console.log("Disconnected from WebSocket server:", reason);
        if (reason === "io server disconnect") {
          // Server disconnected, try to reconnect
          this.socket?.connect();
        }
      });

      this.socket.on("connect_error", (error) => {
        console.error("WebSocket connection error:", error);
        this.reconnectAttempts++;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error("Failed to connect to WebSocket server"));
        }
      });

      this.socket.on("error", (error) => {
        console.error("WebSocket error:", error);
        reject(error);
      });

      // Set up event handlers
      this.setupEventHandlers();
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Message events (accepts either { message } or a Message directly)
    this.socket.on("message_received", (data: any) => {
      const payload = data && data.message ? data : { message: data };
      useChatStore.getState().handleMessageReceived(payload);
    });

    this.socket.on(
      "message_status",
      (data: { messageId: string; status: string }) => {
        // Update message status in store
        const { messageId, status } = data;
        // Implementation depends on how you want to handle message status updates
      }
    );

    // Typing events
    this.socket.on("user_typing", (data: TypingEvent) => {
      useChatStore.getState().handleTypingEvent(data);
    });

    // Reaction events
    this.socket.on("message_reaction", (data: ReactionEvent) => {
      useChatStore.getState().handleReactionEvent(data);
    });

    // User status events
    this.socket.on(
      "user_online",
      (data: { userId: string; username: string }) => {
        const store = useChatStore.getState();
        const exists = store.users.some((u) => u.id === data.userId);
        if (!exists) {
          store.addUser({
            id: data.userId,
            username: data.username,
            email: "",
            status: "online",
            lastSeen: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          } as any);
        }
        store.handleUserStatusChange(data.userId, "online");
      }
    );

    this.socket.on(
      "user_offline",
      (data: { userId: string; username: string }) => {
        const store = useChatStore.getState();
        store.handleUserStatusChange(data.userId, "offline");
      }
    );

    // Chat events
    this.socket.on("joined_chat", (data: { chatId: string }) => {
      console.log("Joined chat:", data.chatId);
    });

    // Error events
    this.socket.on("error", (data: { message: string }) => {
      console.error("WebSocket error:", data.message);
      // You might want to show a toast notification here
    });
  }

  // Send message
  sendMessage(data: {
    chatId: string;
    content: string;
    type?: string;
    replyToId?: string;
    language?: string;
    filename?: string;
  }): void {
    if (!this.socket) {
      console.error("WebSocket not connected");
      return;
    }

    this.socket.emit("send_message", data);
  }

  // Join chat room
  joinChat(chatId: string): void {
    if (!this.socket) {
      console.error("WebSocket not connected");
      return;
    }

    this.socket.emit("join_chat", { chatId });
  }

  // Leave chat room
  leaveChat(chatId: string): void {
    if (!this.socket) {
      console.error("WebSocket not connected");
      return;
    }

    this.socket.emit("leave_chat", { chatId });
  }

  // Typing indicator
  setTyping(chatId: string, isTyping: boolean): void {
    if (!this.socket) {
      console.error("WebSocket not connected");
      return;
    }

    this.socket.emit("typing", { chatId, isTyping });
  }

  // React to message
  reactToMessage(messageId: string, reaction: string): void {
    if (!this.socket) {
      console.error("WebSocket not connected");
      return;
    }

    this.socket.emit("react_to_message", { messageId, reaction });
  }

  // Get connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get socket instance (for advanced usage)
  getSocket(): Socket | null {
    return this.socket;
  }
}

export const wsService = new WebSocketService();
