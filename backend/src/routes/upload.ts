import { Router } from "express";
import { auth } from "../middleware/auth";
import { logger } from "../utils/logger";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.post("/avatar", auth, async (req, res) => {
  try {
    const { avatarUrl } = req.body;
    
    if (!avatarUrl) {
      return res.status(400).json({ error: "Avatar URL is required" });
    }

    const userId = req.user && req.user.id ? req.user.id : undefined;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: user id missing" });
    }

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

export default router;
