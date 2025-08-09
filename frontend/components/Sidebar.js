import { useState } from "react";
import { Users, User, Circle, Search } from "lucide-react";

export default function Sidebar({
  users,
  currentUser,
  selectedUser,
  onUserSelect,
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = users.filter(
    (user) =>
      user.id !== currentUser?.id &&
      user.isOnline &&
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            placeholder="Search online users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field w-full pl-10 text-sm"
          />
        </div>
      </div>

      {/* Online Users */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-steel-400 uppercase tracking-wide">
              Online Users ({filteredUsers.length})
            </h3>
          </div>

          <div className="space-y-2">
            {filteredUsers.map((user) => {
              const isSelected = selectedUser?.id === user.id;

              return (
                <div
                  key={user.id}
                  className={`sidebar-item ${isSelected ? "active" : ""}`}
                  onClick={() => onUserSelect(user.id)}
                >
                  <div className="relative">
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-10 h-10 rounded-full"
                    />
                    <Circle className="w-2.5 h-2.5 text-green-500 absolute -bottom-0.5 -right-0.5 fill-current" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-steel-100 font-medium truncate">
                        {user.username}
                      </p>
                      <span className="text-xs text-green-400">Online</span>
                    </div>
                    <p className="text-xs text-steel-400">
                      Click to start chatting
                    </p>
                  </div>
                </div>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <User className="w-8 h-8 text-steel-600 mx-auto mb-2" />
                <p className="text-steel-400 text-sm">
                  {searchTerm ? "No users found" : "No other users online"}
                </p>
                {!searchTerm && (
                  <p className="text-steel-500 text-xs mt-1">
                    Invite someone to join!
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-steel-700">
        <div className="text-xs text-steel-400 text-center">
          <p>Steel v3.0.2</p>
          <p>Private messaging system</p>
        </div>
      </div>
    </div>
  );
}
