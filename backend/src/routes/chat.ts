import { Router, Request, Response } from "express";
import { prisma } from "../utils/database";
import { auth } from "../middleware/auth";
import { validateChat } from "../middleware/validation";
import { getIO } from "../websocket/io";

const router = Router();

// Get user's chats
router.get("/", auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const chats = await prisma.chat.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                status: true,
                lastSeen: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        lastMessage: "desc",
      },
    });

    return res.json({
      success: true,
      data: chats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// Create new chat
router.post("/", auth, validateChat, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { name, type, memberIds } = req.body;

    if (type === "DIRECT") {
      // For direct chats, check if chat already exists
      const existingChat = await prisma.chat.findFirst({
        where: {
          type: "DIRECT",
          AND: [
            { members: { some: { userId } } },
            { members: { some: { userId: memberIds[0] } } }
          ],
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });

      // Ensure the found DIRECT chat is exactly between the two users
      if (
        existingChat &&
        existingChat.members.length === 2 &&
        existingChat.members.some((m) => m.userId === userId) &&
        existingChat.members.some((m) => m.userId === memberIds[0])
      ) {
        return res.json({
          success: true,
          data: existingChat,
        });
      }
    }

    // Create new chat
    const chat = await prisma.chat.create({
      data: {
        name,
        type,
        ownerId: type === "GROUP" ? userId : null,
        members: {
          create: [
            {
              userId,
              role: type === "GROUP" ? "OWNER" : "MEMBER",
            },
            ...memberIds.map((memberId: string) => ({
              userId: memberId,
              role: "MEMBER",
            })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                status: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // Emit chat:created to other participants so their UI updates
    try {
      const io = getIO();
      const participantIds = chat.members.map((m) => m.userId);
      participantIds
        .filter((id) => id !== userId)
        .forEach((id) => io.to(`user:${id}`).emit("chat:created", chat));
    } catch (e) {
      // If io not initialized, continue without blocking API response
    }

    return res.status(201).json({
      success: true,
      data: chat,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// Get chat details
router.get("/:id", auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const chatId = req.params.id;

    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                status: true,
                lastSeen: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: "Chat not found",
      });
    }

    return res.json({
      success: true,
      data: chat,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// Update chat
router.put("/:id", auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const chatId = req.params.id;
    const { name, avatar } = req.body;

    // Check if user is owner or admin
    const membership = await prisma.chatMember.findUnique({
      where: {
        userId_chatId: {
          userId,
          chatId,
        },
      },
    });

    if (
      !membership ||
      (membership.role !== "OWNER" && membership.role !== "ADMIN")
    ) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to update this chat",
      });
    }

    const chat = await prisma.chat.update({
      where: { id: chatId },
      data: {
        name,
        avatar,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                status: true,
              },
            },
          },
        },
      },
    });

    return res.json({
      success: true,
      data: chat,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// Delete chat
router.delete("/:id", auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const chatId = req.params.id;

    // Check if user is owner
    const membership = await prisma.chatMember.findUnique({
      where: {
        userId_chatId: {
          userId,
          chatId,
        },
      },
    });

    if (!membership || membership.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        error: "Only chat owner can delete the chat",
      });
    }

    await prisma.chat.delete({
      where: { id: chatId },
    });

    return res.json({
      success: true,
      message: "Chat deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

export default router;
