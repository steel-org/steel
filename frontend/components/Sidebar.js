import { Users, User, Circle } from "lucide-react";

export default function Sidebar({ users, currentUser, onUserSelect }) {
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
            <p className="text-sm text-steel-400">Real-time developer chat</p>
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

      {/* Users List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-medium text-steel-400 mb-3 uppercase tracking-wide">
            Online Users ({users.length})
          </h3>

          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="sidebar-item"
                onClick={() => onUserSelect(user)}
              >
                <div className="relative">
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-8 h-8 rounded-full"
                  />
                  <Circle className="w-2.5 h-2.5 text-green-500 absolute -bottom-0.5 -right-0.5 fill-current" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-steel-100 font-medium truncate">
                    {user.username}
                  </p>
                  <p className="text-xs text-steel-400">
                    Joined {new Date(user.joinedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {users.length === 0 && (
            <div className="text-center py-8">
              <User className="w-8 h-8 text-steel-600 mx-auto mb-2" />
              <p className="text-steel-400 text-sm">No other users online</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-steel-700">
        <div className="text-xs text-steel-400 text-center">
          <p>Steel v1.0.0</p>
          <p>Real-time developer collaboration</p>
        </div>
      </div>
    </div>
  );
}
