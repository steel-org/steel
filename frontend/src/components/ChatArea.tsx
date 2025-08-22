import React, { useState, useRef, useEffect, useMemo } from "react";
import { isToday, isYesterday, format, differenceInCalendarDays } from 'date-fns';
import { Send, Code, Smile, X, Reply, UserPlus, Search, Check, XCircle, ArrowLeft } from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { Message } from "@/types";
import { apiService } from "@/services/api";
import { wsService } from "@/services/websocket";
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
  onBack?: () => void;
}

export default function ChatArea({
  replyingTo,
  onSendMessage,
  onSendCodeSnippet,
  onTyping,
  onDeleteMessage,
  onReplyToMessage,
  onCancelReply,
  onBack,
}: ChatAreaProps) {
  const { selectedChat, currentUser, messages, typingUsers, deleteMessage, users, editMessage } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const chatMessages = selectedChat ? (messages[selectedChat.id] || []) : [];
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

  // Show Status
  const [showOfflinePulse, setShowOfflinePulse] = useState(false);
  const prevStatusRef = useRef<string | undefined>(liveOtherUser?.status);
  useEffect(() => {
    const prev = prevStatusRef.current;
    const cur = liveOtherUser?.status;
    if (prev === 'online' && cur === 'offline') {
      setShowOfflinePulse(true);
      const t = setTimeout(() => setShowOfflinePulse(false), 2000);
      return () => clearTimeout(t);
    }
    prevStatusRef.current = cur;
  }, [liveOtherUser?.status]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatLastSeen = (lastSeen?: string | Date) => {
    if (!lastSeen) return 'offline';
    const d = new Date(lastSeen);
    const now = new Date();
    if (isToday(d)) return `today at ${format(d, 'HH:mm')}`;
    if (isYesterday(d)) return `yesterday at ${format(d, 'HH:mm')}`;
    const daysDiff = differenceInCalendarDays(now, d);
    if (daysDiff < 7) return `${format(d, 'EEEE')} at ${format(d, 'HH:mm')}`; // e.g., Monday at 14:22
    return `${format(d, 'dd/MM/yy')} at ${format(d, 'HH:mm')}`;
  };

  const openProfile = () => setShowProfile(true);
  const closeProfile = () => setShowProfile(false);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Track viewport for mobile behaviors
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (isMobile && showCodeInput) setShowCodeInput(false);
  }, [isMobile, showCodeInput]);

  useEffect(() => {
    if (!selectedChat || !currentUser) return;
    const unreadIncoming = chatMessages
      .filter(m => m.sender?.id !== currentUser.id)
      .filter(m => (m.status || 'SENT').toUpperCase() !== 'READ')
      .map(m => m.id);
    if (unreadIncoming.length > 0 && wsService.isConnected()) {
      wsService.markMessagesRead(selectedChat.id, unreadIncoming);
    }
  }, [selectedChat?.id, chatMessages.length]);

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
        filename: data.originalName,
        mimeType: data.type,
        size: data.size,
        thumbnail: null as string | null,
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
      setSelectedUserIds([]);
      setSearchQuery("");
      setSearchResults([]);
      setShowAddMembers(false);
    } catch (e: any) {
      console.error('Failed to add members', e);
      alert(e?.message || 'Failed to add members');
    }
  };

  // Messages Calendar
  const grouped = useMemo(() => {
    const groups: { label: string; key: string; items: Message[] }[] = [];
    const byKey: Record<string, number> = {};
    const sorted = [...chatMessages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (const m of sorted) {
      const d = new Date(m.createdAt);
      const dayKey = format(d, 'yyyy-MM-dd');
      let label = '';
      if (isToday(d)) label = 'Today';
      else if (isYesterday(d)) label = 'Yesterday';
      else {
        const daysDiff = differenceInCalendarDays(new Date(), d);
        if (daysDiff < 7) {
          label = format(d, 'EEEE');
        } else {
          label = format(d, 'MMMM d'); 
        }
      }
      if (byKey[dayKey] === undefined) {
        byKey[dayKey] = groups.length;
        groups.push({ label, key: dayKey, items: [m] });
      } else {
        groups[byKey[dayKey]].items.push(m);
      }
    }
    return groups;
  }, [chatMessages]);

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
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Chat Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center space-x-3">
          {/* Mobile back button */}
          <button
            className="md:hidden mr-2 p-1.5 rounded hover:bg-gray-700 text-gray-200"
            onClick={() => onBack?.()}
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3 cursor-pointer" onClick={openProfile}>
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
                : (liveOtherUser?.status === 'online'
                    ? 'Online'
                    : (showOfflinePulse
                        ? 'Offline'
                        : `Last seen ${formatLastSeen(liveOtherUser?.lastSeen as any)}`))}
            </p>
          </div>
          </div>
        </div>
      </div>

      {/* Profile Modal (DM or Group) */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={closeProfile} />
          <div className="relative bg-gray-800 border border-gray-700 rounded-lg w-full max-w-lg p-5">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-gray-100 font-semibold">{isGroup ? 'Group info' : 'Contact info'}</h3>
              <button className="text-gray-400 hover:text-gray-200" onClick={closeProfile}>
                <X className="w-5 h-5" />
              </button>
            </div>
            {isGroup ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={selectedChat.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedChat.name || 'Group')}&background=10b981&color=ffffff&size=256&rounded=true`}
                    alt={selectedChat.name || 'Group'}
                    className="w-16 h-16 rounded-full"
                  />
                  <div>
                    <div className="text-gray-100 text-lg font-semibold">{selectedChat.name || 'Untitled Group'}</div>
                    <div className="text-gray-400 text-sm">{selectedChat.members.length} member{selectedChat.members.length === 1 ? '' : 's'}</div>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-gray-300 text-sm mb-2">Members</div>
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {selectedChat.members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between bg-gray-700/40 border border-gray-600 rounded px-2 py-2">
                        <div className="flex items-center gap-2">
                          <img src={m.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.user.username)}&size=64`} alt={m.user.username} className="w-6 h-6 rounded-full" />
                          <div className="text-gray-200 text-sm">{m.user.username}</div>
                        </div>
                        {m.role === 'OWNER' && (
                          <span className="ml-2 px-1 rounded bg-amber-600 text-[10px] uppercase tracking-wide">Owner</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {isGroupOwner && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setShowAddMembers(true)} className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm">Add members</button>
                  </div>
                )}
              </div>
            ) : (
              liveOtherUser && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src={liveOtherUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(liveOtherUser.username)}&background=3b82f6&color=ffffff&size=256&rounded=true`}
                      alt={liveOtherUser.username}
                      className="w-16 h-16 rounded-full"
                    />
                    <div>
                      <div className="text-gray-100 text-lg font-semibold">{liveOtherUser.username}</div>
                      <div className="text-gray-400 text-sm">{liveOtherUser.status === 'online' ? 'Online' : (showOfflinePulse ? 'Offline' : `Last seen ${formatLastSeen(liveOtherUser.lastSeen as any)}`)}</div>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

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
                  : (isGroup
                      ? (replyingTo.sender?.username || 'a member')
                      : (liveOtherUser?.username || 'the user'))}
              </span>
            </div>
            <button
              onClick={onCancelReply}
              className="p-1 text-gray-400 hover:text-gray-200 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2">
            <div className="flex items-start gap-2 bg-gray-800/70 border border-blue-500/30 rounded-md p-2">
              <div className="w-1 self-stretch rounded bg-blue-500/90" />
              <p className="text-sm text-gray-300 line-clamp-2 break-words">
                {replyingTo.content || 'Attachment'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="messages-container flex-1 overflow-y-auto p-4 space-y-4">
        {grouped.map((grp) => (
          <div key={grp.key} className="space-y-4">
            <div className="flex items-center justify-center">
              <span className="px-3 py-1 text-xs text-gray-200 bg-gray-700 rounded-full border border-gray-600">
                {grp.label}
              </span>
            </div>
            {grp.items.map((message) => (
              <MessageComponent
                key={message.id}
                message={message}
                currentUser={currentUser!}
                otherUser={liveOtherUser}
                isGroup={!!isGroup}
                onDeleteMessage={onDeleteMessage || ((messageId) => deleteMessage(messageId, false))}
                onReplyToMessage={onReplyToMessage}
                onEditMessage={(messageId, newContent) => {
                  if (!selectedChat) return;
                  editMessage(selectedChat.id, messageId, newContent);
                }}
                onReact={(messageId, reaction) => {
                  try { wsService.reactToMessage(messageId, reaction); } catch (e) { console.warn('reactToMessage failed', e); }
                }}
              />
            ))}
          </div>
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
        {showCodeInput && !isMobile ? (
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
                        : (isGroup
                            ? (replyingTo.sender?.username || 'a member')
                            : (liveOtherUser?.username || 'the user'))
                    }...`
                  : (isGroup ? `Message ${selectedChat.name || 'the group'}` : `Message ${liveOtherUser?.username || '...'}`)
              }
            />

            <button
              onClick={() => !isMobile && setShowCodeInput(true)}
              className="hidden md:inline-flex p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
              title="Send code snippet"
            >
              <Code className="w-5 h-5" />
            </button>

            <button
              className="hidden md:inline-flex p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
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
