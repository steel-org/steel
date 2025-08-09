import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

export const setupWebSocket = (io: Server) => {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          email: true
        }
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user.id;
      socket.user = user;
      
      // Update user status to online
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          status: 'online',
          lastSeen: new Date()
        }
      });

      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`User connected: ${socket.user?.username} (${socket.userId})`);

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Handle join chat
    socket.on('join_chat', async (data: { chatId: string }) => {
      try {
        const { chatId } = data;
        
        // Check if user is member of this chat
        const membership = await prisma.chatMember.findUnique({
          where: {
            userId_chatId: {
              userId: socket.userId!,
              chatId
            }
          }
        });

        if (!membership) {
          socket.emit('error', { message: 'Not a member of this chat' });
          return;
        }

        socket.join(`chat:${chatId}`);
        socket.emit('joined_chat', { chatId });
        
        logger.info(`User ${socket.user?.username} joined chat ${chatId}`);
      } catch (error) {
        logger.error('Error joining chat:', error);
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    // Handle send message
    socket.on('send_message', async (data: {
      chatId: string;
      content: string;
      type?: string;
      replyToId?: string;
      language?: string;
      filename?: string;
    }) => {
      try {
        const { chatId, content, type = 'TEXT', replyToId, language, filename } = data;

        // Create message in database
        const message = await prisma.message.create({
          data: {
            content,
            type: type as any,
            replyToId,
            language,
            filename,
            senderId: socket.userId!,
            chatId
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                avatar: true
              }
            },
            replyTo: {
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true
                  }
                }
              }
            }
          }
        });

        // Update chat's last message
        await prisma.chat.update({
          where: { id: chatId },
          data: { lastMessage: new Date() }
        });

        // Emit to all users in the chat
        io.to(`chat:${chatId}`).emit('message_received', message);
        
        logger.info(`Message sent in chat ${chatId} by ${socket.user?.username}`);
      } catch (error) {
        logger.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data: { chatId: string; isTyping: boolean }) => {
      const { chatId, isTyping } = data;
      socket.to(`chat:${chatId}`).emit('user_typing', {
        userId: socket.userId,
        username: socket.user?.username,
        isTyping
      });
    });

    // Handle message reactions
    socket.on('react_to_message', async (data: { messageId: string; reaction: string }) => {
      try {
        const { messageId, reaction } = data;

        // Add or update reaction
        await prisma.messageReaction.upsert({
          where: {
            userId_messageId_reaction: {
              userId: socket.userId!,
              messageId,
              reaction
            }
          },
          update: {},
          create: {
            userId: socket.userId!,
            messageId,
            reaction
          }
        });

        // Emit to all users in the chat
        const message = await prisma.message.findUnique({
          where: { id: messageId },
          include: { chat: true }
        });

        if (message) {
          io.to(`chat:${message.chatId}`).emit('message_reaction', {
            messageId,
            reaction,
            userId: socket.userId,
            username: socket.user?.username
          });
        }
      } catch (error) {
        logger.error('Error adding reaction:', error);
        socket.emit('error', { message: 'Failed to add reaction' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      logger.info(`User disconnected: ${socket.user?.username} (${socket.userId})`);
      
      if (socket.userId) {
        // Update user status to offline
        await prisma.user.update({
          where: { id: socket.userId },
          data: { 
            status: 'offline',
            lastSeen: new Date()
          }
        });

        // Notify other users
        socket.broadcast.emit('user_offline', {
          userId: socket.userId,
          username: socket.user?.username
        });
      }
    });
  });

  logger.info('WebSocket server setup complete');
}; 