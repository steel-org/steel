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
      
      // Clean up event listeners on unmount
      return () => {
        wsService.off("users");
        wsService.off("userJoined");
        wsService.off("userLeft");
        wsService.off("messageReceived");
        wsService.off("newMessage");
        // Add any other event listeners to clean up
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

    // Handle new messages
    wsService.on("messageReceived", (message: Message) => {
      if (selectedChat) {
        addMessage(selectedChat.id, message);
        saveMessagesToStorage(selectedChat.id, [
          ...(messages[selectedChat.id] || []),
          message,
        ]);
      }
    });

    wsService.on("newMessage", (message: Message) => {
      if (selectedChat) {
        addMessage(selectedChat.id, message);
        saveMessagesToStorage(selectedChat.id, [
          ...(messages[selectedChat.id] || []),
          message,
        ]);

        // Mark as read if conversation is active
        if (
          selectedChat &&
          ((message.sender.id ===
            selectedChat.members.find(
              (member) => member.user.id !== currentUser?.id
            )?.user.id &&
            selectedChat.members.some(
              (member) => member.user.id === currentUser?.id
            )) ||
            (selectedChat.members.some(
              (member) => member.user.id === message.sender.id
            ) &&
              message.sender.id === currentUser?.id))
        ) {
          const socket = wsService.getSocket();
          if (socket) {
            socket.emit("mark_as_read", {
              messageId: message.id,
              chatId: selectedChat.id,
            });
          }
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

    wsService.on("userJoined", (user: User) => {
      addUser(user);
    });

    wsService.on("userLeft", (user: User) => {
      updateUser(user.id, { status: "offline", lastSeen: user.lastSeen });
    });

    wsService.on(
      "userTyping",
      ({
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
      }
    );
  };

  const loadMessagesFromStorage = (chatId: string): Message[] => {
    try {
      const stored = localStorage.getItem(`steel_messages_${chatId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error loading messages from localStorage:", error);
      return [];
    }
  };

  const saveMessagesToStorage = (chatId: string, messages: Message[]) => {
    try {
      localStorage.setItem(
        `steel_messages_${chatId}`,
        JSON.stringify(messages)
      );
    } catch (error) {
      console.error("Error saving messages to localStorage:", error);
    }
  };

  const handleAuthSuccess = async (user: User) => {
    setCurrentUser(user);
    setShowAuthModal(false);

    // Connect to WebSocket after successful authentication
    await connectWebSocket();
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
      wsService.disconnect();
      setCurrentUser(null);
      setSelectedChat(null);
      setShowAuthModal(true);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleStartConversation = async (userId: string) => {
    if (!currentUser) {
      console.error('Cannot start conversation: No current user');
      return;
    }

    console.log('Starting new conversation with user:', userId);

    // Sort user IDs to ensure consistent chat ID generation
    const [user1, user2] = [currentUser.id, userId].sort();
    const chatId = `chat_${user1}_${user2}`;
    
    console.log('Generated chat ID:', chatId);

    // Check if chat already exists with this user
    const existingChat = chats.find(chat =>
      !chat.isGroup &&
      chat.participants?.includes(userId) &&
      chat.participants?.includes(currentUser.id)
    );

    if (existingChat) {
      setSelectedChat(existingChat);
      return;
    }

    // Find user 
    const existingUser = users.find(u => u.id === userId);
    const user: User = existingUser || {
      id: userId,
      username: `user_${userId.slice(0, 6)}`,
      displayName: `User ${userId.slice(0, 6)}`,
      lastSeen: new Date().toISOString(),
      email: `${userId}@placeholder.com`,
      avatar: `https://ui-avatars.com/api/?name=User+${encodeURIComponent(userId.slice(0, 6))}&background=random`,
      createdAt: new Date().toISOString(),
      status: 'offline' 
    };
    
    const chat: Chat = {
      id: chatId,
      type: 'DIRECT',
      members: [
        {
          id: `${chatId}_${currentUser.id}`,
          role: 'MEMBER',
          joinedAt: new Date().toISOString(),
          user: currentUser
        },
        {
          id: `${chatId}_${userId}`,
          role: 'MEMBER',
          joinedAt: new Date().toISOString(),
          user: user
        }
      ],
      participants: [currentUser.id, userId],
      lastMessage: undefined,
      unreadCount: 0,
      isGroup: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Add to chats list if not exists
    const chatExists = chats.some(c => c.id === chatId);
    if (!chatExists) {
      addChat(chat);
    }

    setSelectedChat(chat);
    setReplyingTo(null);

    // Load existing messages from localStorage
    const existingMessages = loadMessagesFromStorage(chatId);
    setMessages(chatId, existingMessages);
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
      type: type as any, // Temporary cast until we have proper type checking
      status: 'SENT', // Using SENT as initial status for optimistic update
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
          <p className="text-gray-400">Loading Steel Chat...</p>
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
          Connecting to steel...
        </div>
      )}
    </div>
  );
}
