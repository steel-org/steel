import { Router, Request, Response } from "express";
import { prisma } from "../utils/database";
import { auth } from "../middleware/auth";

const router = Router();

// Search users
router.get("/", auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        error: "Search query must be at least 2 characters",
      });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { username: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          },
          { id: { not: userId } }, // Exclude current user
        ],
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        status: true,
        lastSeen: true,
      },
      take: limit,
      orderBy: {
        username: "asc",
      },
    });

    return res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// Get user profile
router.get("/:id", auth, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        avatar: true,
        status: true,
        lastSeen: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// Update user profile
router.put("/profile", auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { username, displayName, status, avatar, bio } = req.body;

    // Check if username is already taken
    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          id: { not: userId },
        },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: "Username already taken",
        });
      }
    }

    // Validate status
    const validStatuses = ['online', 'offline', 'away', 'busy'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status value",
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        username,
        displayName,
        status,
        avatar,
        bio,
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatar: true,
        status: true,
        bio: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update profile",
    });
  }
});

export default router;
