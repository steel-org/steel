import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import {
  User,
  Chat,
  Message,
  TypingEvent,
  MessageEvent,
  ReactionEvent,
  Notification,
} from "@/types";
import { wsService } from "@/services/websocket";
import { apiService } from "@/services/api";

interface ChatState {
  // Current user
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  logout: () => void;

  // Message actions
  deleteMessage: (
    messageId: string,
    deleteForEveryone: boolean
  ) => Promise<boolean>;
  editMessage: (
    chatId: string,
    messageId: string,
    newContent: string
  ) => Promise<boolean>;

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

  // Messages
  messages: Record<string, Message[]>;
  addMessage: (chatId: string, message: Message) => void;
  updateMessage: (
    chatId: string,
    messageId: string,
    updates: Partial<Message>
  ) => void;
  updateMessageStatus: (messageId: string, status: Message["status"]) => void;
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

  // Unread counts
  unreadCounts: Record<string, number>;
  incrementUnread: (chatId: string) => void;
  resetUnread: (chatId: string) => void;

  // Actions
  handleMessageReceived: (event: MessageEvent) => void;
  handleTypingEvent: (event: TypingEvent) => void;
  handleReactionEvent: (event: ReactionEvent) => void;
  handleUserStatusChange: (
    userId: string,
    status: "online" | "offline" | "away" | "busy"
  ) => void;
  handleMessageDeleted: (data: {
    messageId: string;
    chatId: string;
    deletedForEveryone: boolean;
  }) => void;
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
        addUser: (user) =>
          set((state) => ({
            users: [...state.users.filter((u) => u.id !== user.id), user],
          })),
        updateUser: (userId: string, updates: Partial<User>) =>
          set((state) => {
            const updatedUsers = state.users.map((user) =>
              user.id === userId
                ? {
                    ...user,
                    ...updates,
                    lastSeen:
                      updates.lastSeen ||
                      user.lastSeen ||
                      new Date().toISOString(),
                  }
                : user
            );

            if (state.currentUser?.id === userId) {
              const currentUser = updatedUsers.find((u) => u.id === userId);
              if (currentUser) {
                return { ...state, users: updatedUsers, currentUser };
              }
            }

            return { ...state, users: updatedUsers };
          }),
        removeUser: (userId) =>
          set((state) => ({
            users: state.users.filter((user) => user.id !== userId),
          })),

        // Chats
        chats: [],
        selectedChat: null,
        setChats: (chats) =>
          set((state) => {
            const list = Array.isArray(chats) ? [...chats] : [];
            const getTs = (c: any) =>
              new Date(
                c.updatedAt || c.lastMessageAt || c.createdAt || 0
              ).getTime();
            list.sort((a, b) => getTs(b) - getTs(a));

            const stillSelected =
              (state.selectedChat &&
                list.find((c) => c.id === state.selectedChat!.id)) ||
              null;
            return { chats: list, selectedChat: stillSelected } as any;
          }),

        editMessage: async (
          chatId: string,
          messageId: string,
          newContent: string
        ) => {
          const { messages, updateMessage } = get();
          const currentList = messages[chatId] || [];
          const prev = [...currentList];
          const optimisticAt = new Date().toISOString();
          try {
            updateMessage(chatId, messageId, {
              content: newContent,
              editedAt: optimisticAt,
            } as Partial<Message>);
            await apiService.editMessage(messageId, newContent);
            return true;
          } catch (err) {
            console.error("Failed to edit message:", err);
            set((state) => {
              const rolled = { ...state.messages, [chatId]: prev };
              try {
                if (typeof window !== "undefined") {
                  window.localStorage.setItem(
                    `biuld_messages_${chatId}`,
                    JSON.stringify(prev)
                  );
                }
              } catch (e) {
                console.warn("Failed to persist rollback to localStorage", e);
              }
              return { messages: rolled };
            });
            return false;
          }
        },
        addChat: (chat) =>
          set((state) => {
            let next = state.chats.filter((c) => c.id !== chat.id);
            if (chat.type === "DIRECT" && Array.isArray(chat.members)) {
              const idsNew = chat.members
                .map((m: any) => m.user?.id || m.userId)
                .filter(Boolean)
                .sort();
              const keyNew = idsNew.join("-");
              next = next.filter((c) => {
                if (c.type !== "DIRECT") return true;
                const ids = (c.members || [])
                  .map((m: any) => m.user?.id || m.userId)
                  .filter(Boolean)
                  .sort();
                return ids.join("-") !== keyNew;
              });
            }
            return { chats: [...next, chat] };
          }),
        updateChat: (chatId, updates) =>
          set((state) => ({
            chats: state.chats.map((chat) =>
              chat.id === chatId ? { ...chat, ...updates } : chat
            ),
            selectedChat:
              state.selectedChat?.id === chatId
                ? { ...state.selectedChat, ...updates }
                : state.selectedChat,
          })),
        removeChat: (chatId) =>
          set((state) => ({
            chats: state.chats.filter((chat) => chat.id !== chatId),
            selectedChat:
              state.selectedChat?.id === chatId ? null : state.selectedChat,
          })),
        setSelectedChat: (chat) =>
          set((state) => ({
            selectedChat: chat,
            unreadCounts: chat
              ? { ...state.unreadCounts, [chat.id]: 0 }
              : state.unreadCounts,
          })),

        // Messages
        messages: {},
        addMessage: (chatId, message) =>
          set((state) => {
            const chatMessages = state.messages[chatId] || [];

            if (chatMessages.some((m) => m.id === message.id)) {
              return { messages: state.messages };
            }

            const isTemp = (id: string | undefined) =>
              !!id && id.startsWith("temp-");
            const sameContent = (a?: string, b?: string) =>
              (a || "").trim() === (b || "").trim();
            const sameType = (a?: any, b?: any) =>
              String(a || "").toUpperCase() === String(b || "").toUpperCase();
            const sameSender = (a?: { id: string }, b?: { id: string }) =>
              !!a?.id && !!b?.id && a.id === b.id;

            let replaced = false;
            const nextChatMessages = chatMessages.map((m) => {
              if (
                isTemp(m.id) &&
                sameSender(m.sender as any, message.sender as any) &&
                sameContent(m.content, message.content) &&
                sameType(m.type as any, message.type as any)
              ) {
                replaced = true;
                return message;
              }
              return m;
            });

            const finalMessages = replaced
              ? nextChatMessages
              : [...chatMessages, message];

            const updatedMessages = {
              ...state.messages,
              [chatId]: finalMessages,
            };

            const nowIso = new Date().toISOString();
            const updatedChats = state.chats.map((c) =>
              c.id === chatId
                ? ({
                    ...c,
                    lastMessage: message.content || (c as any).lastMessage,
                    updatedAt: nowIso,
                    lastMessageAt: nowIso as any,
                  } as any)
                : c
            );

            try {
              if (typeof window !== "undefined") {
                window.localStorage.setItem(
                  `biuld_messages_${chatId}`,
                  JSON.stringify(updatedMessages[chatId])
                );
              }
            } catch (e) {
              console.warn("Failed to persist messages to localStorage", e);
            }

            return { messages: updatedMessages, chats: updatedChats };
          }),
        updateMessage: (chatId, messageId, updates) =>
          set((state) => {
            const nextList = (state.messages[chatId] || []).map((message) =>
              message.id === messageId ? { ...message, ...updates } : message
            );
            try {
              if (typeof window !== "undefined") {
                window.localStorage.setItem(
                  `biuld_messages_${chatId}`,
                  JSON.stringify(nextList)
                );
              }
            } catch (e) {
              console.warn(
                "Failed to persist updated messages to localStorage",
                e
              );
            }
            return {
              messages: {
                ...state.messages,
                [chatId]: nextList,
              },
            };
          }),
        updateMessageStatus: (messageId, status) =>
          set((state) => {
            const updated: Record<string, Message[]> = {} as any;
            let changed = false;
            for (const [cid, list] of Object.entries(state.messages)) {
              const next = list.map((m) =>
                m.id === messageId ? { ...m, status } : m
              );
              if (!changed && next.some((m, i) => m !== list[i]))
                changed = true;
              updated[cid] = next;
            }
            if (!changed) return { messages: state.messages } as any;
            try {
              if (typeof window !== "undefined") {
                for (const [cid, list] of Object.entries(updated)) {
                  window.localStorage.setItem(
                    `biuld_messages_${cid}`,
                    JSON.stringify(list)
                  );
                }
              }
            } catch (e) {
              console.warn(
                "Failed to persist status updates to localStorage",
                e
              );
            }
            return { messages: updated } as any;
          }),
        removeMessage: (chatId, messageId) =>
          set((state) => {
            const next = (state.messages[chatId] || []).filter(
              (m) => m.id !== messageId
            );
            const updated = { ...state.messages, [chatId]: next };
            try {
              if (typeof window !== "undefined") {
                window.localStorage.setItem(
                  `biuld_messages_${chatId}`,
                  JSON.stringify(next)
                );
              }
            } catch (e) {
              console.warn("Failed to persist messages to localStorage", e);
            }
            return { messages: updated };
          }),
        setMessages: (chatId, messages) =>
          set((state) => {
            const updated = { ...state.messages, [chatId]: messages };
            try {
              if (typeof window !== "undefined") {
                window.localStorage.setItem(
                  `biuld_messages_${chatId}`,
                  JSON.stringify(messages)
                );
              }
            } catch (e) {
              console.warn("Failed to persist messages to localStorage", e);
            }
            return { messages: updated };
          }),

        // Typing indicators
        typingUsers: {},
        addTypingUser: (chatId, username) =>
          set((state) => ({
            typingUsers: {
              ...state.typingUsers,
              [chatId]: new Set([
                ...(state.typingUsers[chatId] || []),
                username,
              ]),
            },
          })),
        removeTypingUser: (chatId, username) =>
          set((state) => {
            const chatTypingUsers = state.typingUsers[chatId] || new Set();
            chatTypingUsers.delete(username);
            return {
              typingUsers: {
                ...state.typingUsers,
                [chatId]: chatTypingUsers,
              },
            };
          }),

        // UI state
        isLoading: false,
        setIsLoading: (loading) => set({ isLoading: loading }),

        // Search
        searchQuery: "",
        setSearchQuery: (query) => set({ searchQuery: query }),

        // Notifications
        notifications: [],
        addNotification: (notification) =>
          set((state) => ({
            notifications: [...state.notifications, notification],
          })),
        removeNotification: (id) =>
          set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          })),
        clearNotifications: () => set({ notifications: [] }),

        // Unread counts
        unreadCounts: {},
        incrementUnread: (chatId: string) =>
          set((state) => ({
            unreadCounts: {
              ...state.unreadCounts,
              [chatId]: (state.unreadCounts[chatId] || 0) + 1,
            },
          })),
        resetUnread: (chatId: string) =>
          set((state) => ({
            unreadCounts: { ...state.unreadCounts, [chatId]: 0 },
          })),

        // Event handlers
        handleMessageReceived: (event) => {

          const { message } = event;
          const chatId = message.chatId || "unknown";

          // Add message to store
          get().addMessage(chatId, message);

          // Update last message in chat
          get().updateChat(chatId, {
            lastMessage: message.content,
            updatedAt: new Date().toISOString(),
          });

          const me = get().currentUser;
          const isFromMe =
            message.sender?.id && me?.id && message.sender.id === me.id;
          if (get().selectedChat?.id !== chatId && !isFromMe) {
            get().addNotification({
              id: `msg-${message.id}`,
              title: message.sender?.username || "New message",
              body: message.content?.substring(0, 100) || "",
              icon: message.sender?.avatar,
              timestamp: Date.now(),
            });
            get().incrementUnread(chatId);
          } else {
          }
        },

        handleTypingEvent: (event) => {
          const { username, isTyping } = event;
          const chatId = event.chatId || "unknown";

          if (isTyping) {
            get().addTypingUser(chatId, username);
          } else {
            get().removeTypingUser(chatId, username);
          }
        },

        handleReactionEvent: (event) => {
          const { messageId, reaction, userId, username, toggledOff } =
            event as any;
          const chatId = (event as any).chatId || "unknown";

          const messages = get().messages[chatId] || [];
          const idx = messages.findIndex((m) => m.id === messageId);
          if (idx === -1) return;

          const msg = messages[idx];
          const list = Array.isArray(msg.reactions) ? [...msg.reactions] : [];

          if (toggledOff) {
            const next = list.filter(
              (r: any) => !(r.user?.id === userId && r.reaction === reaction)
            );
            get().updateMessage(chatId, messageId, { reactions: next } as any);
            return;
          }

          // Add or replace user's reaction of same type
          const withoutSame = list.filter(
            (r: any) => !(r.user?.id === userId && r.reaction === reaction)
          );
          const newReaction = {
            id: `reaction-${Date.now()}`,
            reaction,
            createdAt: new Date().toISOString(),
            user: { id: userId, username } as User,
          } as any;
          get().updateMessage(chatId, messageId, {
            reactions: [...withoutSame, newReaction],
          } as any);
        },

        handleUserStatusChange: (
          userId,
          status: "online" | "offline" | "away" | "busy"
        ) => {
          get().updateUser(userId, { status });
        },

        handleMessageDeleted: ({ messageId, chatId, deletedForEveryone }) => {
          const { messages, setMessages, selectedChat } = get();

          if (
            deletedForEveryone ||
            (selectedChat && selectedChat.id === chatId)
          ) {
            const chatMessages = messages[chatId] || [];
            const updatedMessages = chatMessages.filter(
              (msg) => msg.id !== messageId
            );
            setMessages(chatId, updatedMessages);
          }
        },

        deleteMessage: async (
          messageId: string,
          deleteForEveryone: boolean
        ) => {
          const { selectedChat, messages, setMessages } = get();
          const socket = wsService.getSocket();

          if (!selectedChat || !socket) return false;

          try {
            // Optimistically remove from UI
            const chatMessages = messages[selectedChat.id] || [];
            const updatedMessages = chatMessages.filter(
              (msg) => msg.id !== messageId
            );
            setMessages(selectedChat.id, updatedMessages);

            // Notify server
            socket.emit("delete_message", {
              messageId,
              chatId: selectedChat.id,
              deleteForEveryone,
            });

            return true;
          } catch (error) {
            console.error("Failed to delete message:", error);
            const chatMessages = messages[selectedChat.id] || [];
            setMessages(selectedChat.id, [...chatMessages]);
            return false;
          }
        },

        // Logout function that handles cleanup even when the user is no longer in the database
        logout: () => {
          set({
            currentUser: null,
            users: [],
            chats: [],
            selectedChat: null,
            messages: {},
            typingUsers: {},
            searchQuery: "",
            isLoading: false,
            notifications: [],
            unreadCounts: {},
          });

          // Clear any stored tokens
          localStorage.removeItem("biuld_token");
          document.cookie =
            "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";

          // Force a page reload to ensure all components reset
          if (typeof window !== "undefined") {
            window.location.href = "/";
          }
        },
      }),
      {
        name: "biuld-chat-store",
        partialize: (state) => ({
          currentUser: state.currentUser,
          users: state.users,
          chats: state.chats,
          messages: state.messages,
          unreadCounts: state.unreadCounts,
        }),
      }
    )
  )
);
