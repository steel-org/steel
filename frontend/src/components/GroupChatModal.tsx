import React, { useState } from 'react';
import { User } from '@/types';

interface GroupChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUser: User;
  onCreate: (name: string, userIds: string[]) => void;
}

export default function GroupChatModal({ 
  isOpen, 
  onClose, 
  users, 
  currentUser,
  onCreate 
}: GroupChatModalProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  if (!isOpen) return null;

  const availableUsers = users.filter(user => 
    user.id !== currentUser.id && 
    !selectedUsers.includes(user.id)
  );

  const handleUserSelect = (userId: string) => {
    setSelectedUsers(prev => [...prev, userId]);
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(id => id !== userId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (groupName.trim() && selectedUsers.length > 0) {
      onCreate(groupName, selectedUsers);
      setGroupName('');
      setSelectedUsers([]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Create Group Chat</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 text-white"
              placeholder="Enter group name"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Add Members</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedUsers.map(userId => {
                const user = users.find(u => u.id === userId);
                return user ? (
                  <div key={userId} className="flex items-center bg-blue-600 rounded-full px-3 py-1 text-sm">
                    <span>{user.username}</span>
                    <button 
                      type="button" 
                      onClick={() => removeUser(userId)}
                      className="ml-2"
                    >
                      ×
                    </button>
                  </div>
                ) : null;
              })}
            </div>
            
            <select
              value=""
              onChange={(e) => {
                const userId = e.target.value;
                if (userId) {
                  handleUserSelect(userId);
                  e.target.value = '';
                }
              }}
              className="w-full p-2 rounded bg-gray-700 text-white"
            >
              <option value="">Select a user to add</option>
              {availableUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.username} {user.status === 'online' ? '🟢' : '⚪'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!groupName.trim() || selectedUsers.length === 0}
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
            >
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
