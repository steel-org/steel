import { Router, Request, Response } from 'express';
import multer from 'multer';
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../utils/database';
import { auth } from '../middleware/auth';

const router = Router();

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  s3ForcePathStyle: true
});

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600') // 100MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || '').split(',');
    if (allowedTypes.includes(file.mimetype) || allowedTypes.includes(`.${file.originalname.split('.').pop()}`)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

// Upload file
router.post('/upload', auth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const fileId = uuidv4();
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `${fileId}.${fileExtension}`;

    // Upload to S3
    const uploadParams = {
      Bucket: process.env.S3_BUCKET!,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      Metadata: {
        originalName: req.file.originalname
      }
    };

    const uploadResult = await s3.upload(uploadParams).promise();

    // Create attachment record
    const attachment = await prisma.attachment.create({
      data: {
        filename: fileName,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: uploadResult.Location
      }
    });

    res.json({
      success: true,
      data: attachment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to upload file'
    });
  }
});

// Get file info
router.get('/:id', auth, async (req: Request, res: Response) => {
  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: req.params.id }
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    res.json({
      success: true,
      data: attachment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Download file
router.get('/:id/download', auth, async (req: Request, res: Response) => {
  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: req.params.id }
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Generate signed URL for download
    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: process.env.S3_BUCKET!,
      Key: attachment.filename,
      Expires: 3600 // 1 hour
    });

    res.json({
      success: true,
      data: {
        ...attachment,
        downloadUrl: signedUrl
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

export default router; 