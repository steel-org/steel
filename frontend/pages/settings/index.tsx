import React, { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import Settings from '@/components/Settings';
import { wsService } from '@/services/websocket';
import { apiService } from '@/services/api';
import { useChatStore } from '@/stores/chatStore';

const SettingsPage: NextPage = () => {
  const router = useRouter();
  const logoutStore = useChatStore((s) => s.logout);

  const handleLogout = () => {
    try {
      wsService.disconnect();
      apiService.clearToken();
      logoutStore();
      try { localStorage.removeItem('biuld-chat-store'); } catch {}
    } catch {}
    router.replace('/auth/login');
  };

  // Prefetch home to speed up navigation back
  useEffect(() => {
    router.prefetch('/');
  }, [router]);

  return (
    <>
      <Head>
        <title>Settings • Biuld</title>
      </Head>
      <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
        <header className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur border-b border-gray-800">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Mobile back/home button */}
              <button
                aria-label="Back to Home"
                onClick={() => router.push('/')}
                className="inline-flex sm:hidden text-gray-300 hover:text-gray-100 p-1 rounded-md hover:bg-gray-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Desktop back/home link */}
              <Link href="/" aria-label="Home" className="hidden sm:inline-flex text-gray-300 hover:text-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-lg font-semibold">Settings</h1>
            </div>
            <div className="flex items-center gap-2">
              {/* reserved for future actions */}
            </div>
          </div>
        </header>
        <main className="flex-1">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <Settings onLogout={handleLogout} variant="page" />
          </div>
        </main>
      </div>
    </>
  );
};

export default SettingsPage;
