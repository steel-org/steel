import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import AWS from "aws-sdk";
import { v4 as uuidv4 } from"uuid";
import { prisma } from "../utils/database";
import { auth } from "../middleware/auth";
import rateLimit from "express-rate-limit";
import { body, validateRequest } from "../middleware/validate-request";
const { param } = require('express-validator');

const router = Router();

// Rate limiting configuration
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10, 
  message: "Too many upload attempts, please try again after 15 minutes"
});

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "104857600");

const ALLOWED_FILE_TYPES = (process.env.ALLOWED_FILE_TYPES || "image/jpeg,image/png,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,application/zip,application/x-rar-compressed").split(",");

const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  try {
    const fileExt = file.originalname.split('.').pop()?.toLowerCase() || '';
    const isAllowedMimeType = ALLOWED_FILE_TYPES.some(type => {
      if (type.endsWith('/*')) {
        const [typePrefix] = type.split('/');
        return file.mimetype.startsWith(`${typePrefix}/`);
      }
      return type === file.mimetype;
    });

    const isAllowedExtension = ALLOWED_FILE_TYPES.some(type => 
      type.startsWith('.') && file.originalname.toLowerCase().endsWith(type)
    );
    
    if (isAllowedMimeType || isAllowedExtension) {
      cb(null, true);
    } else {
      cb(new Error(`File type '${file.mimetype}' not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`));
    }
  } catch (err) {
    cb(err as Error);
  }
};

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  s3ForcePathStyle: true,
});

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
});

// Error handler for multer
const handleMulterError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (!err) {
    return next();
  }

  // Handle multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      });
    }
    // Handle other multer errors
    return res.status(400).json({
      success: false,
      error: `File upload error: ${err.message}`
    });
  }
  
  // Handle all other errors
  return res.status(400).json({
    success: false,
    error: err.message || 'An error occurred during file upload'
  });
};

// Upload file
router.post(
  "/upload",
  auth,
  uploadLimiter,
  upload.single("file"),
  handleMulterError,
  [
    body('chatId').optional().isString(),
    body('messageId').optional().isString(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    let uploadResult: AWS.S3.ManagedUpload.SendData | null = null;
    let uploadParams: AWS.S3.PutObjectRequest | null = null;
    let fileId: string | null = null;
    let fileKey: string | null = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    fileId = uuidv4();
    const fileExtension = req.file.originalname.split(".").pop() || 'bin';
    const fileName = `${fileId}.${fileExtension}`;
    fileKey = `uploads/${req.user?.id || 'anonymous'}/${Date.now()}-${fileName}`;

    // Prepare upload parameters
    uploadParams = {
      Bucket: process.env.S3_BUCKET!,
      Key: fileKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      Metadata: {
        originalName: req.file.originalname,
        uploadedBy: req.user?.id || 'unknown',
        chatId: req.body.chatId || 'none',
        messageId: req.body.messageId || 'none',
      },
      ACL: 'private',
    };

    // Upload to S3
    uploadResult = await s3.upload(uploadParams).promise();

    if (!uploadResult || !uploadResult.Key) {
      throw new Error('Failed to upload file to S3');
    }

    const attachment = await prisma.$transaction(async (tx) => {
      const attachmentData: any = {
        filename: uploadParams!.Key!,
        originalName: req.file!.originalname,
        mimeType: req.file!.mimetype,
        size: req.file!.size,
        url: uploadResult!.Location,
        ...(process.env.S3_BUCKET && { storageBucket: process.env.S3_BUCKET }),
        ...(uploadParams?.Key && { storageKey: uploadParams.Key }),
        ...(fileId && { id: fileId }),
        ...(req.user?.id && { userId: req.user.id }),
        ...(req.body.chatId && { chatId: req.body.chatId }),
        ...(req.body.messageId && { messageId: req.body.messageId })
      };

      const attachment = await tx.attachment.create({
        data: attachmentData
      });

      if (req.body.messageId) {
        await tx.message.update({
          where: { id: req.body.messageId },
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
    console.error('File upload error:', error);
    
    if (fileKey) {
      try {
        await s3.deleteObject({
          Bucket: process.env.S3_BUCKET!,
          Key: fileKey,
        }).promise();
      } catch (cleanupError) {
        console.error('Error cleaning up after failed upload:', cleanupError);
      }
    }
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload file',
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

// Generate download URL
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

    try {
      type AttachmentType = {
        id: string;
        storageKey?: string;
        filename?: string;
        originalName?: string;
        [key: string]: any;
      };
      
      const attachmentData = attachment as AttachmentType;
      const s3Key = attachmentData.storageKey || attachmentData.filename || '';
      
      const signedUrl = s3.getSignedUrl("getObject", {
        Bucket: process.env.S3_BUCKET!,
        Key: s3Key,
        Expires: 3600,
        ResponseContentDisposition: `attachment; filename="${encodeURIComponent(attachment.originalName)}"`,
      });

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
          downloadUrl: signedUrl,
          expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        },
      });
    } catch (error) {
      console.error('Error generating download URL:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate download URL'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// Add a health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
