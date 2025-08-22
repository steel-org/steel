
import React, { useState, useMemo } from 'react';
import { Search, Users, User as UserIcon, Settings as SettingsIcon } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { User, Chat } from '@/types';
import Link from 'next/link';
import UserModal from './UserModal';
import ProfileModal from './ProfileModal';
import { format, isToday, isYesterday } from 'date-fns';
import GroupChatModal from './GroupChatModal';
import { apiService } from '@/services/api';

interface SidebarProps {
  onLogout: () => void;
  onUserSelect: (userId: string) => void;
  onChatSelected?: () => void;
}

export default function Sidebar({ onLogout, onUserSelect, onChatSelected }: SidebarProps) {
  const { currentUser, users, selectedChat, chats, setSelectedChat, messages, unreadCounts, addChat } = useChatStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'groups' | 'online'>('all');


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

    const getActivityTime = (c: Chat) => {
      const chatMsgs = (messages && (messages as any)[c.id]) || c.messages || [];
      const last = chatMsgs.length > 0 ? chatMsgs[chatMsgs.length - 1] : c.messages?.[0];
      const ts = last?.createdAt || (c as any).updatedAt || (c as any).lastMessageAt || (c as any).createdAt || null;
      const t = ts instanceof Date ? ts : ts ? new Date(ts) : null;
      return t ? t.getTime() : 0;
    };
    const sortByLastMessage = (a: Chat, b: Chat) => getActivityTime(b) - getActivityTime(a);

    return {
      directChats: directChats.sort(sortByLastMessage),
      groupChats: groupChats.sort(sortByLastMessage),
      onlineUsers: onlineUsers.sort((a, b) => a.username.localeCompare(b.username))
    };
  }, [chats, users, currentUser]);

  const getChatName = (chat: Chat) => {
    const isGroup = chat.type === 'GROUP';
    return (
      chat.name || chat.members
        ?.filter(member => member.user?.id !== currentUser?.id)
        .map(member => member.user?.username)
        .join(', ') || (isGroup ? 'Group' : 'User')
    );
  };

  const combinedChats = useMemo(() => {
    const all = [...directChats, ...groupChats];
    const getActivityTime = (c: Chat) => {
      const chatMsgs = (messages && (messages as any)[c.id]) || c.messages || [];
      const last = chatMsgs.length > 0 ? chatMsgs[chatMsgs.length - 1] : c.messages?.[0];
      const ts = last?.createdAt || (c as any).updatedAt || (c as any).lastMessageAt || (c as any).createdAt || null;
      const t = ts instanceof Date ? ts : ts ? new Date(ts) : null;
      return t ? t.getTime() : 0;
    };
    return all.sort((a, b) => getActivityTime(b) - getActivityTime(a));
  }, [directChats, groupChats, messages]);

  const filteredCombinedChats = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return combinedChats;
    return combinedChats.filter(c => getChatName(c).toLowerCase().includes(term));
  }, [combinedChats, searchTerm]);

  const filteredGroupChats = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return groupChats;
    return groupChats.filter(c => getChatName(c).toLowerCase().includes(term));
  }, [groupChats, searchTerm]);

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
    const otherUser = !isGroup 
      ? chat.members?.find(m => m.user?.id !== currentUser?.id)?.user 
      : undefined;
    const liveOtherUser = !isGroup && otherUser
      ? (users.find(u => u.id === otherUser.id) || otherUser)
      : undefined;
    
    const chatMsgs = (messages && (messages as any)[chat.id]) || chat.messages || [];
    const lastMsg = chatMsgs.length > 0 ? chatMsgs[chatMsgs.length - 1] : chat.messages?.[0];
    const lastMessageContent = lastMsg?.content || (chat as any).lastMessage || '';
    const isSelected = selectedChat?.id === chat.id;
    const timeSource: any = lastMsg?.createdAt || (chat as any).updatedAt || (chat as any).lastMessageAt || (chat as any).createdAt || null;
    const unread = (unreadCounts && (unreadCounts as any)[chat.id]) || 0;
    const lastMessageTime = (() => {
      if (!timeSource) return null;
      const d = timeSource instanceof Date ? timeSource : new Date(timeSource);
      if (isToday(d)) return format(d, 'HH:mm');
      if (isYesterday(d)) return 'Yesterday';
      return format(d, 'dd/MM/yyyy');
    })();

    return (
      <div
        key={chat.id}
        className={`flex items-center p-3 hover:bg-gray-700/50 cursor-pointer ${isSelected ? 'bg-gray-700/70' : ''}`}
        onClick={() => { setSelectedChat(chat); onChatSelected?.(); }}
      >
        <div className="relative">
          {isGroup ? (
            chat.avatar ? (
              <img
                src={chat.avatar}
                alt={chatName || 'Group'}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                <Users size={18} />
              </div>
            )
          ) : (
            otherUser?.avatar ? (
              <img
                src={otherUser.avatar}
                alt={otherUser.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white text-sm">
                {(otherUser?.username?.[0] || 'U').toUpperCase()}
              </div>
            )
          )}
          {!isGroup && (
            <div
              className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${
                (liveOtherUser?.status === 'online') ? 'bg-green-500' : 'bg-gray-500'
              }`}
            ></div>
          )}
        </div>
        <div className="ml-3 flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <h3 className={`text-sm font-medium truncate ${unread > 0 ? 'text-white' : 'text-gray-100'}`}>
              {chatName || 'Unknown'}
            </h3>
            {lastMessageTime && (
              <span className="text-xs text-gray-400 ml-2">
                {lastMessageTime}
              </span>
            )}
          </div>
          {lastMessageContent ? (
            <p className={`text-xs truncate ${unread > 0 ? 'text-gray-200' : 'text-gray-400'}`}>
              {lastMessageContent.substring(0, 30)}
              {lastMessageContent.length > 30 ? '...' : ''}
            </p>
          ) : null}
        </div>
        {/* Unread badge */}
        {unread > 0 && (
          <div className="ml-2 min-w-[20px] flex justify-end">
            <span className="inline-flex items-center justify-center px-1.5 h-5 text-xs rounded-full bg-blue-600 text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderOnlineUser = (user: User) => (
    <div
      key={user.id}
      className="flex items-center p-2 hover:bg-gray-700/50 rounded-md cursor-pointer"
      onClick={() => { onUserSelect(user.id); setSearchTerm(''); }}
      onContextMenu={(e) => handleUserClick(user, e)}
      title="Click to DM • Right-click to view profile"
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
        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${user.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
      </div>
      <div className="ml-3">
        <p className="text-sm font-medium text-gray-100">{user.username}</p>
        <p className="text-xs text-gray-400">{user.status === 'online' ? 'Online' : `Last seen ${formatTime(user.lastSeen)}`}</p>
      </div>
    </div>
  );

  return (
    <div className="w-full md:w-80 bg-gray-800 border-r border-gray-700 flex flex-col h-full md:h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-100">Biuld Chat</h1>
            <p className="text-sm text-gray-400">Private messaging</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsGroupModalOpen(true)}
              className="p-2 rounded-full hover:bg-gray-700"
              title="New Group"
            >
              <Users size={20} />
            </button>
            <Link
              href="/settings"
              className="p-2 rounded-full hover:bg-gray-700 text-gray-300 hover:text-white"
              title="Settings"
            >
              {/* Using the SettingsIcon that is already imported as SettingsIcon */}
              <SettingsIcon size={20} />
            </Link>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder={activeTab === 'online' ? 'Search users...' : 'Search chats...'}
            className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {/* Tabs */}
        <div className="mt-3 flex items-center gap-2">
          {(() => {
            const allCount = directChats.length + groupChats.length;
            const groupsCount = groupChats.length;
            const onlineCount = onlineUsers.length;
            const totalUnreadAll = [...directChats, ...groupChats]
              .reduce((sum, c) => sum + ((unreadCounts as any)?.[c.id] || 0), 0);
            const totalUnreadGroups = groupChats
              .reduce((sum, c) => sum + ((unreadCounts as any)?.[c.id] || 0), 0);
            return [
              { key: 'all', label: `All (${allCount})`, unread: totalUnreadAll },
              { key: 'groups', label: `Groups (${groupsCount})`, unread: totalUnreadGroups },
              { key: 'online', label: `Online (${onlineCount})`, unread: 0 },
            ];
          })().map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-2 ${
                activeTab === (t.key as any)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span>{t.label}</span>
              {t.unread > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-5 px-1 text-xs rounded-full bg-blue-500 text-white">
                  {t.unread > 99 ? '99+' : t.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'all' && (
          <div className="divide-y divide-gray-700/60">
            {filteredCombinedChats.length > 0 ? (
              filteredCombinedChats.map(chat => renderChatItem(chat))
            ) : (
              <p className="text-sm text-gray-400 p-3 text-center">No chats yet</p>
            )}
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="divide-y divide-gray-700/60">
            {filteredGroupChats.length > 0 ? (
              filteredGroupChats.map(chat => renderChatItem(chat))
            ) : (
              <p className="text-sm text-gray-400 p-3 text-center">No group chats yet</p>
            )}
          </div>
        )}

        {activeTab === 'online' && (
          <div className="px-3 py-2 space-y-1">
            {filteredUsers.length > 0 ? (
              filteredUsers.map(user => renderOnlineUser(user))
            ) : (
              <p className="text-sm text-gray-400 text-center py-2">No one is online</p>
            )}
          </div>
        )}
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

      {/* Create Group Modal */}
      {isGroupModalOpen && currentUser && (
        <GroupChatModal
          isOpen={isGroupModalOpen}
          onClose={() => setIsGroupModalOpen(false)}
          users={users}
          currentUser={currentUser}
          onCreate={async (name: string, userIds: string[]) => {
            try {
              const newChat = await apiService.createChat({ name, type: 'GROUP', memberIds: userIds });
              addChat(newChat);
              setSelectedChat(newChat);
              setIsGroupModalOpen(false);
              onChatSelected?.();
            } catch (err) {
              console.error('Error creating group chat:', err);
              alert('Failed to create group chat. Please try again.');
            }
          }}
        />
      )}
    </div>
  );
}
