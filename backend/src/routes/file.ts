import { Router, Request, Response } from "express";
import { prisma } from "../utils/database";
import { auth } from "../middleware/auth";
import rateLimit from "express-rate-limit";
import { body, validateRequest } from "../middleware/validate-request";
const { param, query } = require('express-validator');

const router = Router();

// Rate limiting configuration
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 20, 
  message: "Too many file operations, please try again after 15 minutes"
});

// Save file metadata
router.post(
  "/save-metadata",
  auth,
  uploadLimiter,
  validateRequest([
    body('url').isURL().withMessage('Valid file URL required'),
    body('originalName').isString().withMessage('Original filename required'),
    body('mimeType').isString().withMessage('MIME type required'),
    body('size').isInt({ min: 1 }).withMessage('File size required'),
    body('chatId').optional().isString(),
    body('messageId').optional().isString(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { url, originalName, mimeType, size, chatId, messageId } = req.body;

      const attachment = await prisma.$transaction(async (tx) => {
        const attachment = await tx.attachment.create({
          data: {
            filename: originalName,
            originalName,
            mimeType,
            size: parseInt(size),
            url,
            ...(messageId && { messageId })
          }
        });

        if (messageId) {
          await tx.message.update({
            where: { id: messageId },
            data: {
              attachments: {
                connect: { id: attachment.id }
              }
            }
          });
        }

        return attachment;
      });

      return res.json({
        success: true,
        data: attachment,
      });
    } catch (error) {
      console.error('File metadata save error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save file metadata',
      });
    }
  }
);

// Proxy arbitrary URL downloads to force Content-Disposition download
router.get(
  '/download-proxy',
  auth,
  validateRequest([
    query('url').isURL().withMessage('Valid URL is required'),
    query('name').optional().isString(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const url = String(req.query.url);
      const name = (req.query.name ? String(req.query.name) : 'download').replace(/\"/g, '');

      const upstream = await fetch(url);
      if (!upstream.ok) {
        return res.status(502).json({ success: false, error: 'Upstream file fetch failed' });
      }

      const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
      const contentLength = upstream.headers.get('content-length');
      const asciiName = name.replace(/"/g, '');
      const encodedName = encodeURIComponent(name);

      res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`);

      if (upstream.body) {
        const { Readable } = await import('stream');
        const nodeStream = (Readable as any).fromWeb ? (Readable as any).fromWeb(upstream.body as any) : (upstream as any).body;
        nodeStream.pipe(res);
        nodeStream.on('error', (err: any) => {
          console.error('Proxy stream error:', err);
          if (!res.headersSent) {
            res.status(502).end('Failed to proxy file');
          } else {
            try { res.end(); } catch {}
          }
        });
        return;
      } else {
        try {
          const ab = await upstream.arrayBuffer();
          const buf = Buffer.from(ab);
          if (!res.getHeader('Content-Length')) {
            res.setHeader('Content-Length', String(buf.length));
          }
          return res.end(buf);
        } catch (e) {
          console.error('Upstream buffer error:', e);
          return res.status(502).end('Failed to fetch file');
        }
      }
    } catch (error) {
      console.error('download-proxy error:', error);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  }
);

// Get file info
router.get(
  "/:id",
  auth,
  validateRequest([
    param('id').isUUID()
  ]),
  async (req: Request, res: Response) => {
  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: req.params.id },
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: "File not found",
      });
    }

    return res.json({
      success: true,
      data: attachment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// Proxy download and log
router.get(
  "/:id/download",
  auth,
  validateRequest([
    param('id').isUUID()
  ]),
  async (req: Request, res: Response) => {
    try {
      const attachment = await prisma.attachment.findUnique({
        where: { id: req.params.id },
      });

      if (!attachment) {
        return res.status(404).json({
          success: false,
          error: "File not found",
        });
      }

      // Log the download for analytics
      try {
        await prisma.$executeRaw`
          INSERT INTO download_logs (id, "fileId", "userId", "ipAddress", "userAgent", "createdAt")
          VALUES (gen_random_uuid(), ${attachment.id}, ${req.user?.id || null}, ${req.ip}, ${req.headers['user-agent'] || ''}, NOW())
        `;
      } catch (error) {
        console.error('Failed to log download:', error);
      }

      const upstream = await fetch(attachment.url);
      if (!upstream.ok) {
        return res.status(502).json({ success: false, error: 'Upstream file fetch failed' });
      }

      const contentType = upstream.headers.get('content-type') || attachment.mimeType || 'application/octet-stream';
      const contentLength = upstream.headers.get('content-length');

      const originalName = attachment.originalName || attachment.filename || 'download';
      const asciiName = originalName.replace(/"/g, '');
      const encodedName = encodeURIComponent(originalName);

      res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`
      );

      if (upstream.body) {
        const { Readable } = await import('stream');
        const nodeStream = (Readable as any).fromWeb ? (Readable as any).fromWeb(upstream.body as any) : (upstream as any).body;
        nodeStream.pipe(res);
        nodeStream.on('error', (err: any) => {
          console.error('Proxy stream error:', err);
          if (!res.headersSent) {
            res.status(502).end('Failed to proxy file');
          } else {
            try { res.end(); } catch {}
          }
        });
        return;
      } else {
        try {
          const ab = await upstream.arrayBuffer();
          const buf = Buffer.from(ab);
          if (!res.getHeader('Content-Length')) {
            res.setHeader('Content-Length', String(buf.length));
          }
          return res.end(buf);
        } catch (e) {
          console.error('Upstream buffer error:', e);
          return res.status(502).end('Failed to fetch file');
        }
      }
    } catch (error) {
      console.error('Error getting download URL:', error);
      return res.status(500).json({
        success: false,
        error: "Server error",
      });
    }
  }
);

// Add a health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
