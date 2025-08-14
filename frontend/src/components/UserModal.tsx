import React, { useState, useRef } from "react";
import {
  X,
  Mail,
  Calendar,
  MapPin,
  Link as LinkIcon,
  Upload,
  User as UserIcon,
  Camera,
} from "lucide-react";
import { User } from "../types";
import { useChatStore } from "@/stores/chatStore";

interface UserModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

const UserModal: React.FC<UserModalProps> = ({ user, isOpen, onClose }) => {
  if (!isOpen) return null;

  const [username, setUsername] = useState(user.username || "");
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [status, setStatus] = useState(user.status || "online");
  const [avatar, setAvatar] = useState(user.avatar || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bio, setBio] = useState(user.bio || "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatJoinDate = (date: string | Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  };

  const generateAvatar = () => {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FECA57",
      "#FF9FF3",
      "#54A0FF",
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const initials = (displayName || username).slice(0, 2).toUpperCase();

    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 100, 100);
      ctx.fillStyle = "white";
      ctx.font = "36px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initials, 50, 50);
    }

    return canvas.toDataURL();
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setAvatarFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatar(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatarToServer = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/upload/avatar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("steel-token")}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      return data.avatarUrl;
    } catch (error) {
      console.error("Avatar upload failed:", error);
      throw error;
    }
  };

  const onSave = async () => {
    setIsUploading(true);

    try {
      let finalAvatar = avatar;

      if (avatarFile) {
        finalAvatar = await uploadAvatarToServer(avatarFile);
      } else if (!avatar) {
        finalAvatar = generateAvatar();
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("steel-token")}`,
          },
          body: JSON.stringify({
            username,
            displayName,
            status,
            avatar: finalAvatar,
            bio,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update profile");
      }

      // Update the current user in the store
      useChatStore.getState().setCurrentUser(result.data);
      
      // Show success message
      alert("Profile updated successfully");
      onClose();
    } catch (error) {
      console.error("Failed to save user profile:", error);
      alert(error instanceof Error ? error.message : "Failed to save profile. Please try again.");
    } finally {
      setIsUploading(false);
    }
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
            <div className="flex flex-col items-center space-y-2">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-8 h-8 text-gray-600" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Camera className="w-6 h-6 text-white" />
                </button>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center space-x-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload</span>
                </button>
                <button
                  onClick={() => setAvatar(generateAvatar())}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Generate
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-1 mt-4">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="text-center w-full border-b-2 border-transparent focus:border-blue-500 outline-none"
                placeholder="Username"
              />
            </h3>
            {user.displayName && user.displayName !== user.username && (
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="text-center text-gray-600 mb-2 w-full border-b-2 border-transparent focus:border-blue-500 outline-none"
                placeholder="Display Name"
              />
            )}
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  status === "online"
                    ? "bg-green-500"
                    : status === "away"
                    ? "bg-yellow-500"
                    : "bg-gray-500"
                }`}
              />
              <span className="text-sm text-gray-600 capitalize">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "online" | "offline" | "away" | "busy")}
                  className="bg-transparent capitalize outline-none cursor-pointer"
                >
                  <option value="online">Online</option>
                  <option value="away">Away</option>
                  <option value="offline">Offline</option>
                </select>
              </span>
            </div>
          </div>

          {/* Bio */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">About</h4>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-md resize-none text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Write something about yourself..."
            />
          </div>

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
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Roles
              </h4>
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
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={isUploading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserModal;
