import { useState, useRef, useEffect } from "react";
import { Send, Code, Smile, MoreVertical, Trash2 } from "lucide-react";
import Message from "./Message";
import MessageInput from "./MessageInput";

export default function ChatArea({
  messages,
  currentUser,
  otherUser,
  conversationId,
  onSendMessage,
  onSendCodeSnippet,
  onTyping,
  onDeleteMessage,
  typingUsers,
}) {
  const messagesEndRef = useRef(null);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [showMessageMenu, setShowMessageMenu] = useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (text) => {
    if (text.trim()) {
      onSendMessage(text);
    }
  };

  const handleSendCode = (code, language) => {
    if (code.trim()) {
      onSendCodeSnippet(code, language);
      setShowCodeInput(false);
    }
  };

  const handleDeleteMessage = (messageId) => {
    onDeleteMessage(messageId);
    setShowMessageMenu(null);
  };

  const formatMessageText = (text) => {
    // Basic mention highlighting
    return text.replace(
      /@(\w+)/g,
      '<span class="text-blue-400 font-medium">@$1</span>'
    );
  };

  if (!otherUser) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-steel-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-steel-400" />
          </div>
          <h3 className="text-lg font-medium text-steel-200 mb-2">
            No conversation selected
          </h3>
          <p className="text-steel-400">Select a user to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-steel-800 border-b border-steel-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img
                src={otherUser.avatar}
                alt={otherUser.username}
                className="w-10 h-10 rounded-full"
              />
              <div
                className={`w-3 h-3 absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-steel-800 ${
                  otherUser.isOnline ? "bg-green-500" : "bg-steel-500"
                }`}
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-steel-100">
                {otherUser.username}
              </h2>
              <p className="text-sm text-steel-400">
                {otherUser.isOnline
                  ? "Online"
                  : `Last seen ${new Date(
                      otherUser.lastSeen
                    ).toLocaleTimeString()}`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {typingUsers.length > 0 && (
              <div className="flex items-center space-x-1 text-sm text-steel-400">
                <div className="flex space-x-1">
                  {typingUsers.slice(0, 3).map((user, index) => (
                    <span key={index} className="text-blue-400">
                      {user}
                    </span>
                  ))}
                </div>
                <span>is typing...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-steel-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-steel-400" />
            </div>
            <h3 className="text-lg font-medium text-steel-200 mb-2">
              Start a conversation with {otherUser.username}
            </h3>
            <p className="text-steel-400">Send your first message!</p>
          </div>
        ) : (
          messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              isOwn={currentUser && message.senderId === currentUser.id}
              otherUser={otherUser}
              onDelete={handleDeleteMessage}
              showMenu={showMessageMenu === message.id}
              onToggleMenu={() =>
                setShowMessageMenu(
                  showMessageMenu === message.id ? null : message.id
                )
              }
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-steel-800 border-t border-steel-700 p-4">
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
              placeholder={`Message ${otherUser.username}...`}
            />

            <button
              onClick={() => setShowCodeInput(true)}
              className="p-2 text-steel-400 hover:text-steel-200 hover:bg-steel-700 rounded-lg transition-colors"
              title="Send code snippet"
            >
              <Code className="w-5 h-5" />
            </button>

            <button
              className="p-2 text-steel-400 hover:text-steel-200 hover:bg-steel-700 rounded-lg transition-colors"
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
