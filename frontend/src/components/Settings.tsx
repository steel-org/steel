import React, { useState } from 'react';
import { LogOut, Users as UsersIcon, Settings as SettingsIcon, X, User as UserIcon } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import GroupChatModal from './GroupChatModal';
import ProfileModal from './ProfileModal';

interface SettingsProps {
  onLogout: () => void;
}

export default function Settings({ onLogout }: SettingsProps) {
  const { currentUser, users } = useChatStore();
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (!isSettingsOpen) {
    return (
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="p-2 rounded-full hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
        title="Settings"
      >
        <SettingsIcon size={20} />
      </button>
    );
  }

  return (
    <div className="fixed right-4 bottom-4 z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden w-64">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="font-medium text-gray-100">Settings</h3>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Profile */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white">
                {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-100">{currentUser?.username || 'User'}</p>
              <p className="text-xs text-gray-400">Online</p>
            </div>
          </div>
        </div>

        {/* Settings Options */}
        <div className="py-2">
          <button
            onClick={() => {
              setIsProfileModalOpen(true);
              setIsSettingsOpen(false);
            }}
            className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-3"
          >
            <UserIcon size={18} className="text-gray-400" />
            <span>Profile</span>
          </button>

          <button
            onClick={() => {
              setIsGroupModalOpen(true);
              setIsSettingsOpen(false);
            }}
            className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-3"
          >
            <UsersIcon size={18} className="text-gray-400" />
            <span>New Group</span>
          </button>
        </div>

        {/* Logout */}
        <div className="p-2 border-t border-gray-700">
          <button
            onClick={() => {
              onLogout();
              setIsSettingsOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-900/20 rounded-md flex items-center space-x-3"
          >
            <LogOut size={18} className="text-red-400" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      {currentUser && isProfileModalOpen && (
        <ProfileModal
          user={currentUser}
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          isCurrentUser={true}
          onEditProfile={() => {
            console.log('Edit profile clicked');
          }}
        />
      )}



      {isGroupModalOpen && currentUser && (
        <GroupChatModal
          isOpen={isGroupModalOpen}
          onClose={() => setIsGroupModalOpen(false)}
          users={users}
          currentUser={currentUser}
          onCreate={() => setIsGroupModalOpen(false)}
        />
      )}
    </div>
  );
}
