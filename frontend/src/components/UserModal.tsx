
import React from 'react';
import { X, Mail, Calendar, MapPin, Link as LinkIcon } from 'lucide-react';
import { User } from '../types';

interface UserModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

const UserModal: React.FC<UserModalProps> = ({ user, isOpen, onClose }) => {
  if (!isOpen) return null;

  const formatJoinDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">User Profile</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Avatar and Basic Info */}
          <div className="flex flex-col items-center mb-6">
            <img
              src={user.avatar || '/default-avatar.png'}
              alt={user.username}
              className="w-24 h-24 rounded-full mb-4 border-4 border-gray-200"
            />
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {user.username}
            </h3>
            {user.displayName && user.displayName !== user.username && (
              <p className="text-gray-600 mb-2">{user.displayName}</p>
            )}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                user.status === 'online' ? 'bg-green-500' : 
                user.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
              }`} />
              <span className="text-sm text-gray-600 capitalize">
                {user.status || 'offline'}
              </span>
            </div>
          </div>

          {/* Bio */}
          {user.bio && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">About</h4>
              <p className="text-gray-700 leading-relaxed">{user.bio}</p>
            </div>
          )}

          {/* Details */}
          <div className="space-y-4">
            {user.email && (
              <div className="flex items-center space-x-3">
                <Mail size={18} className="text-gray-400" />
                <span className="text-gray-700">{user.email}</span>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <Calendar size={18} className="text-gray-400" />
              <span className="text-gray-700">
                Joined {formatJoinDate(user.createdAt)}
              </span>
            </div>

            {user.location && (
              <div className="flex items-center space-x-3">
                <MapPin size={18} className="text-gray-400" />
                <span className="text-gray-700">{user.location}</span>
              </div>
            )}

            {user.website && (
              <div className="flex items-center space-x-3">
                <LinkIcon size={18} className="text-gray-400" />
                <a
                  href={user.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  {user.website}
                </a>
              </div>
            )}
          </div>

          {/* Roles/Badges */}
          {user.roles && user.roles.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Roles</h4>
              <div className="flex flex-wrap gap-2">
                {user.roles.map((role, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="mt-6 grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {user.messageCount || 0}
              </div>
              <div className="text-sm text-gray-600">Messages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {user.chatCount || 0}
              </div>
              <div className="text-sm text-gray-600">Chats</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserModal;
