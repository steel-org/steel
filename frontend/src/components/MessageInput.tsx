
import React, { useState, useRef } from 'react';
import { Send, Paperclip, Code, Smile } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (content: string, type?: 'text' | 'code') => void;
  onFileUpload: (file: File) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onFileUpload,
  onTyping,
  disabled = false,
  placeholder = "Type a message..."
}) => {
  const [message, setMessage] = useState('');
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track typing state with debounce
  const typingTimeout = useRef<NodeJS.Timeout>();
  
  const handleTyping = (typing: boolean) => {
    if (onTyping) {
      onTyping(typing);
    }
    
    // Clear any existing timeout
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
    
    // Set a new timeout to stop typing after 2 seconds of inactivity
    if (typing) {
      typingTimeout.current = setTimeout(() => {
        if (onTyping) {
          onTyping(false);
        }
      }, 2000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim(), isCodeMode ? 'code' : 'text');
      setMessage('');
      setIsCodeMode(false);
      handleTyping(false); // Reset typing state after sending
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        <div className="flex-1">
          {isCodeMode ? (
            <div className="relative">
              <div className="absolute top-2 right-2 z-10 flex space-x-1">
                <button
                  type="button"
                  onClick={() => setIsCodeMode(false)}
                  className="p-1.5 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
                  title="Exit code mode"
                >
                  ×
                </button>
              </div>
              <textarea
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (e.target.value.trim()) {
                    handleTyping(true);
                  } else {
                    handleTyping(false);
                  }
                }}
                onKeyDown={handleKeyPress}
                placeholder="// Enter your code here..."
                className="w-full p-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg resize-none 
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm
                  bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                rows={6}
                disabled={disabled}
              />
            </div>
          ) : (
            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (e.target.value.trim()) {
                    handleTyping(true);
                  } else {
                    handleTyping(false);
                  }
                }}
                onKeyDown={handleKeyPress}
                placeholder={placeholder}
                className="w-full p-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg resize-none 
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                rows={Math.min(4, Math.max(1, message.split('\n').length))}
                disabled={disabled}
              />
              <div className="absolute right-2 bottom-2 flex space-x-1">
                <button
                  type="button"
                  onClick={triggerFileUpload}
                  className="p-1.5 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 rounded-full transition-colors"
                  disabled={disabled}
                  title="Attach file"
                >
                  <Paperclip size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsCodeMode(!isCodeMode)}
                  className={`p-1.5 rounded-full transition-colors ${
                    isCodeMode 
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' 
                      : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                  disabled={disabled}
                  title={isCodeMode ? 'Exit code mode' : 'Code block'}
                >
                  <Code size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="mb-1">
          <button
            type="submit"
            disabled={!message.trim() || disabled}
            className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none 
              focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors shadow-md hover:shadow-lg active:shadow-md"
            title="Send message"
          >
            <Send size={20} className="transform -rotate-45" />
          </button>
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        />
      </form>
    </div>
  );
};

export default MessageInput;
