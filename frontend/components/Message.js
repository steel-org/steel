import { useState } from "react";
import {
  Clock,
  Check,
  CheckCheck,
  MoreVertical,
  Trash2,
  Reply,
} from "lucide-react";

export default function Message({
  message,
  isOwn,
  otherUser,
  onDelete,
  onReply,
  showMenu,
  onToggleMenu,
}) {
  const [isHovered, setIsHovered] = useState(false);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "sent":
        return <Check className="w-3 h-3 text-steel-400" />;
      case "delivered":
        return <CheckCheck className="w-3 h-3 text-steel-400" />;
      case "read":
        return <CheckCheck className="w-3 h-3 text-blue-400" />;
      default:
        return null;
    }
  };

  const formatMessageText = (text) => {
    return text.replace(
      /@(\w+)/g,
      '<span class="text-blue-400 font-medium">@$1</span>'
    );
  };

  const renderReplyPreview = () => {
    if (!message.replyTo) return null;

    return (
      <div className="mb-2 p-2 bg-steel-700 rounded border-l-4 border-blue-500">
        <div className="flex items-center space-x-2 text-xs text-steel-400 mb-1">
          <Reply className="w-3 h-3" />
          <span>
            {message.replyTo.senderId === message.senderId
              ? "You"
              : otherUser?.username}
          </span>
        </div>
        <div className="text-sm text-steel-300 truncate">
          {message.replyTo.text}
        </div>
      </div>
    );
  };

  const renderMessageContent = () => {
    if (message.type === "code") {
      return (
        <div className="space-y-2">
          {renderReplyPreview()}
          <div className="flex items-center space-x-2 text-sm text-steel-400">
            <span className="font-mono text-xs px-2 py-1 bg-steel-700 rounded">
              {message.language || "code"}
            </span>
            <span>•</span>
            <span>{formatTime(message.timestamp)}</span>
          </div>
          <pre className="code-block">
            <code className={`code-${message.language || "javascript"}`}>
              {message.text}
            </code>
          </pre>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {renderReplyPreview()}
        <div
          className="text-steel-100 whitespace-pre-wrap"
          dangerouslySetInnerHTML={{
            __html: formatMessageText(message.text),
          }}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 text-xs text-steel-400">
            <Clock className="w-3 h-3" />
            <span>{formatTime(message.timestamp)}</span>
          </div>
          {isOwn && (
            <div className="flex items-center space-x-1">
              {getStatusIcon(message.status)}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`relative group max-w-2xl ${isOwn ? "order-2" : "order-1"}`}
      >
        {/* User avatar for other person's messages */}
        {!isOwn && otherUser && (
          <div className="absolute -left-12 top-0">
            <img
              src={otherUser.avatar}
              alt={otherUser.username}
              className="w-8 h-8 rounded-full"
            />
          </div>
        )}

        {/* Message bubble */}
        <div className={`chat-message ${isOwn ? "own" : "other"} relative`}>
          {/* Message menu for own messages */}
          {isOwn && isHovered && (
            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={onToggleMenu}
                className="p-1 bg-steel-700 rounded-full hover:bg-steel-600 transition-colors"
              >
                <MoreVertical className="w-3 h-3 text-steel-300" />
              </button>
            </div>
          )}

          {/* Message menu dropdown */}
          {isOwn && showMenu && (
            <div className="absolute -top-12 -right-2 bg-steel-700 rounded-lg shadow-lg border border-steel-600 z-10">
              <button
                onClick={() => onReply(message)}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-blue-400 hover:bg-steel-600 rounded-t-lg w-full"
              >
                <Reply className="w-4 h-4" />
                <span>Reply</span>
              </button>
              <button
                onClick={() => onDelete(message.id)}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-red-400 hover:bg-steel-600 rounded-b-lg w-full"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          )}

          {/* Message menu for other person's messages */}
          {!isOwn && isHovered && (
            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onReply(message)}
                className="p-1 bg-steel-700 rounded-full hover:bg-steel-600 transition-colors"
                title="Reply"
              >
                <Reply className="w-3 h-3 text-steel-300" />
              </button>
            </div>
          )}

          {renderMessageContent()}
        </div>
      </div>
    </div>
  );
}
