import React, { useState } from "react";
import { User } from "@/types";
import { apiService } from "@/services/api";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
}: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (!username.trim() && isLogin) ||
      !password.trim() ||
      (!isLogin && !email.trim())
    )
      return;

    setIsLoading(true);
    setError("");

    try {
      let user: User;
      if (isLogin) {
        const response = await apiService.login(username, password);
        user = response.user;
      } else {
        const response = await apiService.register(username, email, password);
        user = response.user;
      }
      onSuccess(user);
    } catch (error: any) {
      setError(error.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md mx-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
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
          <h2 className="text-2xl font-bold text-white mb-2">
            {isLogin ? "Welcome to Biuld" : "Join Biuld"}
          </h2>
          <p className="text-gray-400">
            {isLogin ? "Sign in to continue" : "Create your account"}
          </p>
        </div>

        {error && (
          <div className="bg-red-600 text-white p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your username"
              required
            />
          </div>

          {!isLogin && (
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
                required
              />
            </div>
          )}

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your password"
              required
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
            <button
              type="submit"
              disabled={
                isLoading ||
                (!username.trim() && isLogin) ||
                !password.trim() ||
                (!isLogin && !email.trim())
              }
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{isLogin ? "Sign In" : "Sign Up"}</span>
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-700">
          <div className="text-xs text-gray-400 text-center">
            <p>Biuld v4.0.3 • Real-time developer collaboration</p>
            <p className="mt-1">
              Share code, ideas, and collaborate seamlessly
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
