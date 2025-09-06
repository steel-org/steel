import { io, Socket } from 'socket.io-client';
import { apiService } from './api';
import { useChatStore } from '@/stores/chatStore';
import { User, Chat, MessageEvent, TypingEvent, ReactionEvent } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventCallbacks: { [key: string]: Function[] } = {};

  async connect(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const token = apiService.getToken();
      
      if (!token) {
        reject(new Error('No authentication token'));
        return;
      }
      
      let user;
      try {
        user = await apiService.getCurrentUser();
        
        if (!user) {
          reject(new Error('No user data available'));
          return;
        }
      } catch (error) {
        console.error('Error getting current user:', error);
        reject(new Error('Failed to get user data'));
        return;
      }

      this.socket = io(WS_URL, {
        auth: { 
          token,
          userId: user.id
        },
        query: {
          userId: user.id,
          username: user.username
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
      });

    // Message edited events
    this.socket.on('message_edited', (data: { message: any }) => {
      try {
        const updated = data?.message;
        if (updated?.id && updated?.chatId) {
          useChatStore.getState().updateMessage(updated.chatId, updated.id, {
            content: updated.content,
            editedAt: updated.editedAt,
          });
          // Re-emit for any UI listeners
          this.emit('messageEdited', updated);
        }
      } catch (err) {
        console.error('Failed to handle message_edited event', err);
      }
    });

      this.socket.on('connect', () => {

        this.reconnectAttempts = 0;
        
        this.socket?.emit('join', {
          userId: user.id,
          username: user.username,
          avatar: user.avatar
        });
        
        return resolve();
      });

      this.socket.on('disconnect', (reason) => {

        if (reason === 'io server disconnect') {
          this.socket?.connect();
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          return reject(new Error('Failed to connect to WebSocket server'));
        }
      });

      this.socket.on('error', (error) => {
        console.error('WebSocket error:', error);
        return reject(error);
      });

      this.setupEventHandlers();
    });
  }

  disconnect(): void {
    if (!this.socket) {
      return;
    }

    try {
      if (this.socket.connected) {
        this.socket.emit('user_disconnect');
      }

      this.socket.io?.reconnection(false);
      this.socket.removeAllListeners();
      this.socket.disconnect();
      
      if (this.socket.io && (this.socket.io as any).reconnectionTimer) {
        clearTimeout((this.socket.io as any).reconnectionTimer);
      }
      
      this.socket = null;
      
      this.reconnectAttempts = 0;
      
      this.eventCallbacks = {};
      

    } catch (error) {
      console.error('Error during WebSocket disconnection:', error);
      if (this.socket) {
        this.socket = null;
      }
      this.eventCallbacks = {};
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('users', (users: any[]) => {
      try {
        const validUsers = users.map(user => ({
          id: user.id,
          username: user.username || `user-${user.id}`,
          email: user.email || `${user.id}@example.com`,
          displayName: user.displayName || user.username || `User ${user.id}`,
          avatar: user.avatar || `https://ui-avatars.com/api/?name=${user.username || user.id}&size=128`,
          status: (user.status || 'offline') as 'online' | 'offline' | 'away' | 'busy',
          lastSeen: user.lastSeen || new Date().toISOString(),
          createdAt: user.createdAt || new Date().toISOString(),
          bio: user.bio || '',
          location: user.location || '',
          website: user.website || '',
          roles: Array.isArray(user.roles) ? user.roles : []
        }));
        this.emit('users', validUsers);
      } catch (error) {
        console.error('Error processing users list:', error);
      }
    });

    this.socket.on('userStatusChange', (data: { userId: string; status: string; lastSeen: string }) => {
      try {
        const { userId, status, lastSeen } = data;
        useChatStore.getState().updateUser(userId, { 
          status: status as 'online' | 'offline' | 'away' | 'busy',
          lastSeen: new Date(lastSeen).toISOString()
        });
      } catch (error) {
        console.error('Error processing user status change:', error);
      }
    });

    this.socket.on('userJoined', (userData: any) => {
      try {
        const validUser: User = {
          id: userData.id,
          username: userData.username || `user-${userData.id}`,
          email: userData.email || `${userData.id}@example.com`,
          displayName: userData.displayName || userData.username || `User ${userData.id}`,
          avatar: userData.avatar || `https://ui-avatars.com/api/?name=${userData.username || userData.id}&size=128`,
          status: 'online',
          lastSeen: new Date().toISOString(),
          createdAt: userData.createdAt || new Date().toISOString(),
          bio: userData.bio || '',
          location: userData.location || '',
          website: userData.website || '',
          roles: Array.isArray(userData.roles) ? userData.roles : []
        };
        this.emit('userJoined', validUser);
        useChatStore.getState().addUser(validUser);
      } catch (error) {
        console.error('Error processing user joined:', error);
      }
    });

    this.socket.on('userLeft', (userData: any) => {
      try {
        const validUser: User = {
          id: userData.id,
          username: userData.username || `user-${userData.id}`,
          email: userData.email || `${userData.id}@example.com`,
          displayName: userData.displayName || userData.username || `User ${userData.id}`,
          avatar: userData.avatar || `https://ui-avatars.com/api/?name=${userData.username || userData.id}&size=128`,
          status: 'offline',
          lastSeen: new Date().toISOString(),
          createdAt: userData.createdAt || new Date().toISOString(),
          bio: userData.bio || '',
          location: userData.location || '',
          website: userData.website || '',
          roles: Array.isArray(userData.roles) ? userData.roles : []
        };
        this.emit('userLeft', validUser);
        useChatStore.getState().updateUser(validUser.id, { 
          status: 'offline',
          lastSeen: validUser.lastSeen 
        });
      } catch (error) {
        console.error('Error processing user left:', error);
      }
    });

    // Message events (single unified event)
    this.socket.on('message_received', (data: MessageEvent) => {
      this.emit('messageReceived', data);
      useChatStore.getState().handleMessageReceived?.(data);

      // Try showing a browser notification if user allowed it and tab isn't focused
      try {
        const canNotify = typeof window !== 'undefined' && 'Notification' in window;
        const me = useChatStore.getState().currentUser;
        const isFromMe = !!(data.message?.sender?.id && me?.id && data.message.sender.id === me.id);
        if (
          canNotify &&
          Notification.permission === 'granted' &&
          typeof document !== 'undefined' &&
          !document.hasFocus() &&
          !isFromMe
        ) {
          const title = data.message?.sender?.username || 'New message';
          const body = (data.message?.content || '').slice(0, 120) || 'New message received';
          const icon = '/favicon.ico';
          const chatId = data.message?.chatId;
          const n = new Notification(title, { body, icon });
          // Focus and deep-link to the chat on click
          n.onclick = () => {
            try { window.focus(); } catch {}
            try {
              if (chatId) {
                const url = new URL(window.location.href);
                url.searchParams.set('chatId', chatId);
                // Prefer SPA navigation if available
                if ((window as any).next && (window as any).next.router) {
                  try {
                    (window as any).next.router.push({ pathname: url.pathname, query: Object.fromEntries(url.searchParams.entries()) });
                  } catch {
                    window.history.pushState({}, '', url.toString());
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                } else {
                  window.history.pushState({}, '', url.toString());
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }
            } catch {}
            n.close();
          };
        }
      } catch (e) {
        console.warn('Failed to show notification', e);
      }
    });

    this.socket.on('message_status', (data: { messageId: string; status: string }) => {
      try {
        const status = (data.status || '').toUpperCase();
        if (status === 'SENT' || status === 'DELIVERED' || status === 'READ') {
          useChatStore.getState().updateMessageStatus(data.messageId, status as any);
        }
      } catch (err) {
        console.error('Failed processing message_status', err);
      }
      this.emit('messageStatusUpdate', data);
    });

    this.socket.on('message_deleted', (data: { messageId: string; chatId: string; deletedForEveryone?: boolean }) => {
      this.emit('messageDeleted', data);
      try {
        useChatStore.getState().handleMessageDeleted?.({
          messageId: data.messageId,
          chatId: data.chatId,
          deletedForEveryone: !!data.deletedForEveryone
        } as any);
      } catch (err) {
        console.error('Failed to handle message_deleted event in store', err);
      }
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
      try {
        // Update status and lastSeen to now for accurate presence display
        useChatStore.getState().updateUser(data.userId, {
          status: 'offline',
          lastSeen: new Date().toISOString(),
        } as any);
      } catch (e) {
        // Fallback to handler if custom update fails
        useChatStore.getState().handleUserStatusChange?.(data.userId, 'offline');
      }
    });

    // Note: 'users' is already handled above and re-emitted once

    // Chat events
    this.socket.on('joined_chat', (data: { chatId: string }) => {

    });

    // New chat created 
    this.socket.on('chat:created', (chat: Chat) => {
      try {

        const { chats, addChat } = useChatStore.getState();
        const exists = chats.some(c => c.id === chat.id);
        if (!exists) {
          addChat(chat);
        }
      } catch (err) {
        console.error('Failed to handle chat:created event', err);
      }
    });

    // Chat updated
    this.socket.on('chat:updated', (chat: Chat) => {
      try {

        useChatStore.getState().updateChat(chat.id, chat as any);
        this.emit('chatUpdated', chat);
      } catch (err) {
        console.error('Failed to handle chat:updated event', err);
      }
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
    attachments?: Array<{ url: string; originalName: string; mimeType: string; size: number; thumbnail?: string | null }>;
  }): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }

    this.socket.emit('send_message', data, (response: any) => {
      if (response?.error) {
        console.error('Error sending message:', response.error);
        // Emit a client-side event so UI can requeue for retry
        try {
          this.emit('sendError', { error: response.error, payload: data });
        } catch (e) {
          // no-op
        }
      } else {

      }
    });
  }

  // Send message and return a Promise that resolves on server ack success
  sendMessageAck(data: {
    chatId: string;
    content: string;
    type?: string;
    replyToId?: string;
    language?: string;
    filename?: string;
    attachments?: Array<{ url: string; originalName: string; mimeType: string; size: number; thumbnail?: string | null }>;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        return reject(new Error('WebSocket not connected'));
      }
      try {
        this.socket.emit('send_message', data, (response: any) => {
          if (response?.error) {
            try { this.emit('sendError', { error: response.error, payload: data }); } catch {}
            return reject(new Error(response.error || 'Send failed'));
          }
          return resolve();
        });
      } catch (e) {
        return reject(e);
      }
    });
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

  // Mark messages as read in a chat
  markMessagesRead(chatId: string, messageIds: string[]): void {
    if (!this.socket) {
      console.error('WebSocket not connected');
      return;
    }
    try {
      this.socket.emit('mark_read', { chatId, messageIds });
    } catch (e) {
      console.warn('Failed to emit mark_read', e);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

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