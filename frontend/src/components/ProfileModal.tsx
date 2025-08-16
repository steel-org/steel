import React, { useState, useEffect } from 'react';
import { X, Mail, Calendar, MapPin, Link as LinkIcon, Edit2, Save, X as XIcon, User as UserIcon, Globe, MapPin as MapPinIcon, PenTool } from 'lucide-react';
import { User } from '@/types';
import { useChatStore } from '@/stores/chatStore';
import AvatarUpload from './AvatarUpload';

const formatLastSeen = (lastSeen?: string | Date): string => {
  if (!lastSeen) return 'Unknown';

  const lastSeenDate = new Date(lastSeen);
  if (isNaN(lastSeenDate.getTime())) return 'Unknown';
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  
  return `on ${lastSeenDate.toLocaleDateString()}`;
};

interface ProfileModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  isCurrentUser?: boolean;
  onEditProfile?: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  user: initialUser,
  isOpen,
  onClose,
  isCurrentUser = false,
  onEditProfile,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<User>({ ...initialUser });
  const { updateUser, currentUser } = useChatStore();

  useEffect(() => {
    setEditedUser({ ...initialUser });
  }, [initialUser]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedUser(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      if (currentUser) {
        await updateUser(currentUser.id, {
          displayName: editedUser.displayName,
          bio: editedUser.bio,
          location: editedUser.location,
          website: editedUser.website
        });
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleCancel = () => {
    setEditedUser({ ...initialUser });
    setIsEditing(false);
  };

  const formatJoinDate = (date: string | Date) => {
    if (!date) return 'Unknown';
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Profile' : isCurrentUser ? 'Your Profile' : 'User Profile'}
          </h2>
          <div className="flex items-center gap-2">
            {isEditing && isCurrentUser && (
              <button
                onClick={handleSave}
                className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                title="Save changes"
              >
                <Save size={20} />
              </button>
            )}
            <button
              onClick={isEditing ? handleCancel : onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              title={isEditing ? 'Cancel' : 'Close'}
            >
              {isEditing ? <XIcon size={20} /> : <X size={20} />}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Avatar and Basic Info */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative group">
              {isEditing && isCurrentUser ? (
                <AvatarUpload
                  currentAvatar={editedUser.avatar}
                  onAvatarUpdated={(avatarUrl: string) => {
                    setEditedUser(prev => ({ ...prev, avatar: avatarUrl }));
                  }}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mb-4">
                  {editedUser.avatar ? (
                    <img
                      src={editedUser.avatar}
                      alt={editedUser.displayName || editedUser.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-500 text-white flex items-center justify-center text-2xl font-bold">
                      {(editedUser.displayName || editedUser.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="w-full max-w-xs space-y-4">
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    name="displayName"
                    value={editedUser.displayName || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={editedUser.bio || ''}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tell others about yourself..."
                  />
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {editedUser.displayName || editedUser.username}
                </h3>
                {editedUser.displayName && (
                  <p className="text-gray-600 mb-2">@{editedUser.username}</p>
                )}
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      editedUser.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                    }`}
                  />
                  <span className="text-sm text-gray-600">
                    {editedUser.status === 'online' ? 'Online' : 'Offline'}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Bio - Show only when not editing and bio exists */}
          {!isEditing && editedUser.bio && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">About</h4>
              <p className="text-gray-700 whitespace-pre-line">{editedUser.bio}</p>
            </div>
          )}

          {/* Details */}
          <div className="space-y-4">
            {editedUser.email && (
              <div className="flex items-start space-x-3">
                <Mail size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm text-gray-500">Email</div>
                  <a
                    href={`mailto:${editedUser.email}`}
                    className="text-gray-700 hover:text-blue-600 hover:underline"
                  >
                    {editedUser.email}
                  </a>
                </div>
              </div>
            )}

            <div className="flex items-start space-x-3">
              <Calendar size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-gray-500">Member since</div>
                <div className="text-gray-700">
                  {formatJoinDate(editedUser.createdAt)}
                </div>
              </div>
            </div>

            {/* Last seen */}
            {editedUser.lastSeen && (
              <div className="flex items-start space-x-3">
                <Calendar size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm text-gray-500">Last seen</div>
                  <div className="text-gray-700">{formatLastSeen(editedUser.lastSeen)}</div>
                </div>
              </div>
            )}

            {isEditing ? (
              <div className="flex items-start space-x-3">
                <MapPinIcon size={18} className="text-gray-400 mt-2.5 flex-shrink-0" />
                <div className="flex-1">
                  <label htmlFor="location" className="block text-sm font-medium text-gray-500 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={editedUser.location || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your location"
                  />
                </div>
              </div>
            ) : editedUser.location ? (
              <div className="flex items-start space-x-3">
                <MapPin size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm text-gray-500">Location</div>
                  <div className="text-gray-700">{editedUser.location}</div>
                </div>
              </div>
            ) : null}

            {isEditing ? (
              <div className="flex items-start space-x-3">
                <Globe size={18} className="text-gray-400 mt-2.5 flex-shrink-0" />
                <div className="flex-1">
                  <label htmlFor="website" className="block text-sm font-medium text-gray-500 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    id="website"
                    name="website"
                    value={editedUser.website || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            ) : editedUser.website ? (
              <div className="flex items-start space-x-3">
                <LinkIcon size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm text-gray-500">Website</div>
                  <a
                    href={editedUser.website.startsWith('http') ? editedUser.website : `https://${editedUser.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline break-all"
                  >
                    {editedUser.website}
                  </a>
                </div>
              </div>
            ) : null}
          </div>

          {/* Roles/Badges */}
          {!isEditing && editedUser.roles && editedUser.roles.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Roles
              </h4>
              <div className="flex flex-wrap gap-2">
                {editedUser.roles.map((role, index) => (
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
          {!isEditing && (
            <div className="mt-6 grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {editedUser.messageCount || 0}
                </div>
                <div className="text-sm text-gray-600">Messages</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {editedUser.chatCount || 0}
                </div>
                <div className="text-sm text-gray-600">Chats</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isEditing && isCurrentUser && (
          <div className="px-6 py-4 bg-gray-50 rounded-b-lg border-t border-gray-200">
            <div className="flex justify-center">
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 flex items-center gap-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                <Edit2 size={16} />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer for other users - view only */}
        {!isCurrentUser && (
          <div className="px-6 py-4 bg-gray-50 rounded-b-lg border-t border-gray-200">
            <div className="flex justify-center">
              <p className="text-sm text-gray-500">Profile is view-only</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
