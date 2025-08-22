import React, { useState } from 'react';
import Head from 'next/head';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { apiService } from '@/services/api';
import { wsService } from '@/services/websocket';
import { useChatStore } from '@/stores/chatStore';

const RegisterPage: NextPage = () => {
  const router = useRouter();
  const setCurrentUser = useChatStore((s) => s.setCurrentUser);
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiService.register(username, email, password);
      if (res?.user) {
        setCurrentUser(res.user);
        try { await wsService.connect(); } catch {}
        router.replace('/');
      } else {
        setError('Registration failed');
      }
    } catch (err: any) {
      setError(String(err?.message || 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Register • Biuld</title>
      </Head>
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Create your Biuld account</h1>
            <p className="text-gray-400 mt-1">It only takes a minute</p>
          </div>
          {error && (
            <div className="mb-4 bg-red-600/20 text-red-300 border border-red-700 rounded px-3 py-2 text-sm">{error}</div>
          )}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Username</label>
              <input value={username} onChange={(e)=>setUsername(e.target.value)} className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-gray-100 outline-none" placeholder="yourname" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Email</label>
              <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-gray-100 outline-none" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Password</label>
              <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-gray-100 outline-none" placeholder="••••••••" />
            </div>
            <button disabled={loading || !username || !email || !password} className="w-full mt-2 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
              {loading ? 'Creating account…' : 'Sign up'}
            </button>
          </form>
          <div className="mt-5 flex items-center">
            <div className="flex-1 h-px bg-gray-700" />
            <span className="px-3 text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-700" />
          </div>
          <div className="mt-3 flex justify-center">
            <a href="/auth/login" className="inline-flex items-center px-3 py-2 rounded border border-gray-600 text-gray-200 hover:bg-gray-700 text-sm">Sign in</a>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterPage;
