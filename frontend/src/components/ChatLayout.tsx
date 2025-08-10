
import React, { useEffect, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { apiService } from '@/services/api';
import { wsService } from '@/services/websocket';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import AuthModal from './AuthModal';
import { User, Message, Chat } from '@/types';

export default function ChatLayout() {
  const { 
    currentUser, 
    setCurrentUser, 
    isLoading, 
    setIsLoading,
    selectedChat,
    setSelectedChat,
    messages,
    addMessage,
    setMessages,
    users,
    setUsers,
    addUser,
    updateUser,
    typingUsers,
    addTypingUser,
    removeTypingUser
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
      setupWebSocketListeners();
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
      console.error('Failed to load current user:', error);
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
      console.log('WebSocket connected successfully');
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const setupWebSocketListeners = () => {
    wsService.on('users', (usersList: User[]) => {
      setUsers(usersList);
    });

    wsService.on('messageReceived', (message: Message) => {
      if (selectedChat) {
        addMessage(selectedChat.id, message);
        saveMessagesToStorage(selectedChat.id, [...messages[selectedChat.id] || [], message]);
      }
    });

    wsService.on('newMessage', (message: Message) => {
      if (selectedChat) {
        addMessage(selectedChat.id, message);
        saveMessagesToStorage(selectedChat.id, [...messages[selectedChat.id] || [], message]);
        
        // Mark as read if conversation is active
        if (
          selectedChat &&
          ((message.senderId === selectedChat.participantIds.find(id => id !== currentUser?.id) &&
            message.recipientId === currentUser?.id) ||
            (message.recipientId === selectedChat.participantIds.find(id => id !== currentUser?.id) &&
              message.senderId === currentUser?.id))
        ) {
          wsService.emit('markAsRead', {
            senderId: message.senderId,
            messageId: message.id,
          });
        }
      }
    });

    wsService.on('messageStatusUpdate', ({ messageId, status }: { messageId: string, status: string }) => {
      if (selectedChat) {
        // Update message status in store
        const chatMessages = messages[selectedChat.id] || [];
        const updatedMessages = chatMessages.map(msg => 
          msg.id === messageId ? { ...msg, status } : msg
        );
        setMessages(selectedChat.id, updatedMessages);
      }
    });

    wsService.on('messageDeleted', ({ messageId }: { messageId: string }) => {
      if (selectedChat) {
        const chatMessages = messages[selectedChat.id] || [];
        const updatedMessages = chatMessages.filter(msg => msg.id !== messageId);
        setMessages(selectedChat.id, updatedMessages);
        saveMessagesToStorage(selectedChat.id, updatedMessages);
      }
    });

    wsService.on('userJoined', (user: User) => {
      addUser(user);
    });

    wsService.on('userLeft', (user: User) => {
      updateUser(user.id, { isOnline: false, lastSeen: user.lastSeen });
    });

    wsService.on('userTyping', ({ userId, username, isTyping }: { userId: string, username: string, isTyping: boolean }) => {
      if (selectedChat) {
        if (isTyping) {
          addTypingUser(selectedChat.id, username);
        } else {
          removeTypingUser(selectedChat.id, username);
        }
      }
    });
  };

  const loadMessagesFromStorage = (chatId: string): Message[] => {
    try {
      const stored = localStorage.getItem(`steel_messages_${chatId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading messages from localStorage:', error);
      return [];
    }
  };

  const saveMessagesToStorage = (chatId: string, messages: Message[]) => {
    try {
      localStorage.setItem(`steel_messages_${chatId}`, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving messages to localStorage:', error);
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
      console.error('Logout failed:', error);
    }
  };

  const handleStartConversation = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    // Create or find existing chat
    const chatId = [currentUser!.id, userId].sort().join('_');
    const chat: Chat = {
      id: chatId,
      participantIds: [currentUser!.id, userId],
      participants: [currentUser!, user],
      lastMessage: null,
      unreadCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setSelectedChat(chat);
    setReplyingTo(null);

    // Load existing messages from localStorage
    const existingMessages = loadMessagesFromStorage(chatId);
    setMessages(chatId, existingMessages);
  };

  const sendMessage = (text: string, type = 'text') => {
    if (text.trim() && selectedChat && currentUser) {
      const otherUserId = selectedChat.participantIds.find(id => id !== currentUser.id);
      wsService.emit('privateMessage', {
        recipientId: otherUserId,
        text,
        type,
        replyTo: replyingTo,
      });
      setReplyingTo(null);
    }
  };

  const sendCodeSnippet = (code: string, language: string) => {
    if (code.trim() && selectedChat && currentUser) {
      const otherUserId = selectedChat.participantIds.find(id => id !== currentUser.id);
      wsService.emit('codeSnippet', {
        recipientId: otherUserId,
        code,
        language,
        replyTo: replyingTo,
      });
      setReplyingTo(null);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (selectedChat && currentUser) {
      const otherUserId = selectedChat.participantIds.find(id => id !== currentUser.id);
      wsService.emit('typing', { recipientId: otherUserId, isTyping });
    }
  };

  const deleteMessage = (messageId: string) => {
    if (selectedChat && currentUser) {
      const otherUserId = selectedChat.participantIds.find(id => id !== currentUser.id);
      wsService.emit('deleteMessage', {
        messageId,
        recipientId: otherUserId,
      });
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
      <Sidebar 
        onLogout={handleLogout}
        onUserSelect={handleStartConversation}
      />
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
          Connecting to server...
        </div>
      )}
    </div>
  );
}
