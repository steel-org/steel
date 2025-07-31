import { useState } from "react";
import { User, Sparkles } from "lucide-react";

export default function UserModal({ onJoin, onClose }) {
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");

  const generateAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    const newAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    setAvatar(newAvatar);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      onJoin({
        username: username.trim(),
        avatar:
          avatar ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-steel-800 rounded-lg p-8 max-w-md w-full mx-4 border border-steel-700">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-steel-100 mb-2">
            Welcome to Steel
          </h2>
          <p className="text-steel-400">
            Join the developer chat to start collaborating
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-steel-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="input-field w-full"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-steel-300 mb-2">
                Avatar
              </label>
              <div className="flex items-center space-x-4">
                <img
                  src={
                    avatar ||
                    "https://api.dicebear.com/7.x/avataaars/svg?seed=default"
                  }
                  alt="Avatar preview"
                  className="w-12 h-12 rounded-full border-2 border-steel-600"
                />
                <button
                  type="button"
                  onClick={generateAvatar}
                  className="btn-secondary text-sm"
                >
                  Generate New Avatar
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!username.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <User className="w-4 h-4" />
              <span>Join Chat</span>
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-steel-700">
          <div className="text-xs text-steel-400 text-center">
            <p>Steel v1.0.0 • Real-time developer collaboration</p>
            <p className="mt-1">
              Share code, ideas, and collaborate seamlessly
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
