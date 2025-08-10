import { Router } from "express";
import multer from "multer";
import { auth } from "../middleware/auth";
import { logger } from "../utils/logger";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const router = Router();
const prisma = new PrismaClient();

// Configure multer for avatar uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Avatar upload endpoint
router.post("/avatar", auth, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const userId = req.userId;
    const file = req.file;
    const fileExtension = path.extname(file.originalname);
    const fileName = `avatar-${userId}-${uuidv4()}${fileExtension}`;

    const fs = require("fs");
    const uploadPath = path.join(process.cwd(), "uploads", "avatars");

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    const filePath = path.join(uploadPath, fileName);
    fs.writeFileSync(filePath, file.buffer);

    const avatarUrl = `/api/files/avatar/${fileName}`;

    // Update user's avatar in database
    await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });

    logger.info(`Avatar uploaded for user ${userId}: ${fileName}`);

    res.json({
      success: true,
      avatarUrl,
      message: "Avatar uploaded successfully",
    });
  } catch (error) {
    logger.error("Avatar upload error:", error);
    res.status(500).json({ error: "Failed to upload avatar" });
  }
});

// Serve avatar files
router.get("/avatar/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), "uploads", "avatars", filename);

    if (!require("fs").existsSync(filePath)) {
      return res.status(404).json({ error: "Avatar not found" });
    }

    res.sendFile(filePath);
  } catch (error) {
    logger.error("Avatar serve error:", error);
    res.status(500).json({ error: "Failed to serve avatar" });
  }
});

export default router;
