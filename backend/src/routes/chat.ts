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
      const targetId = Array.isArray(memberIds) ? memberIds[0] : undefined;
      if (!targetId) {
        return res.status(400).json({ success: false, error: "memberIds[0] is required for DIRECT chat" });
      }

      const [a, b] = userId < targetId ? [userId, targetId] : [targetId, userId];
      const directKey = `${a}:${b}`;

      const existingByKey = await prisma.chat.findFirst({
        where: { directKey },
        include: {
          members: { include: { user: { select: { id: true, username: true, avatar: true, status: true, lastSeen: true } } } },
          owner: { select: { id: true, username: true } },
        },
      });
      if (existingByKey) {
        try {
          const io = getIO();
          const participantIds = existingByKey.members.map((m) => m.userId);
          participantIds.filter((id) => id !== userId).forEach((id) => io.to(`user:${id}`).emit("chat:created", existingByKey));
        } catch {}
        return res.json({ success: true, data: existingByKey });
      }

      try {
        const created = await prisma.chat.create({
          data: {
            type: "DIRECT",
            directKey,
            members: {
              create: [
                { userId, role: "MEMBER" },
                { userId: targetId, role: "MEMBER" },
              ],
            },
          },
          include: {
            members: { include: { user: { select: { id: true, username: true, avatar: true, status: true, lastSeen: true } } } },
            owner: { select: { id: true, username: true } },
          },
        });

        try {
          const io = getIO();
          const participantIds = created.members.map((m) => m.userId);
          participantIds.filter((id) => id !== userId).forEach((id) => io.to(`user:${id}`).emit("chat:created", created));
        } catch (e) {
          console.error("Failed to emit chat:created", e);
        }

        return res.status(201).json({ success: true, data: created });
      } catch (e: any) {
        if (e?.code === "P2002") {
          const current = await prisma.chat.findFirst({
            where: { directKey },
            include: {
              members: { include: { user: { select: { id: true, username: true, avatar: true, status: true, lastSeen: true } } } },
              owner: { select: { id: true, username: true } },
            },
          });
          if (current) return res.json({ success: true, data: current });
        }
        throw e;
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
      console.error("Failed to emit chat:created", e);
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

    // Notify all participants that the chat was updated
    try {
      const io = getIO();
      const participantIds = chat.members.map((m) => m.userId);
      for (const uid of participantIds) {
        io.to(`user:${uid}`).emit("chat:updated", chat);
      }
    } catch (e) {
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

// Add members to a chat (GROUP)
router.post("/:id/members", auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const chatId = req.params.id;
    const { memberIds } = req.body as { memberIds: string[] };

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ success: false, error: "memberIds is required" });
    }

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { members: true, owner: true },
    });

    if (!chat || chat.type !== 'GROUP') {
      return res.status(404).json({ success: false, error: "Group chat not found" });
    }

    const membership = await prisma.chatMember.findUnique({
      where: { userId_chatId: { userId, chatId } },
    });

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      return res.status(403).json({ success: false, error: 'Not authorized to add members' });
    }

    // Filter out users already in chat
    const existingUserIds = new Set(chat.members.map(m => m.userId));
    const toAdd = memberIds.filter(id => id && !existingUserIds.has(id) && id !== userId);
    if (toAdd.length === 0) {
      const current = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          members: { include: { user: { select: { id: true, username: true, avatar: true, status: true, lastSeen: true } } } },
          owner: { select: { id: true, username: true } },
        }
      });
      return res.json({ success: true, data: current });
    }

    await prisma.chatMember.createMany({
      data: toAdd.map(uid => ({ userId: uid, chatId, role: 'MEMBER' })),
      skipDuplicates: true,
    });

    const updated = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        members: { include: { user: { select: { id: true, username: true, avatar: true, status: true, lastSeen: true } } } },
        owner: { select: { id: true, username: true } },
      }
    });

    // Emit chat:updated to all participants
    try {
      const io = getIO();
      const participantIds = updated?.members.map(m => m.userId) || [];
      participantIds.forEach(uid => io.to(`user:${uid}`).emit('chat:updated', updated));
    } catch (e) {}
    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Server error' });
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
