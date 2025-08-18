import React, { useState, useRef, useEffect } from "react";
import { Send, Code, Smile, X, Reply, UserPlus, Search, Check, XCircle } from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { Message } from "@/types";
import { apiService } from "@/services/api";
import MessageComponent from "./Message";
import MessageInput from "./MessageInput";
import CodeEditor from "./CodeEditor";

interface ChatAreaProps {
  replyingTo: Message | null;
  onSendMessage: (text: string, type?: string, attachment?: any) => void;
  onSendCodeSnippet: (code: string, language: string, filename?: string) => void;
  onTyping: (isTyping: boolean) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReplyToMessage: (message: Message) => void;
  onCancelReply: () => void;
}

export default function ChatArea({
  replyingTo,
  onSendMessage,
  onSendCodeSnippet,
  onTyping,
  onDeleteMessage,
  onReplyToMessage,
  onCancelReply,
}: ChatAreaProps) {
  const { selectedChat, currentUser, messages, typingUsers, deleteMessage, users } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chatMessages = selectedChat ? messages[selectedChat.id] || [] : [];
  const isGroup = selectedChat?.type === 'GROUP';
  const otherUser = !isGroup
    ? selectedChat?.members.find((member) => member.user.id !== currentUser?.id)?.user
    : undefined;
  const liveOtherUser = otherUser
    ? (users.find((u) => u.id === otherUser.id) || otherUser)
    : null;
  const chatTypingUsers = selectedChat
    ? Array.from(typingUsers[selectedChat.id] || new Set())
    : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleFileUpload = async (file: File) => {
    try {
      // Check file size (100MB limit)
      const MAX_FILE_SIZE = 100 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size exceeds the 100MB limit');
      }

      // Check file type
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'application/zip',
        'application/x-rar-compressed'
      ];
      
      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(jpe?g|png|gif|pdf|docx?|xlsx?|txt|zip|rar)$/i)) {
        throw new Error('File type not allowed');
      }

      const formData = new FormData();
      formData.append('file', file);
      
      if (selectedChat?.id) {
        formData.append('chatId', selectedChat.id);
      }
      
      // Upload the file 
      const response = await fetch('/api/upload/chat-file', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${apiService.getToken() || ''}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const { data } = await response.json();
      
      // Normalize attachment for downstream usage
      const attachment = {
        url: data.url,
        originalName: data.originalName,
        mimeType: data.type,
        size: data.size,
        thumbnail: null as string | null,
        // keep extra fields in case UI needs them
        path: data.path,
      };
      
      // Send a message with the file attachment
      onSendMessage(attachment.originalName, 'file', attachment);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload file');
    }
  };
  
  const handleTyping = (isTyping: boolean) => {
    onTyping(isTyping);
  };

  const handleSendMessage = (text: string, type: string = 'text', attachment?: any) => {
    if (text.trim() || type === 'file') {
      onSendMessage(text, type, attachment);
    }
  };

  const handleSendCode = (code: string, language: string, filename?: string) => {
    if (code.trim()) {
      onSendCodeSnippet(code, language, filename);
      setShowCodeInput(false);
    }
  };

  const isGroupOwner = isGroup && !!selectedChat?.members.find(m => m.user.id === currentUser?.id && m.role === 'OWNER');

  const handleChangeGroupAvatarClick = () => {
    if (!isGroupOwner) return;
    fileInputRef.current?.click();
  };

  const handleGroupAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;
    try {
      const upload = await apiService.uploadChatFile(file);
      const url = upload?.url || upload?.data?.url;
      if (!url) throw new Error('Upload failed: missing URL');
      const updated = await apiService.updateChat(selectedChat.id, { avatar: url });
      const st = useChatStore.getState();
      const newChats = st.chats.map((c: any) => (c.id === updated.id ? updated : c));
      st.setChats(newChats);
      st.setSelectedChat(updated);
    } catch (err) {
      console.error('Failed to update group avatar', err);
      alert('Failed to update group avatar');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Add members modal state
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const toggleUserSelect = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSearchUsers = async (q: string) => {
    setSearchQuery(q);
    if (!q || q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      const results = await apiService.searchUsers(q, 20);
      const existingIds = new Set((selectedChat?.members || []).map((m) => m.user.id));
      setSearchResults(results.filter((u) => !existingIds.has(u.id)));
    } catch (e) {
      console.error('User search failed', e);
    } finally {
      setSearching(false);
    }
  };

  const handleAddMembersSubmit = async () => {
    if (!selectedChat || selectedUserIds.length === 0) return;
    try {
      const updated = await apiService.addChatMembers(selectedChat.id, selectedUserIds);
      const st = useChatStore.getState();
      // Update chats and selectedChat
      const newChats = st.chats.map((c: any) => (c.id === updated.id ? updated : c));
      st.setChats(newChats);
      st.setSelectedChat(updated);
      // Reset modal state
      setSelectedUserIds([]);
      setSearchQuery("");
      setSearchResults([]);
      setShowAddMembers(false);
    } catch (e: any) {
      console.error('Failed to add members', e);
      alert(e?.message || 'Failed to add members');
    }
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-200 mb-2">
            Select a chat to start messaging
          </h3>
          <p className="text-gray-400">
            Choose a chat from the sidebar or search for a user/group
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center space-x-3">
          {isGroup ? (
            <div className="relative">
              <img
                src={
                  selectedChat.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedChat.name || 'Group')}&background=10b981&color=ffffff&size=128&rounded=true`
                }
                alt={selectedChat.name || 'Group'}
                className="w-10 h-10 rounded-full"
              />
              {isGroupOwner && (
                <button
                  onClick={handleChangeGroupAvatarClick}
                  className="absolute -bottom-1 -right-1 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded-full border border-gray-600 hover:bg-gray-700"
                  title="Change group avatar"
                >
                  Edit
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleGroupAvatarSelected} />
            </div>
          ) : (
            liveOtherUser && (
              <img
                src={
                  liveOtherUser.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(liveOtherUser.username)}&background=3b82f6&color=ffffff&size=128&rounded=true`
                }
                alt={liveOtherUser.username}
                className="w-10 h-10 rounded-full"
              />
            )
          )}
          <div>
            <h2 className="text-lg font-semibold text-gray-100">
              {isGroup ? (selectedChat.name || 'Untitled Group') : (liveOtherUser?.username || '')}
            </h2>
            <p className="text-sm text-gray-400">
              {isGroup
                ? `${selectedChat.members.length} member${selectedChat.members.length === 1 ? '' : 's'}`
                : (liveOtherUser?.status === 'online' ? 'Online' : `Last seen ${liveOtherUser?.lastSeen}`)}
            </p>
            {isGroup && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedChat.members.slice(0, 8).map((m) => (
                  <div
                    key={m.id}
                    className="inline-flex items-center px-2 py-1 rounded-full bg-gray-700/60 border border-gray-600 text-xs text-gray-200 max-w-[180px]"
                    title={m.user.username}
                  >
                    <img
                      src={m.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.user.username)}&size=64`}
                      alt={m.user.username}
                      className="w-4 h-4 rounded-full mr-1.5"
                    />
                    <span className="truncate">{m.user.username}</span>
                    {m.role === 'OWNER' && (
                      <span className="ml-1 px-1 rounded bg-amber-600 text-[10px] uppercase tracking-wide">Owner</span>
                    )}
                  </div>
                ))}
                {selectedChat.members.length > 8 && (
                  <div className="inline-flex items-center px-2 py-1 rounded-full bg-gray-700/60 border border-gray-600 text-xs text-gray-300">
                    +{selectedChat.members.length - 8} more
                  </div>
                )}
                {isGroupOwner && (
                  <button
                    onClick={() => setShowAddMembers(true)}
                    className="inline-flex items-center px-2 py-1 rounded-full bg-blue-600/20 border border-blue-500/40 text-xs text-blue-200 hover:bg-blue-600/30"
                    title="Add members"
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1" /> Add
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="bg-gray-700 border-b border-gray-600 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Reply className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-300">
                Replying to{" "}
                {replyingTo.sender.id === currentUser?.id
                  ? "your message"
                  : (isGroup ? 'this message' : (liveOtherUser?.username || 'the user'))}
              </span>
            </div>
            <button
              onClick={onCancelReply}
              className="p-1 text-gray-400 hover:text-gray-200 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 pl-6 border-l-2 border-blue-400">
            <p className="text-sm text-gray-400 truncate">{replyingTo.content}</p>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.map((message) => (
          <MessageComponent
            key={message.id}
            message={message}
            currentUser={currentUser!}
            otherUser={liveOtherUser}
            onDeleteMessage={onDeleteMessage || ((messageId) => deleteMessage(messageId, false))}
            onReplyToMessage={onReplyToMessage}
          />
        ))}

        {/* Typing Indicator */}
        {chatTypingUsers.length > 0 && (
          <div className="flex items-center space-x-2">
            {!isGroup && liveOtherUser && (
              <img
                src={
                  liveOtherUser.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(liveOtherUser.username)}&background=3b82f6&color=ffffff&size=128&rounded=true`
                }
                alt={liveOtherUser.username}
                className="w-6 h-6 rounded-full"
              />
            )}
            <div className="flex items-center space-x-1 text-sm text-gray-400">
              <div className="flex space-x-1">
                {chatTypingUsers.slice(0, 3).map((username, index) => (
                  <span key={index} className="text-blue-400">
                    {username}
                  </span>
                ))}
              </div>
              <span>is typing...</span>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        {showCodeInput ? (
          <CodeEditor
            onSendCode={handleSendCode}
            onClose={() => setShowCodeInput(false)}
            initialCode=""
          />
        ) : (
          <div className="flex items-center space-x-2">
            <MessageInput
              onSendMessage={handleSendMessage}
              onFileUpload={handleFileUpload}
              onTyping={handleTyping}
              placeholder={
                replyingTo
                  ? `Reply to ${
                      replyingTo.sender.id === currentUser?.id
                        ? "your message"
                        : (isGroup ? 'this message' : (liveOtherUser?.username || 'the user'))
                    }...`
                  : (isGroup ? `Message ${selectedChat.name || 'the group'}` : `Message ${liveOtherUser?.username || '...'}`)
              }
            />

            <button
              onClick={() => setShowCodeInput(true)}
              className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
              title="Send code snippet"
            >
              <Code className="w-5 h-5" />
            </button>

            <button
              className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
              title="Emoji picker (coming soon)"
            >
              <Smile className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Add Members Modal */}
      {showAddMembers && isGroupOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddMembers(false)} />
          <div className="relative bg-gray-800 border border-gray-700 rounded-lg w-full max-w-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-100 font-semibold">Add members</h3>
              <button className="text-gray-400 hover:text-gray-200" onClick={() => setShowAddMembers(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center bg-gray-700 rounded px-2 py-1">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
                className="flex-1 bg-transparent outline-none px-2 text-sm text-gray-200 placeholder-gray-400"
                placeholder="Search users by username"
              />
            </div>
            <div className="mt-3 max-h-60 overflow-y-auto space-y-2">
              {searching && <div className="text-sm text-gray-400">Searching...</div>}
              {!searching && searchQuery && searchResults.length === 0 && (
                <div className="text-sm text-gray-400">No users found</div>
              )}
              {searchResults.map((u) => {
                const selected = selectedUserIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => toggleUserSelect(u.id)}
                    className={`w-full flex items-center justify-between px-2 py-2 rounded border ${selected ? 'bg-blue-700/30 border-blue-500/50' : 'bg-gray-700/40 border-gray-600 hover:bg-gray-700'}`}
                  >
                    <div className="flex items-center gap-2">
                      <img src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&size=64`} alt={u.username} className="w-6 h-6 rounded-full" />
                      <div className="text-left">
                        <div className="text-sm text-gray-100">{u.username}</div>
                        <div className="text-xs text-gray-400">{u.status || 'offline'}</div>
                      </div>
                    </div>
                    {selected ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-transparent" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowAddMembers(false)}
                className="px-3 py-1.5 rounded bg-gray-700 text-gray-200 hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMembersSubmit}
                disabled={selectedUserIds.length === 0}
                className="px-3 py-1.5 rounded bg-blue-600 text-white disabled:bg-blue-600/50"
              >
                Add {selectedUserIds.length > 0 ? `(${selectedUserIds.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
