
import React, { useState, useRef, useEffect } from 'react';
import { Send, Code, Smile, X, Reply } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { Message } from '@/types';
import MessageComponent from './Message';
import MessageInput from './MessageInput';
import CodeInput from './CodeInput';

interface ChatAreaProps {
  replyingTo: Message | null;
  onSendMessage: (text: string, type?: string) => void;
  onSendCodeSnippet: (code: string, language: string) => void;
  onTyping: (isTyping: boolean) => void;
  onDeleteMessage: (messageId: string) => void;
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
  const { selectedChat, currentUser, messages, typingUsers } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showCodeInput, setShowCodeInput] = useState(false);

  const chatMessages = selectedChat ? messages[selectedChat.id] || [] : [];
  const otherUser = selectedChat?.participants.find(p => p.id !== currentUser?.id);
  const chatTypingUsers = selectedChat ? Array.from(typingUsers[selectedChat.id] || new Set()) : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSendMessage = (text: string) => {
    if (text.trim()) {
      onSendMessage(text);
    }
  };

  const handleSendCode = (code: string, language: string) => {
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
            src={otherUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.username}`}
            alt={otherUser.username}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <h2 className="text-lg font-semibold text-gray-100">{otherUser.username}</h2>
            <p className="text-sm text-gray-400">
              {otherUser.isOnline ? 'Online' : `Last seen ${otherUser.lastSeen}`}
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
                Replying to {replyingTo.senderId === currentUser?.id ? 'yourself' : otherUser.username}
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
            <p className="text-sm text-gray-400 truncate">{replyingTo.text}</p>
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
            onDeleteMessage={onDeleteMessage}
            onReplyToMessage={onReplyToMessage}
          />
        ))}
        
        {/* Typing Indicator */}
        {chatTypingUsers.length > 0 && (
          <div className="flex items-center space-x-2">
            <img
              src={otherUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.username}`}
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
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        {showCodeInput ? (
          <CodeInput
            onSend={handleSendCode}
            onCancel={() => setShowCodeInput(false)}
          />
        ) : (
          <div className="flex items-center space-x-2">
            <MessageInput
              onSend={handleSendMessage}
              onTyping={onTyping}
              placeholder={
                replyingTo
                  ? `Reply to ${
                      replyingTo.senderId === currentUser?.id
                        ? 'your message'
                        : otherUser.username
                    }...`
                  : `Message ${otherUser.username}...`
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
