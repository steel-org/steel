export const SW_PATH = '/service-worker.js';

export function swSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  if (Notification.permission === 'default') {
    try { return await Notification.requestPermission(); } catch { return 'denied'; }
  }
  return Notification.permission;
}

export async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!swSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register(SW_PATH);
    return reg;
  } catch (e) {
    console.error('SW register failed', e);
    return null;
  }
}

export async function unregisterSW(): Promise<void> {
  if (!swSupported()) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.unregister()));
  } catch (e) {
    console.warn('SW unregister failed', e);
  }
}

export function getBgNotifsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('bg_notifs_enabled') === '1';
}

export function setBgNotifsEnabled(v: boolean) {
  if (typeof window === 'undefined') return;
  if (v) localStorage.setItem('bg_notifs_enabled', '1');
  else localStorage.removeItem('bg_notifs_enabled');
}

// Web Push helpers
import { apiService } from '@/services/api';

export async function getOrRegisterSW(): Promise<ServiceWorkerRegistration | null> {
  if (!swSupported()) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  return registerSW();
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(): Promise<void> {
  const reg = await getOrRegisterSW();
  if (!reg) throw new Error('Service Worker not registered');
  const permission = await ensureNotificationPermission();
  if (permission !== 'granted') throw new Error('Notification permission not granted');

  const vapidKey = await apiService.getVapidPublicKey();
  if (!vapidKey) throw new Error('VAPID key not available');

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });
  await apiService.pushSubscribe(sub.toJSON());
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!swSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  try {
    await apiService.pushUnsubscribe(sub.toJSON());
  } finally {
    try { await sub.unsubscribe(); } catch {}
  }
}
