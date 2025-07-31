import { Clock, User } from "lucide-react";

export default function Message({ message, isOwn }) {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderMessageContent = () => {
    if (message.type === "system") {
      return (
        <div className="text-center py-2">
          <span className="text-xs text-steel-400 bg-steel-800 px-3 py-1 rounded-full">
            {message.text}
          </span>
        </div>
      );
    }

    if (message.type === "code") {
      return (
        <div className="space-y-2">
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
        <p className="text-steel-100 whitespace-pre-wrap">{message.text}</p>
        <div className="flex items-center space-x-1 text-xs text-steel-400">
          <Clock className="w-3 h-3" />
          <span>{formatTime(message.timestamp)}</span>
        </div>
      </div>
    );
  };

  if (message.type === "system") {
    return <div className="my-2">{renderMessageContent()}</div>;
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`chat-message ${isOwn ? "own" : "other"} max-w-2xl`}>
        {!isOwn && message.user && (
          <div className="flex items-center space-x-2 mb-2">
            <img
              src={message.user.avatar}
              alt={message.user.username}
              className="w-6 h-6 rounded-full"
            />
            <span className="text-sm font-medium text-steel-300">
              {message.user.username}
            </span>
          </div>
        )}

        {renderMessageContent()}
      </div>
    </div>
  );
}
