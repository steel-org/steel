import React, { useState } from "react";
import {
  LogOut,
  Users as UsersIcon,
  Settings as SettingsIcon,
  X,
  User as UserIcon,
} from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { apiService } from "@/services/api";
import GroupChatModal from "./GroupChatModal";
import ProfileModal from "./ProfileModal";
import {
  getBgNotifsEnabled,
  setBgNotifsEnabled,
  ensureNotificationPermission,
  registerSW,
  unregisterSW,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/services/sw";

interface SettingsProps {
  onLogout: () => void;
  variant?: "popover" | "page";
}

export default function Settings({
  onLogout,
  variant = "popover",
}: SettingsProps) {
  const { currentUser, users, addChat, setSelectedChat } = useChatStore();
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [bgEnabled, setBgEnabled] = useState<boolean>(getBgNotifsEnabled());
  const [isErrorSet, setIsError] = useState(false);

  const isPage = variant === "page";

  const handleCreateGroup = async (name: string, userIds: string[]) => {
    try {
      const newChat = await apiService.createChat({
        name,
        type: "GROUP",
        memberIds: userIds,
      });

      addChat(newChat);
      setSelectedChat(newChat);
      setIsGroupModalOpen(false);
    } catch (error) {
      console.error("Error creating group chat:", error);
      alert(
        "Failed to create group chat. Please try again or contact support."
      );
    }
  };

  if (!isPage && !isSettingsOpen) {
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
    <div
      className={`${
        isPage
          ? "relative z-0"
          : "fixed inset-x-3 bottom-3 sm:inset-auto sm:right-4 sm:bottom-4 z-50 pb-[env(safe-area-inset-bottom)]"
      }`}
    >
      <div
        className={`${
          isPage
            ? "bg-transparent border-0 w-full"
            : "bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden w-[92vw] max-w-sm sm:w-80 max-h-[80vh] overflow-auto"
        }`}
      >
        {/* Header */}
        <div
          className={`${
            isPage
              ? "hidden"
              : "p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800 z-10"
          }`}
        >
          <h3 className="font-medium text-gray-100">Settings</h3>
          {!isPage && (
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* User Profile */}
        <div
          className={`${
            isPage ? "p-0 border-0" : "p-4 border-b border-gray-700"
          }`}
        >
          {isPage && (
            <h2 className="text-xl font-semibold text-white mb-4">Profile</h2>
          )}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img
                src={
                  currentUser?.avatar
                    ? currentUser.avatar
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        currentUser?.username || "User"
                      )}&background=10b981&color=ffffff&size=128&rounded=true`
                }
                alt={currentUser?.username || "User"}
                className="w-12 h-12 sm:w-10 sm:h-10 rounded-full"
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-100">
                {currentUser?.username || "User"}
              </p>
              <p className="text-xs text-gray-400">Online</p>
            </div>
          </div>
        </div>

        {/* Settings Options */}
        <div className={`${isPage ? "mt-6" : "py-2"}`}>
          <button
            onClick={() => {
              setIsProfileModalOpen(true);
            }}
            className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-3"
          >
            <UserIcon size={18} className="text-gray-400" />
            <span>Profile</span>
          </button>

          {/* Background notifications toggle */}
          <div className="w-full px-4 py-3 text-sm text-gray-300 flex items-center justify-between">
            <span>Background notifications</span>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={bgEnabled}
                onChange={async (e) => {
                  const next = e.target.checked;
                  try {
                    if (next) {
                      const perm = await ensureNotificationPermission();
                      if (perm !== "granted") {
                        alert(
                          "Enable notifications in your browser to use background notifications."
                        );
                        e.target.checked = false;
                        return;
                      }
                      setBgNotifsEnabled(true);
                      setBgEnabled(true);
                      await registerSW();
                      try {
                        await subscribeToPush();
                        setIsError(false);
                      } catch (subErr) {
                        console.warn("Push subscription failed", subErr);
                        alert("Failed to subscribe for push notifications.");
                        setIsError(true);
                        setBgEnabled(false);
                      }
                    } else {
                      setBgNotifsEnabled(false);
                      setBgEnabled(false);
                      setIsError(true);
                      try {
                        await unsubscribeFromPush();
                      } catch (unsubErr) {
                        console.warn("Push unsubscription failed", unsubErr);
                      } finally {
                        await unregisterSW();
                      }
                    }
                  } catch (err) {
                    console.warn(
                      "Failed to update background notifications",
                      err
                    );
                    setBgEnabled(false);
                    setIsError(true);
                  }
                }}
              />

              <div
                className={`w-10 h-5 rounded-full relative transition-colors
               ${
                 isErrorSet
                   ? "bg-red-500"
                   : bgEnabled
                   ? "bg-blue-600"
                   : "bg-gray-600"
               }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300
                 ${bgEnabled ? "right-0.5" : "left-0.5"}`}
                />
              </div>
            </label>
          </div>
        </div>

        {/* Logout */}
        <div
          className={`${
            isPage
              ? "mt-6 pt-4 border-t border-gray-800"
              : "p-2 border-t border-gray-700"
          }`}
        >
          <button
            onClick={() => {
              onLogout();
              if (!isPage) setIsSettingsOpen(false);
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
            console.log("Edit profile clicked");
          }}
        />
      )}

      {isGroupModalOpen && currentUser && (
        <GroupChatModal
          isOpen={isGroupModalOpen}
          onClose={() => setIsGroupModalOpen(false)}
          users={users}
          currentUser={currentUser}
          onCreate={handleCreateGroup}
        />
      )}
    </div>
  );
}
