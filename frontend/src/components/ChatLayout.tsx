import React, { useEffect, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { apiService } from '@/services/api';
import { wsService } from '@/services/websocket';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import AuthModal from './AuthModal';
import { User } from '@/types';

export default function ChatLayout() {
  const { currentUser, setCurrentUser, isLoading, setIsLoading } = useChatStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated
    const token = apiService.getToken();
    if (token && !currentUser) {
      loadCurrentUser();
    } else if (!token) {
      setShowAuthModal(true);
    }
  }, [currentUser]);

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
      setShowAuthModal(true);
    } catch (error) {
      console.error('Logout failed:', error);
    }
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
      <Sidebar onLogout={handleLogout} />
      <ChatArea />
      
      {isConnecting && (
        <div className="fixed top-4 right-4 bg-yellow-600 text-white px-4 py-2 rounded-md shadow-lg">
          Connecting to server...
        </div>
      )}
    </div>
  );
} 