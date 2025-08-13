
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
    <div className="border-t border-gray-200 p-4 bg-white">
      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        <div className="flex-1">
          {isCodeMode ? (
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
              placeholder="Enter code..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              rows={4}
              disabled={disabled}
            />
          ) : (
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
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              disabled={disabled}
            />
          )}
        </div>
        
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => setIsCodeMode(!isCodeMode)}
            className={`p-2 rounded-lg transition-colors ${
              isCodeMode
                ? 'bg-blue-500 text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            title={isCodeMode ? 'Switch to text mode' : 'Switch to code mode'}
          >
            <Code size={20} />
          </button>
          
          <button
            type="button"
            onClick={triggerFileUpload}
            className="p-2 text-gray-500 rounded-lg hover:bg-gray-100 transition-colors"
            title="Attach file"
          >
            <Paperclip size={20} />
          </button>
          
          <button
            type="submit"
            disabled={!message.trim() || disabled}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Send message"
          >
            <Send size={20} />
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
