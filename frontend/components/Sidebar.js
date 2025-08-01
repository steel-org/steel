import { useState } from "react";
import { Users, User, Circle, MessageCircle, Plus, Search } from "lucide-react";

export default function Sidebar({
  users,
  conversations,
  currentUser,
  currentConversation,
  onUserSelect,
  onConversationSelect,
}) {
  const [activeTab, setActiveTab] = useState("conversations");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = users.filter(
    (user) =>
      user.id !== currentUser?.id &&
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredConversations = conversations.filter((conv) => {
    const participant = conv.participants.find((p) => p.id !== currentUser?.id);
    return (
      participant &&
      participant.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getOtherParticipant = (conversation) => {
    return conversation.participants.find((p) => p.id !== currentUser?.id);
  };

  const formatLastMessage = (message) => {
    if (!message) return "No messages yet";

    const text =
      message.text.length > 30
        ? message.text.substring(0, 30) + "..."
        : message.text;

    return text;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = (now - date) / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="w-80 bg-steel-800 border-r border-steel-700 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-steel-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-steel-100">Steel Chat</h1>
            <p className="text-sm text-steel-400">Private messaging</p>
          </div>
        </div>
      </div>

      {/* Current User */}
      {currentUser && (
        <div className="p-4 border-b border-steel-700">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.username}
                className="w-10 h-10 rounded-full"
              />
              <Circle className="w-3 h-3 text-green-500 absolute -bottom-1 -right-1 fill-current" />
            </div>
            <div className="flex-1">
              <p className="text-steel-100 font-medium">
                {currentUser.username}
              </p>
              <p className="text-xs text-steel-400">You</p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="p-4 border-b border-steel-700">
        <div className="relative">
          <Search className="w-4 h-4 text-steel-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field w-full pl-10 text-sm"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-steel-700">
        <button
          onClick={() => setActiveTab("conversations")}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === "conversations"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-steel-400 hover:text-steel-200"
          }`}
        >
          <MessageCircle className="w-4 h-4 inline mr-2" />
          Conversations
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === "users"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-steel-400 hover:text-steel-200"
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Users
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "conversations" ? (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-steel-400 uppercase tracking-wide">
                Recent Chats ({filteredConversations.length})
              </h3>
            </div>

            <div className="space-y-2">
              {filteredConversations.map((conversation) => {
                const otherUser = getOtherParticipant(conversation);
                const isActive = currentConversation === conversation.id;

                return (
                  <div
                    key={conversation.id}
                    className={`sidebar-item ${isActive ? "active" : ""}`}
                    onClick={() => onConversationSelect(conversation.id)}
                  >
                    <div className="relative">
                      <img
                        src={otherUser?.avatar}
                        alt={otherUser?.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <Circle
                        className={`w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 ${
                          otherUser?.isOnline
                            ? "text-green-500 fill-current"
                            : "text-steel-500"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-steel-100 font-medium truncate">
                          {otherUser?.username}
                        </p>
                        {conversation.lastMessage && (
                          <span className="text-xs text-steel-400">
                            {formatTime(conversation.lastMessage.timestamp)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-steel-400 truncate">
                        {formatLastMessage(conversation.lastMessage)}
                      </p>
                    </div>
                  </div>
                );
              })}

              {filteredConversations.length === 0 && (
                <div className="text-center py-8">
                  <MessageCircle className="w-8 h-8 text-steel-600 mx-auto mb-2" />
                  <p className="text-steel-400 text-sm">No conversations yet</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-steel-400 uppercase tracking-wide">
                Online Users ({filteredUsers.length})
              </h3>
            </div>

            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="sidebar-item"
                  onClick={() => onUserSelect(user.id)}
                >
                  <div className="relative">
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-10 h-10 rounded-full"
                    />
                    <Circle
                      className={`w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 ${
                        user.isOnline
                          ? "text-green-500 fill-current"
                          : "text-steel-500"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-steel-100 font-medium truncate">
                      {user.username}
                    </p>
                    <p className="text-xs text-steel-400">
                      {user.isOnline
                        ? "Online"
                        : `Last seen ${formatTime(user.lastSeen)}`}
                    </p>
                  </div>
                  <Plus className="w-4 h-4 text-steel-400" />
                </div>
              ))}

              {filteredUsers.length === 0 && (
                <div className="text-center py-8">
                  <User className="w-8 h-8 text-steel-600 mx-auto mb-2" />
                  <p className="text-steel-400 text-sm">
                    No other users online
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-steel-700">
        <div className="text-xs text-steel-400 text-center">
          <p>Steel v1.0.0</p>
          <p>Private messaging system</p>
        </div>
      </div>
    </div>
  );
}
