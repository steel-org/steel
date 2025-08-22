import webpush from 'web-push';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn('VAPID keys are not set. Push notifications will be disabled.');
}

export type PushPayload = {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  data?: any;
};

export async function sendPushToSubscription(subscription: any, payload: PushPayload) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (e: any) {
    if (e?.statusCode && [404, 410].includes(e.statusCode)) {
      throw Object.assign(new Error('Subscription gone'), { code: e.statusCode });
    }
    throw e;
  }
}
