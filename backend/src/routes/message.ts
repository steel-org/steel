import { Router, Request, Response } from "express";
import { prisma } from "../utils/database";
import { auth } from "../middleware/auth";
import { validateMessage } from "../middleware/validation";
import { getIO } from "../websocket/io";

const router = Router();

// Get chat messages
router.get("/chat/:chatId", auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const chatId = req.params.chatId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    // Check if user is member of this chat
    const membership = await prisma.chatMember.findUnique({
      where: {
        userId_chatId: {
          userId,
          chatId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: "Not a member of this chat",
      });
    }

    const messages = await prisma.message.findMany({
      where: {
        chatId,
        NOT: {
          deletedFor: {
            some: { id: userId },
          },
        },
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        attachments: true,
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: offset,
      take: limit,
    });

    const total = await prisma.message.count({
      where: { chatId },
    });

    return res.json({
      success: true,
      data: {
        messages: messages.reverse(),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

// Edit message
router.put(
  "/:id",
  auth,
  validateMessage,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const messageId = req.params.id;
      const { content } = req.body;

      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: { sender: true },
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          error: "Message not found",
        });
      }

      if (message.senderId !== userId) {
        return res.status(403).json({
          success: false,
          error: "Not authorized to edit this message",
        });
      }

      // Create edit record
      await prisma.messageEdit.create({
        data: {
          messageId,
          userId,
          oldContent: message.content,
          newContent: content,
        },
      });

      // Update message
      const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: {
          content,
          editedAt: new Date(),
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
          replyTo: {
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
          attachments: true,
          reactions: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
      });

      // Broadcast the edit to all chat participants via per-user rooms
      try {
        const chat = await prisma.chat.findUnique({
          where: { id: updatedMessage.chatId },
          select: { members: { select: { userId: true } } },
        });
        if (chat) {
          const io = getIO();
          for (const m of chat.members) {
            io.to(`user:${m.userId}`).emit("message_edited", { message: updatedMessage });
          }
        }
      } catch (emitErr) {
        // Do not fail the request if broadcasting fails
        console.error("Failed to emit message_edited event", emitErr);
      }

      return res.json({
        success: true,
        data: updatedMessage,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: "Server error",
      });
    }
  }
);

// Delete message
router.delete("/:id", auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const messageId = req.params.id;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { sender: true },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        error: "Message not found",
      });
    }

    if (message.senderId !== userId) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to delete this message",
      });
    }

    await prisma.message.delete({
      where: { id: messageId },
    });

    return res.json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

export default router;
