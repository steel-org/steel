import '../styles/globals.css';
import NotificationPrompt from '@/components/NotificationPrompt';
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import type { AppProps } from 'next/app';
import { useChatStore } from '@/stores/chatStore';
import { getBgNotifsEnabled, ensureNotificationPermission, registerSW, unregisterSW } from '@/services/sw';
import { apiService } from '@/services/api';

let __originalFaviconHref: string | null = null;

function ensureFaviconLink() {
  let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null
    || document.querySelector("link[rel='shortcut icon']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  return link as HTMLLinkElement;
}

function drawFaviconWithDot(baseImg: HTMLImageElement | null) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  if (baseImg) {
    try { ctx.drawImage(baseImg, 0, 0, size, size); } catch {}
  } else {
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, size, size);
  }
  ctx.fillStyle = '#ef4444';
  const r = 10;
  const cx = size - r - 6;
  const cy = r + 6;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  return canvas.toDataURL('image/png');
}

function updateFavicon(hasUnread: boolean) {
  if (typeof document === 'undefined') return;
  const link = ensureFaviconLink();
  if (__originalFaviconHref == null) {
    __originalFaviconHref = link.getAttribute('href') || '/favicon.ico';
  }
  if (!hasUnread) {
    link.setAttribute('href', __originalFaviconHref);
    return;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const url = drawFaviconWithDot(img);
    link.setAttribute('href', url);
  };
  img.onerror = () => {
    const url = drawFaviconWithDot(null);
    link.setAttribute('href', url);
  };
  img.src = __originalFaviconHref!;
}

function useUnreadIndicators() {
  const unreadCounts = useChatStore((s) => s.unreadCounts as Record<string, number>);
  useEffect(() => {
    const total = Object.values(unreadCounts || {}).reduce((a, b) => a + (b || 0), 0);
    const baseTitle = 'Biuld Chat';
    if (typeof document !== 'undefined') {
      document.title = total > 0 ? `(${total}) ${baseTitle}` : baseTitle;
    }
    updateFavicon(total > 0);
  }, [unreadCounts]);
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  useUnreadIndicators();
  // Simple auth guard: protect all routes except auth pages
  useEffect(() => {
    const publicRoutes = ['/auth/login', '/auth/register'];
    const isPublic = publicRoutes.some((p) => router.pathname.startsWith(p));
    const token = apiService.getToken();
    if (!isPublic && !token) {
      if (router.pathname !== '/auth/login') {
        router.replace('/auth/login');
      }
    }
  }, [router.pathname, router]);

  // Auto-register SW if user enabled background notifications
  useEffect(() => {
    (async () => {
      try {
        if (!getBgNotifsEnabled()) {
          await unregisterSW();
          return;
        }
        const perm = await ensureNotificationPermission();
        if (perm === 'granted') {
          await registerSW();
        }
      } catch (e) {
        console.warn('Background notifications setup failed', e);
      }
    })();
  }, []);

  // Global OPEN_CHAT handler
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onMessage = (e: MessageEvent) => {
      const data: any = (e as any)?.data;
      if (!data || data.type !== 'OPEN_CHAT' || !data.chatId) return;
      const chatId = String(data.chatId);
      try { sessionStorage.setItem('biuld_pending_chat', chatId); } catch {}
      try {
        const visible = sessionStorage.getItem('biuld_sidebar_visible');
        if (visible === '1') return;
        router.replace({ pathname: router.pathname, query: { ...router.query, chatId } }, undefined, { shallow: true });
      } catch {}
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [router]);

  // Sync pending chat into URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let pending: string | null = null;
    try { pending = sessionStorage.getItem('biuld_pending_chat'); } catch {}
    if (!pending) return;
    try {
      const visible = sessionStorage.getItem('biuld_sidebar_visible');
      if (visible === '1') return;
      router.replace({ pathname: router.pathname, query: { ...router.query, chatId: pending } }, undefined, { shallow: true });
    } catch {}
  }, [router]);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <Component {...pageProps} />
      <NotificationPrompt />
    </>
  );
}
