import React, { useState } from "react";
import { apiService } from "@/services/api";
import type { User } from "@/types";

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
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "register") {
        const res = await apiService.register(email, username, password);
        onSuccess(res.user);
      } else {
        const res = await apiService.login(email, password);
        onSuccess(res.user);
      }
    } catch (err: any) {
      setError(err?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-md bg-white p-6">
        <h2 className="mb-4 text-xl font-semibold">
          {mode === "register" ? "Create your account" : "Welcome back"}
        </h2>

        {error && (
          <div className="mb-3 rounded bg-red-100 p-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm">Email</label>
            <input
              type="email"
              className="w-full rounded border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {mode === "register" && (
            <div>
              <label className="mb-1 block text-sm">Username</label>
              <input
                type="text"
                className="w-full rounded border px-3 py-2"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm">Password</label>
            <input
              type="password"
              className="w-full rounded border px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-60"
          >
            {loading
              ? "Please wait…"
              : mode === "register"
              ? "Register"
              : "Login"}
          </button>
        </form>

        <div className="mt-3 flex items-center justify-between text-sm">
          <button onClick={onClose} className="text-gray-600">
            Cancel
          </button>
          <button
            onClick={() => setMode(mode === "register" ? "login" : "register")}
            className="text-blue-600"
          >
            {mode === "register"
              ? "Have an account? Login"
              : "Need an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}
