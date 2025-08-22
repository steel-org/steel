import { Router, Request, Response } from 'express';
import { prisma } from '../utils/database';
import { auth } from '../middleware/auth';

const router = Router();

// Public: return VAPID public key
router.get('/vapidPublicKey', (_req: Request, res: Response) => {
  const key = process.env.VAPID_PUBLIC_KEY || '';
  res.json({ success: true, data: { publicKey: key } });
});

// Subscribe to web push
router.post('/subscribe', auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id as string;
    const subscription = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return res.status(400).json({ success: false, error: 'Invalid subscription' });
    }

    const rec = await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId,
      },
      create: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId,
      },
    });

    return res.json({ success: true, data: { id: rec.id } });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Unsubscribe from web push
router.post('/unsubscribe', auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id as string;
    const subscription = req.body;
    const endpoint: string | undefined = subscription?.endpoint;

    if (!endpoint) {
      return res.status(400).json({ success: false, error: 'endpoint is required' });
    }

    const existing = await prisma.pushSubscription.findUnique({ where: { endpoint } });
    if (!existing || existing.userId !== userId) {
      return res.json({ success: true });
    }

    await prisma.pushSubscription.delete({ where: { endpoint } });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
