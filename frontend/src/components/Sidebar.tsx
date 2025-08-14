
import React, { useState, useMemo, useEffect } from 'react';
import { Search, UserPlus, MessageSquare, Users, MessageSquarePlus, User as UserIcon, Circle, ChevronDown, ChevronRight } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { User, Chat } from '@/types';
import Settings from './Settings';
import UserModal from './UserModal';
import ProfileModal from './ProfileModal';
import { formatDistanceToNow } from 'date-fns';

interface SidebarProps {
  onLogout: () => void;
  onUserSelect: (userId: string) => void;
}

export default function Sidebar({ onLogout, onUserSelect }: SidebarProps) {
  const { currentUser, users, selectedChat, chats, setSelectedChat } = useChatStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    chats: true,
    groups: true,
    online: true
  });

  // Toggle section expansion
  const toggleSection = (section: 'chats' | 'groups' | 'online') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const { directChats, groupChats, onlineUsers } = useMemo(() => {
     const onlineUsers = users.filter(user => 
      user.status === 'online' && user.id !== currentUser?.id
    );

    const directChats: Chat[] = [];
    const groupChats: Chat[] = [];
    
    chats.forEach(chat => {
      if (chat.type === 'DIRECT') {
        directChats.push(chat);
      } else if (chat.type === 'GROUP') {
        groupChats.push(chat);
      }
    });

    const sortByLastMessage = (a: Chat, b: Chat) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage).getTime() : 0;
      return timeB - timeA; 
    };

    return {
      directChats: directChats.sort(sortByLastMessage),
      groupChats: groupChats.sort(sortByLastMessage),
      onlineUsers: onlineUsers.sort((a, b) => a.username.localeCompare(b.username))
    };
  }, [chats, users, currentUser]);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users
      .filter(user => 
        user.id !== currentUser?.id &&
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        if (a.status === 'online' && b.status !== 'online') return -1;
        if (a.status !== 'online' && b.status === 'online') return 1;
        return a.username.localeCompare(b.username);
      });
  }, [users, currentUser, searchTerm]);

  const handleUserSelectClick = (userId: string) => {
    onUserSelect(userId);
    setSearchTerm('');
  };

  const handleUserClick = (user: User, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedUser(user);
    setIsProfileModalOpen(true);
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderChatItem = (chat: Chat) => {
    const isGroup = chat.type === 'GROUP';
    const chatName = chat.name || chat.members
      ?.filter(member => member.user?.id !== currentUser?.id)
      .map(member => member.user?.username)
      .join(', ');
    
    const lastMessage = chat.messages?.[0];
    const isSelected = selectedChat?.id === chat.id;
    const lastMessageTime = chat.lastMessage 
      ? formatDistanceToNow(
          typeof chat.lastMessage === 'string' 
            ? new Date(chat.lastMessage) 
            : chat.lastMessage, 
          { addSuffix: true }
        )
      : null;

    return (
      <div
        key={chat.id}
        className={`flex items-center p-3 hover:bg-gray-700/50 cursor-pointer ${isSelected ? 'bg-gray-700/70' : ''}`}
        onClick={() => setSelectedChat(chat)}
      >
        <div className="relative">
          {isGroup ? (
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
              <Users size={18} />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white">
              <UserIcon size={18} />
            </div>
          )}
          {!isGroup && chat.members?.some(m => m.user?.status === 'online' && m.user.id !== currentUser?.id) && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
          )}
        </div>
        <div className="ml-3 flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-100 truncate">{chatName || 'Unknown'}</h3>
            {lastMessageTime && (
              <span className="text-xs text-gray-400">
                {lastMessageTime}
              </span>
            )}
          </div>
          {lastMessage?.content && (
            <p className="text-xs text-gray-400 truncate">
              {lastMessage.sender?.id === currentUser?.id ? 'You: ' : ''}
              {lastMessage.content.substring(0, 30)}
              {lastMessage.content.length > 30 ? '...' : ''}
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderOnlineUser = (user: User) => (
    <div
      key={user.id}
      className="flex items-center p-2 hover:bg-gray-700/50 rounded-md cursor-pointer"
      onClick={() => onUserSelect(user.id)}
    >
      <div className="relative">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.username}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">
            {user.username.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
      </div>
      <div className="ml-3">
        <p className="text-sm font-medium text-gray-100">{user.username}</p>
        <p className="text-xs text-gray-400">{user.status}</p>
      </div>
    </div>
  );

  return (
    <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-100">Steel Chat</h1>
            <p className="text-sm text-gray-400">Private messaging</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onUserSelect('')}
              className="p-2 rounded-full hover:bg-gray-700"
              title="New Chat"
            >
              <MessageSquarePlus size={20} />
            </button>
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="p-2 rounded-full hover:bg-gray-700"
              title="Add User"
            >
              <UserPlus size={20} />
            </button>
            <Settings onLogout={onLogout} />
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search users..."
            className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Chats Section */}
      <div className="flex-1 overflow-y-auto">
        {/* Direct Chats */}
        <div className="border-b border-gray-700">
          <div 
            className="flex items-center justify-between p-3 hover:bg-gray-700/50 cursor-pointer"
            onClick={() => toggleSection('chats')}
          >
            <div className="flex items-center">
              <MessageSquare size={18} className="text-gray-400 mr-2" />
              <h2 className="font-medium text-gray-200">Direct Messages</h2>
              <span className="ml-2 text-xs bg-gray-600 text-white rounded-full px-2 py-0.5">
                {directChats.length}
              </span>
            </div>
            {expandedSections.chats ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </div>
          
          {expandedSections.chats && directChats.map(chat => renderChatItem(chat))}
          
          {expandedSections.chats && directChats.length === 0 && (
            <p className="text-sm text-gray-400 p-3 text-center">No direct messages yet</p>
          )}
        </div>

        {/* Group Chats */}
        <div className="border-b border-gray-700">
          <div 
            className="flex items-center justify-between p-3 hover:bg-gray-700/50 cursor-pointer"
            onClick={() => toggleSection('groups')}
          >
            <div className="flex items-center">
              <Users size={18} className="text-gray-400 mr-2" />
              <h2 className="font-medium text-gray-200">Group Chats</h2>
              <span className="ml-2 text-xs bg-gray-600 text-white rounded-full px-2 py-0.5">
                {groupChats.length}
              </span>
            </div>
            {expandedSections.groups ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </div>
          
          {expandedSections.groups && groupChats.map(chat => renderChatItem(chat))}
          
          {expandedSections.groups && groupChats.length === 0 && (
            <p className="text-sm text-gray-400 p-3 text-center">No group chats yet</p>
          )}
        </div>

        {/* Online Users */}
        <div>
          <div 
            className="flex items-center justify-between p-3 hover:bg-gray-700/50 cursor-pointer"
            onClick={() => toggleSection('online')}
          >
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <h2 className="font-medium text-gray-200">Online Now</h2>
              <span className="ml-2 text-xs bg-green-600 text-white rounded-full px-2 py-0.5">
                {onlineUsers.length}
              </span>
            </div>
            {expandedSections.online ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </div>
          
          {expandedSections.online && (
            <div className="px-3 pb-3 space-y-1">
              {onlineUsers.length > 0 ? (
                onlineUsers.map(user => renderOnlineUser(user))
              ) : (
                <p className="text-sm text-gray-400 text-center py-2">No one is online</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Current User */}
      {currentUser && (
        <div 
          className="p-3 border-t border-gray-700 hover:bg-gray-700/50 cursor-pointer transition-colors flex-shrink-0"
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
                  onClick={() => handleUserSelectClick(user.id)}
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
        />
      )}
    </div>
  );
}
