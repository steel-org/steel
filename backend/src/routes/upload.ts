import { Router } from "express";
import { auth } from "../middleware/auth";
import { logger } from "../utils/logger";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { supabaseAdmin, SUPABASE_BUCKET } from "../utils/supabase";

const router = Router();
const prisma = new PrismaClient();

// In-memory storage; we're forwarding to Supabase
const upload = multer({ storage: multer.memoryStorage() });

router.post("/avatar", auth, upload.single("avatar"), async (req, res) => {
  try {
    const userId = req.user && req.user.id ? req.user.id : undefined;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: user id missing" });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "Avatar file is required (field name: 'avatar')" });
    }

    const ext = path.extname(file.originalname) || ".jpg";
    const randomPart = crypto.randomBytes(4).toString("hex");
    const fileName = `${Date.now()}-${randomPart}${ext}`;
    const storagePath = `avatars/${userId}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from(SUPABASE_BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      logger.error("Supabase upload error:", uploadError);
      return res.status(400).json({ error: `Upload failed: ${uploadError.message}` });
    }

    const { data: publicData } = supabaseAdmin.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(storagePath);

    const avatarUrl = publicData.publicUrl;

    // Update user's avatar in database
    await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });

    logger.info(`Avatar updated for user ${userId}: ${avatarUrl}`);

    return res.json({
      success: true,
      avatarUrl,
      message: "Avatar updated successfully",
    });
  } catch (error) {
    logger.error("Avatar update error:", error);
    return res.status(500).json({ error: "Failed to update avatar" });
  }
});

// Chat file upload
router.post("/chat-file", auth, upload.single("file"), async (req, res) => {
  try {
    const userId = req.user && req.user.id ? req.user.id : undefined;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: user id missing" });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "File is required (field name: 'file')" });
    }

    const ext = path.extname(file.originalname) || "";
    const randomPart = crypto.randomBytes(4).toString("hex");
    const fileName = `${Date.now()}-${randomPart}${ext}`;
    const storagePath = `chat-files/${userId}/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(SUPABASE_BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      logger.error("Supabase chat-file upload error:", uploadError);
      return res.status(400).json({ error: `Upload failed: ${uploadError.message}` });
    }

    const { data: publicData } = supabaseAdmin.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(storagePath);

    const url = publicData.publicUrl;

    return res.json({
      success: true,
      data: {
        url,
        path: storagePath,
        size: file.size,
        type: file.mimetype,
        originalName: file.originalname,
      },
      message: "File uploaded successfully",
    });
  } catch (error) {
    logger.error("Chat file upload error:", error);
    return res.status(500).json({ error: "Failed to upload file" });
  }
});

export default router;
