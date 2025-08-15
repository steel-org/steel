import React, { useState, useRef, useEffect } from "react";
import { Send, Code, Smile, X, Reply } from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { Message } from "@/types";
import MessageComponent from "./Message";
import MessageInput from "./MessageInput";
import CodeEditor from "./CodeEditor";

interface ChatAreaProps {
  replyingTo: Message | null;
  onSendMessage: (text: string, type?: string, attachment?: any) => void;
  onSendCodeSnippet: (code: string, language: string) => void;
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
  const { selectedChat, currentUser, messages, typingUsers, deleteMessage } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showCodeInput, setShowCodeInput] = useState(false);

  const chatMessages = selectedChat ? messages[selectedChat.id] || [] : [];
  const otherUser = selectedChat?.members.find(
    (member) => member.user.id !== currentUser?.id
  )?.user;
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
      
      // Use the API service to upload the file
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const { data: attachment } = await response.json();
      
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
      onSendCodeSnippet(code, language);
      setShowCodeInput(false);
    }
  };

  if (!selectedChat || !otherUser) {
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
            Select a user to start chatting
          </h3>
          <p className="text-gray-400">
            Choose someone from the sidebar to begin a conversation
            Or search for your preferred user
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
          <img
            src={
              otherUser.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.username)}&background=3b82f6&color=ffffff&size=128&rounded=true`
            }
            alt={otherUser.username}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <h2 className="text-lg font-semibold text-gray-100">
              {otherUser.username}
            </h2>
            <p className="text-sm text-gray-400">
              {otherUser.status === 'online' 
                ? 'Online' 
                : `Last seen ${otherUser.lastSeen}`}
            </p>
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
                  ? "yourself"
                  : otherUser.username}
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
            otherUser={otherUser}
            onDeleteMessage={onDeleteMessage || ((messageId) => deleteMessage(messageId, false))}
            onReplyToMessage={onReplyToMessage}
          />
        ))}

        {/* Typing Indicator */}
        {chatTypingUsers.length > 0 && (
          <div className="flex items-center space-x-2">
            <img
              src={
                otherUser.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.username)}&background=3b82f6&color=ffffff&size=128&rounded=true`
              }
              alt={otherUser.username}
              className="w-6 h-6 rounded-full"
            />
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
                        : otherUser?.username || 'the user'
                    }...`
                  : `Message ${otherUser?.username || '...'}`
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
    </div>
  );
}
