import React, { useEffect, useState } from "react";
import { useChatStore } from "@/stores/chatStore";
import { apiService } from "@/services/api";
import { wsService } from "@/services/websocket";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";
import AuthModal from "./AuthModal";
import { User, Message, Chat } from "@/types";

export default function ChatLayout() {
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
  } = useChatStore();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  useEffect(() => {
    // Check if user is already authenticated
    const token = apiService.getToken();
    if (token && !currentUser) {
      loadCurrentUser();
    } else if (!token) {
      setShowAuthModal(true);
    }
  }, [currentUser]);

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

    // Handle new messages (backend emits message_received with { message })
    wsService.on("messageReceived", (payload: any) => {
      const msg: Message = payload?.message || payload;
      if (!msg?.chatId) return;
      const chatId = msg.chatId;
      addMessage(chatId, msg);
      saveMessagesToStorage(chatId, [
        ...(messages[chatId] || []),
        msg,
      ]);
    });

    wsService.on("newMessage", (message: Message) => {
      if (!message?.chatId) return;
      const chatId = message.chatId;
      addMessage(chatId, message);
      saveMessagesToStorage(chatId, [
        ...(messages[chatId] || []),
        message,
      ]);

      // If currently viewing this chat, optionally mark as read (event name may differ server-side)
      if (selectedChat?.id === chatId) {
        const socket = wsService.getSocket();
        if (socket) {
          socket.emit("mark_as_read", {
            messageId: message.id,
            chatId,
          });
        }
      }
    });

    wsService.on(
      "messageStatusUpdate",
      ({ messageId, status }: { messageId: string; status: string }) => {
        if (selectedChat) {
          const validStatuses = ["SENT", "DELIVERED", "READ"] as const;
          const isValidStatus = validStatuses.includes(status as any);
          const newStatus = isValidStatus
            ? (status as "SENT" | "DELIVERED" | "READ")
            : "SENT";

          const chatMessages = messages[selectedChat.id] || [];
          const updatedMessages = chatMessages.map((msg) =>
            msg.id === messageId ? { ...msg, status: newStatus } : msg
          );
          setMessages(selectedChat.id, updatedMessages);
        }
      }
    );

    wsService.on("messageDeleted", ({ messageId }: { messageId: string }) => {
      if (selectedChat) {
        const chatMessages = messages[selectedChat.id] || [];
        const updatedMessages = chatMessages.filter(
          (msg) => msg.id !== messageId
        );
        setMessages(selectedChat.id, updatedMessages);
        saveMessagesToStorage(selectedChat.id, updatedMessages);
      }
    });

    wsService.on("userTyping", ({
      userId,
      username,
      isTyping,
    }: {
      userId: string;
      username: string;
      isTyping: boolean;
    }) => {
      if (selectedChat) {
        if (isTyping) {
          addTypingUser(selectedChat.id, username);
        } else {
          removeTypingUser(selectedChat.id, username);
        }
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
    }
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
      setReplyingTo(null);
      
      setMessages(newChat.id, []);
      
    } catch (error) {
      console.error('Error creating chat:', error);
      alert('Failed to create chat. Please try again or contact support.');
    }
  };

  const sendMessage = (text: string, type = "text") => {
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

    console.log('Sending message:', {
      chatId: selectedChat.id,
      type,
      contentLength: text.length,
      isReply: !!replyingTo
    });

    const messageData = {
      chatId: selectedChat.id,
      content: text,
      type,
      ...(replyingTo && {
        replyToId: replyingTo.id,
      }),
    };
    
    wsService.sendMessage(messageData);
    setReplyingTo(null);
    
    // Optimistically add the message to the UI
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();
    const tempMessage: Message = {
      id: tempId,
      chatId: selectedChat.id,
      content: text,
      type: type as any, 
      status: 'SENT', 
      sender: currentUser,
      createdAt: now,
      updatedAt: now,
      attachments: [],
      reactions: [],
      ...(replyingTo && { replyTo: replyingTo }),
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

  const sendCodeSnippet = (code: string, language: string) => {
    if (code.trim() && selectedChat && currentUser) {
      const messageData = {
        chatId: selectedChat.id,
        content: code,
        type: 'code',
        language,
        ...(replyingTo && {
          replyToId: replyingTo.id,
        }),
      };
      
      wsService.sendMessage(messageData);
      setReplyingTo(null);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (selectedChat && currentUser) {
      wsService.setTyping(selectedChat.id, isTyping);
    }
  };

  const deleteMessage = (messageId: string) => {
    if (selectedChat && currentUser) {
      wsService.deleteMessage(selectedChat.id, messageId);
    }
  };

  const replyToMessage = (message: Message) => {
    setReplyingTo(message);
  };

  const cancelReply = () => {
    setReplyingTo(null);
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
    <div className="flex h-screen bg-gray-900">
      <Sidebar onLogout={handleLogout} onUserSelect={handleStartConversation} />
      <ChatArea
        replyingTo={replyingTo}
        onSendMessage={sendMessage}
        onSendCodeSnippet={sendCodeSnippet}
        onTyping={handleTyping}
        onDeleteMessage={deleteMessage}
        onReplyToMessage={replyToMessage}
        onCancelReply={cancelReply}
      />

      {isConnecting && (
        <div className="fixed top-4 right-4 bg-yellow-600 text-white px-4 py-2 rounded-md shadow-lg">
          Connecting to Biuld...
        </div>
      )}
    </div>
  );
}
