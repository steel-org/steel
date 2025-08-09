import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { prisma } from "../utils/database";
import { auth } from "../middleware/auth";
import { validateRegistration, validateLogin } from "../middleware/validation";

const router = Router();

// Register new user
router.post(
  "/register",
  validateRegistration,
  async (req: Request, res: Response) => {
    try {
      const { email, username, password } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { username }],
        },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: "User with this email or username already exists",
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        },
        select: {
          id: true,
          email: true,
          username: true,
          avatar: true,
          status: true,
          createdAt: true,
        },
      });

      // Generate JWT token
      const jwtOptions: SignOptions = {
        expiresIn: (process.env.JWT_EXPIRES_IN as unknown as string) || "7d",
      };
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET as string,
        jwtOptions
      );

      return res.status(201).json({
        success: true,
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: "Server error",
      });
    }
  }
);

// Login user
router.post("/login", validateLogin, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Update last seen
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeen: new Date() },
    });

    // Generate JWT token
    const loginJwtOptions: SignOptions = {
      expiresIn: (process.env.JWT_EXPIRES_IN as unknown as string) || "7d",
    };
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      loginJwtOptions
    );

    const { password: _, ...userWithoutPassword } = user;

    return res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// Get current user
router.get("/me", auth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user.id },
      select: {
        id: true,
        email: true,
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

// Logout user
router.post("/logout", auth, async (req: Request, res: Response) => {
  try {
    // Update user status to offline
    await prisma.user.update({
      where: { id: (req as any).user.id },
      data: {
        status: "offline",
        lastSeen: new Date(),
      },
    });

    return res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

export default router;
