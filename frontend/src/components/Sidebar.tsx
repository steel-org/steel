
import React, { useState } from 'react';
import { Users, User, Circle, Search, LogOut } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';

interface SidebarProps {
  onLogout: () => void;
  onUserSelect: (userId: string) => void;
}

export default function Sidebar({ onLogout, onUserSelect }: SidebarProps) {
  const { currentUser, users, selectedChat } = useChatStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(
    (user) =>
      user.id !== currentUser?.id &&
      user.isOnline &&
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-100">Steel Chat</h1>
              <p className="text-sm text-gray-400">Private messaging</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Current User */}
      {currentUser && (
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img
                src={currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.username)}&background=3b82f6&color=ffffff&size=128&rounded=true`}
                alt={currentUser.username}
                className="w-10 h-10 rounded-full"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-100 truncate">{currentUser.username}</p>
              <p className="text-sm text-gray-400">Online</p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Online Users */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
            Online ({filteredUsers.length})
          </h3>
          <div className="space-y-2">
            {filteredUsers.map((user) => {
              const isSelected = selectedChat?.participantIds.includes(user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => onUserSelect(user.id)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-700 transition-colors text-left ${
                    isSelected ? 'bg-gray-700 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="relative">
                    <img
                      src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=3b82f6&color=ffffff&size=128&rounded=true`}
                      alt={user.username}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="absolute -bottom-1 -right-1">
                      <Circle
                        className={`w-4 h-4 ${
                          user.isOnline ? 'text-green-500 fill-current' : 'text-gray-500'
                        }`}
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-100 truncate">{user.username}</p>
                    <p className="text-sm text-gray-400">
                      {user.isOnline ? 'Online' : `Last seen ${formatTime(user.lastSeen)}`}
                    </p>
                  </div>
                </button>
              );
            })}
            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">No users online</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
