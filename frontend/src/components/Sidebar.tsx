
import React, { useState, useMemo } from 'react';
import { Users, User as UserIcon, Circle, Search, LogOut, Users as UsersIcon, MessageSquarePlus, X } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { User } from '@/types';
import GroupChatModal from './GroupChatModal';
import UserModal from './UserModal';
import ProfileModal from './ProfileModal';

interface SidebarProps {
  onLogout: () => void;
  onUserSelect: (userId: string) => void;
}

export default function Sidebar({ onLogout, onUserSelect }: SidebarProps) {
  const { currentUser, users, selectedChat, createGroupChat } = useChatStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Filter online users except current user
  const onlineUsers = useMemo(() => 
    users.filter(user => 
      user.id !== currentUser?.id && 
      user.status === 'online'
    ),
    [users, currentUser]
  );

  // Handle starting a new chat
  const handleNewChat = (user: User) => {
    onUserSelect(user.id);
    setIsNewChatOpen(false);
    setSearchTerm('');
  };

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setIsProfileModalOpen(true);
  };

  const handleEditProfile = () => {
    setIsProfileModalOpen(false);
    setIsUserModalOpen(true);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.id !== currentUser?.id &&
      user.status === 'online' &&
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
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-100">Steel Chat</h1>
            <p className="text-sm text-gray-400">Private messaging</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsNewChatOpen(true)}
              className="p-2 rounded-full hover:bg-gray-700"
              title="New Chat"
            >
              <MessageSquarePlus size={20} />
            </button>
            <button
              onClick={() => setIsGroupModalOpen(true)}
              className="p-2 rounded-full hover:bg-gray-700"
              title="New Group"
            >
              <UsersIcon size={20} />
            </button>
            <button
              onClick={onLogout}
              className="p-2 rounded-full hover:bg-gray-700"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
        
        {/* Search Bar - Only show when not in new chat mode */}
        {!isNewChatOpen && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search or start new chat"
              className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsNewChatOpen(true)}
            />
          </div>
        )}
      </div>

      {/* Current User */}
      {currentUser && (
        <div className="p-4 border-b border-gray-700 hover:bg-gray-700/50 cursor-pointer transition-colors"
          onClick={() => {
            setSelectedUser(currentUser);
            setIsProfileModalOpen(true);
          }}>
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
              <p className="text-sm font-medium text-white truncate">{currentUser.username}</p>
              <p className="text-xs text-gray-400 truncate">Online</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsUserModalOpen(true);
              }}
              className="p-1 text-gray-400 hover:text-white"
              title="Edit profile"
            >
              <UserIcon className="w-4 h-4" />
            </button>
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
              const isSelected = selectedChat?.participants?.includes(user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => onUserSelect(user.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleUserClick(user);
                  }}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-700 transition-colors text-left group ${
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
                          user.status === "online" ? 'text-green-500 fill-current' : 'text-gray-500'
                        }`}
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-100 truncate">{user.username}</p>
                      <p className="text-sm text-gray-400">
                        {user.status === 'online' ? 'Online' : `Last seen ${formatTime(user.lastSeen)}`}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUserClick(user);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white p-1"
                      title="View profile"
                    >
                      <UserIcon className="w-4 h-4" />
                    </button>
                  </div>
                </button>
              );
            })}
            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <UserIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">No users online</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <GroupChatModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        users={users}
        currentUser={currentUser!}
        onCreate={(name, userIds) => {
          createGroupChat(name, userIds);
          setIsGroupModalOpen(false);
        }}
      />

      {currentUser && (
        <UserModal
          user={currentUser}
          isOpen={isUserModalOpen}
          onClose={() => setIsUserModalOpen(false)}
        />
      )}

      {selectedUser && (
        <ProfileModal
          user={selectedUser}
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          isCurrentUser={selectedUser.id === currentUser?.id}
          onEditProfile={handleEditProfile}
        />
      )}

      {/* New Chat Modal */}
      {isNewChatOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-90 z-50 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={() => setIsNewChatOpen(false)}
                className="text-gray-300 hover:text-white p-2 -ml-2"
              >
                <X size={24} />
              </button>
              <h2 className="text-lg font-medium text-white">New Chat</h2>
              <div className="w-10"></div> {/* Spacer for alignment */}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search users"
                className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {onlineUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                <UserIcon size={48} className="mb-4" />
                <p className="text-lg font-medium mb-2">No online users</p>
                <p className="text-sm text-center text-gray-500">
                  Your friends arent online?, tell them to come onboard
                </p>
                <p className="text-sm text-center text-gray-500">
                  You'll see them here!
                </p>
              </div>
            ) : (
              onlineUsers
                .filter(user => 
                  user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
                )
                .map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center p-4 hover:bg-gray-700 cursor-pointer"
                    onClick={() => handleNewChat(user)}
                  >
                    <div className="relative mr-3">
                      <img
                        src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=3b82f6&color=ffffff&size=128&rounded=true`}
                        alt={user.username}
                        className="w-12 h-12 rounded-full"
                      />
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {user.displayName || user.username}
                      </p>
                      <p className="text-xs text-gray-400">
                        {user.status === 'online' ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
