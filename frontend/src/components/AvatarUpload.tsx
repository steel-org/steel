import React, { useState, useRef } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { uploadAvatar } from '@/services/supabase';
import { useChatStore } from '@/stores/chatStore';
import { apiService } from '@/services/api';

interface AvatarUploadProps {
  currentAvatar?: string;
  onAvatarUpdated: (avatarUrl: string) => void;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatar,
  onAvatarUpdated
}) => {
  const { currentUser, updateUser } = useChatStore();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!currentUser) {
      alert('Please log in to upload avatar');
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      alert('Avatar size must be less than 2MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      // Upload to Supabase
      const avatarUrl = await uploadAvatar(file, currentUser.id);
      
      // Update backend database via API service
      await apiService.updateProfile({ avatar: avatarUrl });

      // Update local store
      updateUser(currentUser.id, { avatar: avatarUrl });
      onAvatarUpdated(avatarUrl);
      setPreview(null);
    } catch (error) {
      console.error('Avatar upload error:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      handleFileSelect(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative group">
      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
        {preview || currentAvatar ? (
          <img
            src={preview || currentAvatar}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-blue-500 text-white flex items-center justify-center text-2xl font-bold">
            {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
        )}
        
        {uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          </div>
        )}
      </div>
      
      <button
        onClick={triggerFileSelect}
        disabled={uploading}
        className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer disabled:cursor-not-allowed"
        title="Change avatar"
      >
        <Camera className="text-white" size={20} />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileInput}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
};

export default AvatarUpload;
