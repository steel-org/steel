import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User, Chat, Message, TypingEvent, MessageEvent, ReactionEvent, Notification } from '@/types';

interface ChatState {
  // Current user
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  
  // Users
  users: User[];
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  removeUser: (userId: string) => void;
  
  // Chats
  chats: Chat[];
  selectedChat: Chat | null;
  setChats: (chats: Chat[]) => void;
  addChat: (chat: Chat) => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
  removeChat: (chatId: string) => void;
  setSelectedChat: (chat: Chat | null) => void;
  createGroupChat: (name: string, userIds: string[]) => Chat | undefined;
  
  // Messages
  messages: Record<string, Message[]>;
  addMessage: (chatId: string, message: Message) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<Message>) => void;
  removeMessage: (chatId: string, messageId: string) => void;
  setMessages: (chatId: string, messages: Message[]) => void;
  
  // Typing indicators
  typingUsers: Record<string, Set<string>>;
  addTypingUser: (chatId: string, username: string) => void;
  removeTypingUser: (chatId: string, username: string) => void;
  
  // UI state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Notifications
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Actions
  handleMessageReceived: (event: MessageEvent) => void;
  handleTypingEvent: (event: TypingEvent) => void;
  handleReactionEvent: (event: ReactionEvent) => void;
  handleUserStatusChange: (userId: string, status: string) => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      (set, get) => ({
        // Current user
        currentUser: null,
        setCurrentUser: (user) => set({ currentUser: user }),
        
        // Users
        users: [],
        setUsers: (users) => set({ users }),
        addUser: (user) => set((state) => ({
          users: [...state.users.filter(u => u.id !== user.id), user]
        })),
        updateUser: (userId, updates) => set((state) => {
          // Ensure lastSeen is a string
          const safeUpdates = { ...updates };
          if ('lastSeen' in safeUpdates && safeUpdates.lastSeen) {
            safeUpdates.lastSeen = new Date(safeUpdates.lastSeen).toISOString();
          }
          
          return {
            users: state.users.map(user => 
              user.id === userId ? { ...user, ...safeUpdates } : user
            )
          };
        }),
        removeUser: (userId) => set((state) => ({
          users: state.users.filter(user => user.id !== userId)
        })),
        
        // Chats
        chats: [],
        selectedChat: null,
        setChats: (chats) => {
          console.log('Setting chats:', chats.map(c => ({ id: c.id, name: c.name || 'Direct Message' })));
          return { chats };
        },
        addChat: (chat) => set((state) => {
          console.log('Adding chat:', { 
            id: chat.id, 
            name: chat.name || 'Direct Message',
            members: chat.members?.map(m => m.user?.username || 'Unknown User')
          });
          
          const existingChats = state.chats.filter(c => c.id !== chat.id);
          return { chats: [...existingChats, chat] };
        }),
        updateChat: (chatId, updates) => set((state) => ({
          chats: state.chats.map(chat => 
            chat.id === chatId ? { ...chat, ...updates } : chat
          ),
          selectedChat: state.selectedChat?.id === chatId 
            ? { ...state.selectedChat, ...updates }
            : state.selectedChat
        })),
        removeChat: (chatId) => set((state) => ({
          chats: state.chats.filter(chat => chat.id !== chatId),
          selectedChat: state.selectedChat?.id === chatId ? null : state.selectedChat
        })),
        setSelectedChat: (chat) => set({ selectedChat: chat }),
        createGroupChat: (name, userIds) => {
          const state = get();
          if (!state.currentUser) return;
          
          const chatId = `group_${Date.now()}`;
          const allUserIds = [...new Set([state.currentUser.id, ...userIds])];
          
          const chat: Chat = {
            id: chatId,
            name,
            type: 'GROUP',
            members: allUserIds.map(userId => {
              const user = state.users.find(u => u.id === userId) || state.currentUser!;
              return {
                id: `${chatId}_${userId}`,
                role: userId === state.currentUser?.id ? 'OWNER' : 'MEMBER',
                joinedAt: new Date().toISOString(),
                user
              };
            }),
            participants: allUserIds,
            owner: state.currentUser,
            isGroup: true,
            lastMessage: undefined,
            unreadCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          // Add to chats list
          set(state => ({
            chats: [...state.chats, chat]
          }));
          
          return chat;
        },
        
        // Messages
        messages: {},
        addMessage: (chatId, message) => set((state) => {
          console.log('Adding message to store:', {
            chatId,
            messageId: message.id,
            content: message.content?.substring(0, 50) + '...',
            sender: message.sender?.username
          });
          
          const chatMessages = state.messages[chatId] || [];
          const updatedMessages = {
            ...state.messages,
            [chatId]: [...chatMessages, message]
          };
          
          console.log('Updated messages for chat:', {
            chatId,
            messageCount: updatedMessages[chatId]?.length || 0
          });
          
          return { messages: updatedMessages };
        }),
        updateMessage: (chatId, messageId, updates) => set((state) => ({
          messages: {
            ...state.messages,
            [chatId]: (state.messages[chatId] || []).map(message =>
              message.id === messageId ? { ...message, ...updates } : message
            )
          }
        })),
        removeMessage: (chatId, messageId) => set((state) => ({
          messages: {
            ...state.messages,
            [chatId]: (state.messages[chatId] || []).filter(
              message => message.id !== messageId
            )
          }
        })),
        setMessages: (chatId, messages) => set((state) => ({
          messages: {
            ...state.messages,
            [chatId]: messages
          }
        })),
        
        // Typing indicators
        typingUsers: {},
        addTypingUser: (chatId, username) => set((state) => ({
          typingUsers: {
            ...state.typingUsers,
            [chatId]: new Set([...(state.typingUsers[chatId] || []), username])
          }
        })),
        removeTypingUser: (chatId, username) => set((state) => {
          const chatTypingUsers = state.typingUsers[chatId] || new Set();
          chatTypingUsers.delete(username);
          return {
            typingUsers: {
              ...state.typingUsers,
              [chatId]: chatTypingUsers
            }
          };
        }),
        
        // UI state
        isLoading: false,
        setIsLoading: (loading) => set({ isLoading: loading }),
        
        // Search
        searchQuery: '',
        setSearchQuery: (query) => set({ searchQuery: query }),
        
        // Notifications
        notifications: [],
        addNotification: (notification) => set((state) => ({
          notifications: [...state.notifications, notification]
        })),
        removeNotification: (id) => set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        })),
        clearNotifications: () => set({ notifications: [] }),
        
        // Event handlers
        handleMessageReceived: (event) => {
          console.log('Handling received message:', {
            eventType: 'message_received',
            messageId: event.message?.id,
            chatId: event.message?.chatId
          });
          
          const { message } = event;
          const chatId = message.chatId || 'unknown';
          
          // Add message to store
          get().addMessage(chatId, message);
          
          // Update last message in chat
          get().updateChat(chatId, {
            lastMessage: message.content,
            updatedAt: new Date().toISOString()
          });
          
          // Add notification if chat is not selected
          if (get().selectedChat?.id !== chatId) {
            console.log('Creating notification for new message in unselected chat');
            get().addNotification({
              id: `msg-${message.id}`,
              title: message.sender?.username || 'New message',
              body: message.content?.substring(0, 100) || '',
              icon: message.sender?.avatar,
              timestamp: Date.now()
            });
          } else {
            console.log('Message received in current chat, no notification needed');
          }
        },
        
        handleTypingEvent: (event) => {
          const { username, isTyping } = event;
          const chatId = event.chatId || 'unknown';
          
          if (isTyping) {
            get().addTypingUser(chatId, username);
          } else {
            get().removeTypingUser(chatId, username);
          }
        },
        
        handleReactionEvent: (event) => {
          const { messageId, reaction, userId, username } = event;
          const chatId = event.chatId || 'unknown';
          
          // Find the message and add reaction
          const messages = get().messages[chatId] || [];
          const messageIndex = messages.findIndex(m => m.id === messageId);
          
          if (messageIndex !== -1) {
            const message = messages[messageIndex];
            const newReaction = {
              id: `reaction-${Date.now()}`,
              reaction,
              createdAt: new Date().toISOString(),
              user: { id: userId, username } as User
            };
            
            get().updateMessage(chatId, messageId, {
              reactions: [...message.reactions, newReaction]
            });
          }
        },
        
        handleUserStatusChange: (userId, status) => {
          get().updateUser(userId, { status: status as any });
        }
      }),
      {
        name: 'steel-chat-store',
        partialize: (state) => ({
          currentUser: state.currentUser,
          users: state.users,
          chats: state.chats,
          messages: state.messages
        })
      }
    )
  )
); 