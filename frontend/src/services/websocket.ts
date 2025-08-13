import { io, Socket } from 'socket.io-client';
import { apiService } from './api';
import { useChatStore } from '@/stores/chatStore';
import { MessageEvent, TypingEvent, ReactionEvent } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventCallbacks: { [key: string]: Function[] } = {};

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = apiService.getToken();
      
      if (!token) {
        reject(new Error('No authentication token'));
        return;
      }

      this.socket = io(WS_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('Connected to WebSocket server');
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from WebSocket server:', reason);
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          this.socket?.connect();
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Failed to connect to WebSocket server'));
        }
      });

      this.socket.on('error', (error) => {
        console.error('WebSocket error:', error);
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

    // Message events
    this.socket.on('message_received', (data: MessageEvent) => {
      this.emit('messageReceived', data);
      useChatStore.getState().handleMessageReceived?.(data);
    });

    this.socket.on('new_message', (data: any) => {
      this.emit('newMessage', data);
    });

    this.socket.on('message_status', (data: { messageId: string; status: string }) => {
      this.emit('messageStatusUpdate', data);
    });

    this.socket.on('message_deleted', (data: { messageId: string }) => {
      this.emit('messageDeleted', data);
    });

    // Typing events
    this.socket.on('user_typing', (data: TypingEvent) => {
      this.emit('userTyping', data);
      useChatStore.getState().handleTypingEvent?.(data);
    });

    // Reaction events
    this.socket.on('message_reaction', (data: ReactionEvent) => {
      this.emit('messageReaction', data);
      useChatStore.getState().handleReactionEvent?.(data);
    });

    // User status events
    this.socket.on('user_online', (data: { userId: string; username: string }) => {
      this.emit('userJoined', data);
      useChatStore.getState().handleUserStatusChange?.(data.userId, 'online');
    });

    this.socket.on('user_offline', (data: { userId: string; username: string }) => {
      this.emit('userLeft', data);
      useChatStore.getState().handleUserStatusChange?.(data.userId, 'offline');
    });

    this.socket.on('users', (data: any[]) => {
      this.emit('users', data);
    });

    // Chat events
    this.socket.on('joined_chat', (data: { chatId: string }) => {
      console.log('Joined chat:', data.chatId);
    });

    // Error events
    this.socket.on('error', (data: { message: string }) => {
      console.error('WebSocket error:', data.message);
      this.emit('error', data);
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
      console.error('WebSocket not connected');
      return;
    }

    this.socket.emit('send_message', data);
  }

  // Join chat room
  joinChat(chatId: string): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }

    this.socket.emit('join_chat', { chatId });
  }

  // Leave chat room
  leaveChat(chatId: string): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }

    this.socket.emit('leave_chat', { chatId });
  }

  // Typing indicator
  setTyping(chatId: string, isTyping: boolean): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }

    this.socket.emit('typing', { chatId, isTyping });
  }

  // React to message
  reactToMessage(messageId: string, reaction: string): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }

    this.socket.emit('react_to_message', { messageId, reaction });
  }

  // Delete message
  deleteMessage(chatId: string, messageId: string): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }

    this.socket.emit('delete_message', { chatId, messageId });
  }

  // Get connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get socket instance (for advanced usage)
  getSocket(): Socket | null {
    return this.socket;
  }

  // Event emitter methods for external components
  on(event: string, callback: Function): void {
    if (!this.eventCallbacks[event]) {
      this.eventCallbacks[event] = [];
    }
    this.eventCallbacks[event].push(callback);
  }

  off(event: string, callback?: Function): void {
    if (!this.eventCallbacks[event]) return;
    
    if (callback) {
      this.eventCallbacks[event] = this.eventCallbacks[event].filter(cb => cb !== callback);
    } else {
      this.eventCallbacks[event] = [];
    }
  }

  private emit(event: string, data?: any): void {
    if (this.eventCallbacks[event]) {
      this.eventCallbacks[event].forEach(callback => callback(data));
    }
  }
}

export const wsService = new WebSocketService(); 