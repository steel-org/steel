import { Router, Request, Response } from "express";
import { prisma } from "../utils/database";
import { auth } from "../middleware/auth";
import rateLimit from "express-rate-limit";
import { body, validateRequest } from "../middleware/validate-request";
const { param } = require('express-validator');

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
  [
    body('url').isURL().withMessage('Valid file URL required'),
    body('originalName').isString().withMessage('Original filename required'),
    body('mimeType').isString().withMessage('MIME type required'),
    body('size').isInt({ min: 1 }).withMessage('File size required'),
    body('chatId').optional().isString(),
    body('messageId').optional().isString(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { url, originalName, mimeType, size, chatId, messageId } = req.body;

      const attachment = await prisma.$transaction(async (tx) => {
        const attachmentData = {
          filename: originalName,
          originalName,
          mimeType,
          size: parseInt(size),
          url,
          userId: req.user?.id,
          ...(chatId && { chatId }),
          ...(messageId && { messageId })
        };

        const attachment = await tx.attachment.create({
          data: attachmentData
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

// Get file info
router.get(
  "/:id",
  auth,
  [
    param('id').isUUID()
  ],
  validateRequest,
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

// Get download URL
router.get(
  "/:id/download",
  auth,
  [
    param('id').isUUID()
  ],
  validateRequest,
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

      return res.json({
        success: true,
        data: {
          ...attachment,
          downloadUrl: attachment.url, // Direct Supabase URL
        },
      });
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
