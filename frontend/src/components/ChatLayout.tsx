import React, { useEffect, useRef, useState } from "react";
import { useRouter } from 'next/router';
import { useChatStore } from "@/stores/chatStore";
import { apiService } from "@/services/api";
import { wsService } from "@/services/websocket";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";
import AuthModal from "./AuthModal";
import { User, Message, Chat } from "@/types";

export default function ChatLayout() {
  const router = useRouter();
  const {
    currentUser,
    setCurrentUser,
    isLoading,
    setIsLoading,
    selectedChat,
    setSelectedChat,
    chats,
    addChat,
    messages,
    addMessage,
    setMessages,
    users,
    setUsers,
    addUser,
    updateUser,
    typingUsers,
    addTypingUser,
    removeTypingUser,
    deleteMessage: storeDeleteMessage,
  } = useChatStore();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [replyingByChat, setReplyingByChat] = useState<Record<string, Message | null>>({});
  const creatingDMWithRef = useRef<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [mobileShowSidebar, setMobileShowSidebar] = useState(true);
  const suppressUrlSyncRef = useRef(false);
  const authBlockedRef = useRef(false);
  const loadingMessagesForRef = useRef<string | null>(null);

  type OutboxItem = {
    id: string; 
    payload: {
      chatId: string;
      content: string;
      type?: string;
      replyToId?: string;
      language?: string;
      filename?: string;
      attachments?: Array<{ url: string; originalName: string; filename?: string; mimeType: string; size: number; thumbnail?: string | null }>;
    };
    createdAt: number;
  };
  const OUTBOX_KEY = 'biuld_outbox_v1';
  const outboxRef = useRef<OutboxItem[]>([]);
  const loadOutbox = (): OutboxItem[] => {
    try {
      const raw = localStorage.getItem(OUTBOX_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const saveOutbox = (list: OutboxItem[]) => {
    try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(list)); } catch {}
  };
  const enqueueOutbox = (item: OutboxItem) => {
    const next = [...outboxRef.current, item];
    outboxRef.current = next;
    saveOutbox(next);
  };
  const flushOutbox = async () => {
    if (!wsService.isConnected()) return;
    const items = [...outboxRef.current];
    if (!items.length) return;
    for (const it of items) {
      try {
        await wsService.sendMessageAck(it.payload);
      } catch (e) {
        break;
      }
      const remaining = outboxRef.current.filter(x => x.id !== it.id);
      outboxRef.current = remaining;
      saveOutbox(remaining);
      await new Promise(r => setTimeout(r, 50));
    }
  };

  useEffect(() => {
    outboxRef.current = loadOutbox();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOnline = () => {
      flushOutbox();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  const slugify = (s: string) => (s || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-');

  const getChatRoute = (chat: Chat): string => {
    if (chat.type === 'DIRECT') {
      const me = useChatStore.getState().currentUser;
      const other = (chat.members || []).map((m: any) => m.user).find((u: any) => u?.id !== me?.id);
      const username = (other?.username || 'user');
      return `/chat/${encodeURIComponent(username)}`;
    }
    const name = chat.name || 'group';
    return `/group/${encodeURIComponent(slugify(name))}`;
  };

  const routeIfChanged = (to: string) => {
    try {
      if (isMobile && mobileShowSidebar) return;
      if (suppressUrlSyncRef.current) return;
      if (!router?.isReady) return;
      const current = router?.asPath || '';
      if (current !== to) {
        router.replace(to, undefined as any, { shallow: true } as any);
      }
    } catch {}
  };

  useEffect(() => {
    // Check if user is already authenticated
    const token = apiService.getToken();
    if (token && !currentUser) {
      loadCurrentUser();
    } else if (!token) {
      setShowAuthModal(true);
    }
  }, [currentUser]);

  // Track viewport for mobile layout switching
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prevIsMobileRef = { current: null as null | boolean };
    let timer: any = null;
    const onResizeCore = () => {
      const m = window.innerWidth < 768;
      if (prevIsMobileRef.current === null) {
        prevIsMobileRef.current = m;
        setIsMobile(m);
        try {
          const force = sessionStorage.getItem('biuld_sidebar_force_visible');
          if (force === '1') {
            setMobileShowSidebar(true);
            sessionStorage.removeItem('biuld_sidebar_force_visible');
            sessionStorage.setItem('biuld_sidebar_visible', '1');
            return;
          }
          const persisted = sessionStorage.getItem('biuld_sidebar_visible');
          if (persisted != null) {
            setMobileShowSidebar(persisted === '1');
            return;
          }
        } catch {}
        setMobileShowSidebar(m ? !useChatStore.getState().selectedChat : true);
        return;
      }
      if (prevIsMobileRef.current !== m) {
        prevIsMobileRef.current = m;
        setIsMobile(m);
        if (!m) {
          setMobileShowSidebar(true);
        } else {
          setMobileShowSidebar(!useChatStore.getState().selectedChat);
        }
      }
    };
    const onResize = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(onResizeCore, 120);
    };
    onResizeCore();
    window.addEventListener('resize', onResize);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem('biuld_sidebar_visible', mobileShowSidebar ? '1' : '0');
    } catch {}
  }, [mobileShowSidebar]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const chatId = params.get('chatId');
      if (!chatId) return;
      if (!apiService.getToken()) return;
      if (isMobile && mobileShowSidebar) return;
      const match = chats.find((c) => c.id === chatId);
      if (match && (!selectedChat || selectedChat.id !== match.id)) {
        setSelectedChat(match);
        if (!isMobile || !mobileShowSidebar) setMobileShowSidebar(false);
        routeIfChanged(getChatRoute(match));
      }
    } catch (e) {
    }
  }, [chats, selectedChat?.id, isMobile, mobileShowSidebar]);

  useEffect(() => {
    const path = router?.pathname || '';
    const slugParam = router?.query?.slug;
    const slug = typeof slugParam === 'string' ? slugParam : Array.isArray(slugParam) ? slugParam[0] : undefined;
    if (!slug) return;
    if (!apiService.getToken()) return; 
    if (isMobile && mobileShowSidebar) return;

   const pathIsChat = path.startsWith('/chat');
    const pathIsGroup = path.startsWith('/group');
    if (selectedChat) {
      if ((pathIsChat && selectedChat.type !== 'DIRECT') || (pathIsGroup && selectedChat.type !== 'GROUP')) {
        return;
      }
    }

    const tryResolve = (items: Chat[]) => {
      const isChat = pathIsChat;
      const isGroup = pathIsGroup;
      if (!isChat && !isGroup) return undefined;
      if (isChat) {
        const me = useChatStore.getState().currentUser;
        return items.find((c) => {
          if (c.type !== 'DIRECT') return false;
          const other = (c.members || []).map((m: any) => m.user).find((u: any) => u?.id !== me?.id);
          return other && other.username?.toLowerCase() === slug.toLowerCase();
        });
      } else {
        return items.find((c) => {
          if (c.type !== 'GROUP') return false;
          const s = slugify(c.name || 'group');
          return s === slug.toLowerCase();
        });
      }
    };

    let match = tryResolve(chats);
    if (match) {
      if (!selectedChat || selectedChat.id !== match.id) {
        setSelectedChat(match);
        if (!isMobile || !mobileShowSidebar) setMobileShowSidebar(false);
      }
    } else {
      (async () => {
        try {
          const latest = await apiService.getChats();
          useChatStore.getState().setChats(latest);
          const found = tryResolve(latest);
          if (found) {
            setSelectedChat(found);
            if (!isMobile || mobileShowSidebar === false) setMobileShowSidebar(false);
          }
        } catch {}
      })();
    }
  }, [router?.pathname, router?.query?.slug, chats.length, selectedChat?.id, selectedChat?.type, isMobile, mobileShowSidebar]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onMessage = (e: MessageEvent) => {
      const data: any = e?.data;
      if (!data || data.type !== 'OPEN_CHAT' || !data.chatId) return;
      const chatId = String(data.chatId);
      try { sessionStorage.setItem('biuld_pending_chat', chatId); } catch {}
      if (!apiService.getToken() || !currentUser) {
        setShowAuthModal(true);
        return;
      }

      const match = chats.find((c) => c.id === chatId);
      if (match) {
        if (!selectedChat || selectedChat.id !== match.id) {
          setSelectedChat(match);
        }
        routeIfChanged(getChatRoute(match));
        if (!isMobile || mobileShowSidebar === false) setMobileShowSidebar(false);
      } else {
        (async () => {
          try {
            const latest = await apiService.getChats();
            useChatStore.getState().setChats(latest);
            const found = latest.find((c: any) => c.id === chatId);
            if (found) {
              setSelectedChat(found);
              try { sessionStorage.removeItem('biuld_pending_chat'); } catch {}
              routeIfChanged(getChatRoute(found));
              if (!isMobile || mobileShowSidebar === false) setMobileShowSidebar(false);
            }
          } catch {}
        })();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [chats, selectedChat?.id, router, isMobile, mobileShowSidebar]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let pending: string | null = null;
    try { pending = sessionStorage.getItem('biuld_pending_chat'); } catch {}
    if (!pending) return;
    const match = chats.find(c => c.id === pending);
    if (match) {
      if (!selectedChat || selectedChat.id !== match.id) {
        setSelectedChat(match);
      }
      try { sessionStorage.removeItem('biuld_pending_chat'); } catch {}
      routeIfChanged(getChatRoute(match));
      if (!isMobile || !mobileShowSidebar) setMobileShowSidebar(false);
    } else {
      (async () => {
        try {
          const latest = await apiService.getChats();
          useChatStore.getState().setChats(latest);
          const found = latest.find((c: any) => c.id === pending);
          if (found) {
            setSelectedChat(found);
            try { sessionStorage.removeItem('biuld_pending_chat'); } catch {}
            routeIfChanged(getChatRoute(found));
            setMobileShowSidebar(false);
          }
        } catch {}
      })();
    }
  }, [chats.length, selectedChat?.id, router]);

  useEffect(() => {
    const q = router?.query?.chatId as string | string[] | undefined;
    const chatId = typeof q === 'string' ? q : Array.isArray(q) ? q[0] : undefined;
    if (!chatId) return;
   if (isMobile && mobileShowSidebar === true) {
    }
    if (!apiService.getToken() || !currentUser) {
      setShowAuthModal(true);
      try { sessionStorage.setItem('biuld_pending_chat', chatId); } catch {}
      return;
    }
    const match = chats.find(c => c.id === chatId);
    if (match) {
      if (!selectedChat || selectedChat.id !== match.id) {
        setSelectedChat(match);
      }
      routeIfChanged(getChatRoute(match));
      setMobileShowSidebar(false);
      try { sessionStorage.removeItem('biuld_pending_chat'); } catch {}
    } else {
      (async () => {
        try {
          const latest = await apiService.getChats();
          useChatStore.getState().setChats(latest);
          const found = latest.find((c: any) => c.id === chatId);
          if (found) {
            setSelectedChat(found);
            routeIfChanged(getChatRoute(found));
            if (!isMobile || !mobileShowSidebar) setMobileShowSidebar(false);
            try { sessionStorage.removeItem('biuld_pending_chat'); } catch {}
          }
        } catch {}
      })();
    }
  }, [router?.query?.chatId, chats.length, selectedChat?.id, isMobile, mobileShowSidebar]);

  useEffect(() => {
    if (!selectedChat?.id) return;
    if (isMobile && mobileShowSidebar) return;
    if (!apiService.getToken()) return; 
    if (suppressUrlSyncRef.current) return;
    routeIfChanged(getChatRoute(selectedChat));
  }, [selectedChat?.id, isMobile, mobileShowSidebar]);

  useEffect(() => {
    if (currentUser) {
      // Set up WebSocket event listeners
      const cleanup = setupWebSocketListeners();
      const socket = wsService.getSocket();
      if (socket) {
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('users', handleUsers);
        socket.on('userJoined', handleUserJoined);
        socket.on('userLeft', handleUserLeft);
        socket.on('userStatusChange', handleUserStatusChange);
      }
      
      // Clean up event listeners on unmount
      return () => {
        wsService.off("users");
        wsService.off("userJoined");
        wsService.off("userLeft");
        wsService.off('sendError');
        wsService.off("messageReceived");
        wsService.off("newMessage");
        // Add any other event listeners to clean up
        const socket = wsService.getSocket();
        if (socket) {
          socket.off('connect', handleConnect);
          socket.off('disconnect', handleDisconnect);
          socket.off('users', handleUsers);
          socket.off('userJoined', handleUserJoined);
          socket.off('userLeft', handleUserLeft);
          socket.off('userStatusChange', handleUserStatusChange);
        }
      };
    }
  }, [currentUser, selectedChat]);

  // Load messages when a chat is selected or changes
  useEffect(() => {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const loadMessages = async () => {
      if (!selectedChat) return;
      if (!currentUser) return; // avoid unauthorized fetches
      if (authBlockedRef.current) return; // stop loops after 401 until re-auth
      if (isMobile && mobileShowSidebar) return; // don't load while leaving chat
      if (!apiService.getToken()) return; // no token, skip
      if (loadingMessagesForRef.current === selectedChat.id) return; // already loading this chat
      try {
        loadingMessagesForRef.current = selectedChat.id;
        const local = loadMessagesFromStorage(selectedChat.id);
        if (local && local.length) {
          setMessages(selectedChat.id, local);
        } else {
          setMessages(selectedChat.id, []);
        }

        const res = await apiService.getMessages(selectedChat.id, 1, 50);
        const fromServer = res.messages || [];
        if (fromServer.length) {
          const byId = new Map<string, Message>();
          for (const m of local || []) byId.set(m.id, m);
          for (const m of fromServer) byId.set(m.id, m);
          const merged = Array.from(byId.values()).sort((a, b) =>
            new Date(a.createdAt || a.updatedAt || 0).getTime() -
            new Date(b.createdAt || b.updatedAt || 0).getTime()
          );
          setMessages(selectedChat.id, merged);
        }
      } catch (err: any) {
        console.error('Failed to load messages for chat', selectedChat.id, err);
        const msg = String(err?.message || '');
        if (msg.includes('Unauthorized')) {
          try { apiService.clearToken(); } catch {}
          authBlockedRef.current = true;
          setShowAuthModal(true);
        }
      }
    };
    loadMessages();
    return () => {
      if (loadingMessagesForRef.current === (selectedChat?.id || null)) {
        loadingMessagesForRef.current = null;
      }
      if (controller && typeof controller.abort === 'function') controller.abort();
    };
  }, [selectedChat?.id, isMobile, mobileShowSidebar, currentUser]);

  const loadCurrentUser = async () => {
    try {
      setIsLoading(true);
      const user = await apiService.getCurrentUser();
      setCurrentUser(user);

      // Connect to WebSocket
      await connectWebSocket();

      // Load chats after successful connection
      try {
        const chats = await apiService.getChats();
        useChatStore.getState().setChats(chats);
      } catch (err) {
        console.error('Failed to load chats:', err);
      }
    } catch (error) {
      console.error("Failed to load current user:", error);
      apiService.clearToken();
      setShowAuthModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const connectWebSocket = async () => {
    try {
      setIsConnecting(true);
      await wsService.connect();
      console.log("WebSocket connected successfully");
    } catch (error) {
      console.error("Failed to connect to WebSocket:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const setupWebSocketListeners = () => {
    // Handle initial users list
    wsService.on("users", (usersList: User[]) => {
      setUsers(usersList);
    });

    // Handle user joined event
    wsService.on("userJoined", (user: User) => {
      addUser(user);
    });

    // Handle user left event
    wsService.on("userLeft", (user: User) => {
      updateUser(user.id, { 
        status: 'offline',
        lastSeen: new Date().toISOString() 
      });
    });

    // On send error, re-enqueue payload for retry via outbox
    wsService.on('sendError', (evt: { error: any; payload: { chatId: string; content: string; type?: string; replyToId?: string; language?: string; filename?: string; attachments?: Array<{ url: string; originalName: string; filename?: string; mimeType: string; size: number; thumbnail?: string | null }>; } }) => {
      try {
        enqueueOutbox({
          id: `ob-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          payload: evt.payload,
          createdAt: Date.now(),
        });
      } catch (e) {
        console.warn('Failed to enqueue outbox item after sendError', e);
      }
    });
  };

  const handleConnect = () => {
    console.log('Connected to WebSocket');
    // Re-authenticate and rejoin rooms on reconnect
    if (currentUser) {
      const socket = wsService.getSocket();
      if (socket) {
        socket.emit('join', {
          username: currentUser.username,
          userId: currentUser.id,
          avatar: currentUser.avatar,
        });
      }
       try {
        (useChatStore.getState().chats || []).forEach((c) => {
          if (c?.id) wsService.joinChat(c.id);
        });
      } catch {}
    }
    setTimeout(() => {
      flushOutbox();
    }, 150);
  };

  const handleDisconnect = () => {
    console.log('Disconnected from WebSocket');
  };

  const handleUsers = (users: any[]) => {
    const formattedUsers = users.map(user => ({
      ...user,
      lastSeen: user.lastSeen ? new Date(user.lastSeen).toISOString() : new Date().toISOString(),
    }));
    setUsers(formattedUsers);
  };

  const handleUserJoined = (userData: any) => {
    addUser({
      ...userData,
      status: 'online',
      lastSeen: new Date().toISOString(),
    });
  };

  const handleUserLeft = (userData: any) => {
    updateUser(userData.id, { 
      status: 'offline',
      lastSeen: new Date().toISOString() 
    });
  };

  const handleUserStatusChange = (data: { userId: string; status: string; lastSeen: string }) => {
    const { userId, status, lastSeen } = data;
    updateUser(userId, { 
      status: status as 'online' | 'offline' | 'away' | 'busy',
      lastSeen: new Date(lastSeen).toISOString()
    });
  };

  const loadMessagesFromStorage = (chatId: string): Message[] => {
    try {
      const stored = localStorage.getItem(`biuld_messages_${chatId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error loading messages from localStorage:", error);
      return [];
    }
  };

  const saveMessagesToStorage = (chatId: string, messages: Message[]) => {
    try {
      localStorage.setItem(
        `biuld_messages_${chatId}`,
        JSON.stringify(messages)
      );
    } catch (error) {
      console.error("Error saving messages to localStorage:", error);
    }
  };

  const handleAuthSuccess = async (user: User) => {
    setCurrentUser(user);
    setShowAuthModal(false);
    authBlockedRef.current = false; 
    await connectWebSocket();
    try {
      const chats = await apiService.getChats();
      useChatStore.getState().setChats(chats);
    } catch (err) {
      console.error('Failed to load chats after auth:', err);
    }
  };

  const handleLogout = async (fromSettings = false) => {
    try {
      wsService.disconnect();
      
      apiService.clearToken();
      
      useChatStore.getState().logout();
      
      localStorage.removeItem('biuld-chat-store');
      
      document.cookie = 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      if (!fromSettings) {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error during logout:', error);
      if (!fromSettings) {
        window.location.href = '/';
      }
    }
  };

  const handleStartConversation = async (userId: string) => {
    if (!currentUser) {
      console.error('Cannot start conversation: No current user');
      return;
    }

    console.log('Starting new conversation with user:', userId);

    try {
      if (creatingDMWithRef.current.has(userId)) {
        console.warn('Chat creation already in progress for user:', userId);
        return;
      }
      creatingDMWithRef.current.add(userId);

      // Find an existing DIRECT chat between current user and the target user
      const existingChat = chats.find((chat) => {
        if (chat.type !== 'DIRECT') return false;
        const memberIds = (chat.members || []).map((m: any) => m.userId || m.user?.id);
        return memberIds.includes(userId) && memberIds.includes(currentUser.id);
      });
  
      if (existingChat) {
        console.log('Found existing chat:', existingChat.id);
        setSelectedChat(existingChat);
        return;
      }
      
      console.log('Creating new chat with user:', userId);
      const newChat = await apiService.createChat({
        type: 'DIRECT',
        memberIds: [userId],
      });
      
      console.log('Server created chat:', newChat);
      
      addChat(newChat);
      setSelectedChat(newChat);
      setReplyingByChat(prev => ({ ...prev, [newChat.id]: null }));
      
      setMessages(newChat.id, []);
      
    } catch (error: any) {
      console.error('Error creating chat:', error);

      // If unauthorized, prompt re-auth
      if (String(error?.message || '').includes('Unauthorized')) {
        try { apiService.clearToken(); } catch {}
        setShowAuthModal(true);
        return;
      }
      try {
        const latestChats = await apiService.getChats();
        useChatStore.getState().setChats(latestChats);
        const fallback = latestChats.find((chat) => {
          if (chat.type !== 'DIRECT') return false;
          const ids = (chat.members || []).map((m: any) => (m as any).userId || m.user?.id);
          return ids.includes(userId) && ids.includes(currentUser!.id);
        });
        if (fallback) {
          console.log('Routing to existing chat after failure:', fallback.id);
          setSelectedChat(fallback);
          return;
        }
      } catch (e) {
        console.warn('Failed to recover chats after create error:', e);
      }
      alert('Failed to create or locate chat. Please try again.');
    } finally {
      creatingDMWithRef.current.delete(userId);
    }
  };

  const sendMessage = (text: string, type = "text", attachment?: any) => {
    if (!text.trim()) {
      console.warn('Attempted to send empty message');
      return;
    }
    
    if (!selectedChat) {
      console.error('Cannot send message: No chat selected');
      return;
    }
    
    if (!currentUser) {
      console.error('Cannot send message: No current user');
      return;
    }

    const scopedReply = selectedChat ? (replyingByChat[selectedChat.id] || null) : null;

    console.log('Sending message:', {
      chatId: selectedChat.id,
      type,
      contentLength: text.length,
      isReply: !!scopedReply
    });

    const normalizedType = (type || 'text').toUpperCase();
    const normAttachment = attachment ? {
      url: attachment.url,
      originalName: attachment.originalName || attachment.filename || attachment.name || 'file',
      filename: attachment.filename || attachment.originalName || attachment.name || 'file',
      mimeType: attachment.mimeType || attachment.type || 'application/octet-stream',
      size: Number(attachment.size) || 0,
      thumbnail: attachment.thumbnail ?? null,
      path: attachment.path,
      storageKey: attachment.storageKey,
      storageBucket: attachment.storageBucket,
      storageProvider: attachment.storageProvider,
    } : undefined;

    const messageData: any = {
      chatId: selectedChat.id,
      content: text,
      type: normalizedType,
      ...(scopedReply && {
        replyToId: scopedReply.id,
      }),
    };
    if (normAttachment) {
      messageData.attachments = [normAttachment];
    }
    
    const connected = wsService.isConnected();
    if (connected) {
      wsService.sendMessage(messageData);
    } else {
      enqueueOutbox({
        id: `ob-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        payload: messageData,
        createdAt: Date.now(),
      });
    }
    setReplyingByChat(prev => ({ ...prev, [selectedChat.id]: null }));
    
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();

    // For Ticks
    let optimisticStatus: Message['status'] = 'SENT';
    if (selectedChat.type === 'DIRECT') {
      const memberIds = (selectedChat.members || []).map((m: any) => m.userId || m.user?.id);
      const otherId = memberIds.find(id => id && id !== currentUser.id);
      const other = users.find(u => u.id === otherId);
      if (other && other.status === 'online') {
        optimisticStatus = 'DELIVERED';
      }
    }

    const tempMessage: Message = {
      id: tempId,
      chatId: selectedChat.id,
      content: text,
      type: normalizedType as any,
      status: optimisticStatus, 
      sender: currentUser,
      createdAt: now,
      updatedAt: now,
      attachments: normAttachment ? [{
        id: `temp-att-${Date.now()}`,
        filename: normAttachment.filename,
        originalName: normAttachment.originalName,
        mimeType: normAttachment.mimeType,
        size: normAttachment.size,
        url: normAttachment.url,
        thumbnail: normAttachment.thumbnail,
        createdAt: now,
      }] : [],
      reactions: [],
      ...(scopedReply && { replyTo: scopedReply }),
    };
    
    addMessage(selectedChat.id, tempMessage);
    
    // Scroll to bottom after adding the message
    setTimeout(() => {
      const messagesContainer = document.querySelector('.messages-container');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);
  };

  const sendCodeSnippet = (code: string, language: string, filename?: string) => {
    if (code.trim() && selectedChat && currentUser) {
      const scopedReply = selectedChat ? (replyingByChat[selectedChat.id] || null) : null;
      const messageData = {
        chatId: selectedChat.id,
        content: code,
        type: 'CODE',
        language,
        ...(filename ? { filename } : {}),
        ...(scopedReply && {
          replyToId: scopedReply.id,
        }),
      };
      
      wsService.sendMessage(messageData);
      setReplyingByChat(prev => ({ ...prev, [selectedChat.id]: null }));
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (selectedChat && currentUser) {
      wsService.setTyping(selectedChat.id, isTyping);
    }
  };

  const deleteMessage = (messageId: string) => {
    storeDeleteMessage(messageId, true);
  };

  const replyToMessage = (message: Message) => {
    if (!selectedChat?.id) return;
    setReplyingByChat(prev => ({ ...prev, [selectedChat.id]: message }));
  };

  const cancelReply = () => {
    if (!selectedChat?.id) return;
    setReplyingByChat(prev => ({ ...prev, [selectedChat.id]: null }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Biuld...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    );
  }

  return (
    <div className={`flex h-screen min-h-0 bg-gray-900 ${isMobile ? 'relative overflow-hidden' : ''}`}>
      {/* Sidebar: Mobile responsiveness */}
      <div
        className={
          isMobile
            ? `absolute inset-0 w-full h-full min-h-0 flex flex-col overflow-hidden transform ${
                mobileShowSidebar ? 'translate-x-0 z-20 pointer-events-auto' : '-translate-x-full z-10 pointer-events-none'
              }`
            : 'flex h-full min-h-0'
        }
        style={isMobile ? { contain: 'content' as any } : undefined}
      >
        <Sidebar
          onLogout={handleLogout}
          onUserSelect={handleStartConversation}
          onChatSelected={() => isMobile && setMobileShowSidebar(false)}
        />
      </div>

      {/* Chat Area: Mobile responsiveness */}
      <div
        className={
          isMobile
            ? `absolute inset-0 w-full h-full min-h-0 flex flex-col overflow-hidden transform ${
                mobileShowSidebar ? 'translate-x-full z-10 pointer-events-none' : 'translate-x-0 z-20 pointer-events-auto'
              }`
            : 'flex-1 min-h-0 h-full flex'
        }
        style={isMobile ? { contain: 'content' as any } : undefined}
      >
        <ChatArea
          replyingTo={selectedChat ? (replyingByChat[selectedChat.id] || null) : null}
          onSendMessage={sendMessage}
          onSendCodeSnippet={sendCodeSnippet}
          onTyping={handleTyping}
          onDeleteMessage={deleteMessage}
          onReplyToMessage={replyToMessage}
          onCancelReply={cancelReply}
          onBack={() => {
            if (isMobile) {
              setMobileShowSidebar(true);
              try { setSelectedChat(undefined as any); } catch {}
              try { sessionStorage.setItem('biuld_sidebar_force_visible', '1'); } catch {}
              try { sessionStorage.removeItem('biuld_pending_chat'); } catch {}
              suppressUrlSyncRef.current = true;
              setTimeout(() => { suppressUrlSyncRef.current = false; }, 500);
            }
          }}
        />
      </div>
    </div>
  );
}
