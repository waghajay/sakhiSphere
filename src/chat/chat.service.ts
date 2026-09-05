import { getPrisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';

export class ChatService {
  /**
   * Creates or gets a direct conversation between two users.
   */
  static async createOrGetDirectConversation(userId: number, targetUserId: number) {
    const prisma = getPrisma();

    if (userId === targetUserId) {
      throw new CustomError('Cannot chat with yourself', 400);
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        profile: {
          select: { avatarUrl: true },
        },
      },
    });

    if (!targetUser) {
      throw new CustomError('User not found', 404);
    }

    // Check if blocked
    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: userId },
        ],
      },
    });

    if (block) {
      throw new CustomError('You cannot chat with this user', 403);
    }

    // Find existing direct conversation
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        members: {
          every: {
            userId: { in: [userId, targetUserId] },
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                isVerified: true,
                profile: {
                  select: { avatarUrl: true },
                },
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (existingConversation) {
      return this.formatConversation(existingConversation, userId);
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        isGroup: false,
        members: {
          create: [
            { userId },
            { userId: targetUserId },
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                isVerified: true,
                profile: {
                  select: { avatarUrl: true },
                },
              },
            },
          },
        },
        messages: true,
      },
    });

    return this.formatConversation(conversation, userId);
  }

  /**
   * Gets all conversations for a user.
   */
  static async getUserConversations(userId: number, page: number = 1, limit: number = 20) {
    const prisma = getPrisma();
    const skip = (page - 1) * limit;

    const conversations = await prisma.conversation.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                isVerified: true,
                profile: {
                  select: { avatarUrl: true },
                },
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    });

    // Count unread messages
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            isRead: false,
          },
        });

        return this.formatConversation(conv, userId, unreadCount);
      })
    );

    return {
      conversations: conversationsWithUnread,
      pagination: {
        page,
        limit,
        total: await prisma.conversation.count({
          where: { members: { some: { userId } } },
        }),
        totalPages: Math.ceil(
          (await prisma.conversation.count({
            where: { members: { some: { userId } } },
          })) / limit
        ),
        hasMore: skip + limit < await prisma.conversation.count({
          where: { members: { some: { userId } } },
        }),
      },
    };
  }

  /**
   * Gets messages for a conversation.
   */
  static async getConversationMessages(
    conversationId: number,
    userId: number,
    page: number = 1,
    limit: number = 50
  ) {
    const prisma = getPrisma();
    const skip = (page - 1) * limit;

    // Check if user is member
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!member) {
      throw new CustomError('You are not a member of this conversation', 403);
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            isVerified: true,
            profile: {
              select: { avatarUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    // Update lastReadAt
    await prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: { lastReadAt: new Date() },
    });

    return {
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total: await prisma.message.count({ where: { conversationId } }),
        hasMore: skip + limit < await prisma.message.count({ where: { conversationId } }),
      },
    };
  }

  /**
   * Sends a message.
   */
  static async sendMessage(
    conversationId: number,
    senderId: number,
    content: string,
    messageType: string = 'text',
    mediaUrl?: string
  ) {
    const prisma = getPrisma();

    if (!content || !content.trim()) {
      throw new CustomError('Message content is required', 400);
    }

    // Check if user is member
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: senderId,
        },
      },
    });

    if (!member) {
      throw new CustomError('You are not a member of this conversation', 403);
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        content: content.trim(),
        messageType: messageType as any,
        mediaUrls: mediaUrl ? [mediaUrl] : [],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            isVerified: true,
            profile: {
              select: { avatarUrl: true },
            },
          },
        },
      },
    });

    // Update conversation updatedAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return this.formatMessage(message);
  }

  /**
   * Gets unread message count for a user.
   */
  static async getUnreadCount(userId: number) {
    const prisma = getPrisma();

    const conversations = await prisma.conversationMember.findMany({
      where: { userId },
      select: { conversationId: true },
    });

    const conversationIds = conversations.map(c => c.conversationId);

    const unreadCount = await prisma.message.count({
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: userId },
        isRead: false,
      },
    });

    return { unreadCount };
  }

  /**
   * Helper to format conversation.
   */
  private static formatConversation(conversation: any, userId: number, unreadCount: number = 0) {
    // For direct conversations, get the other user
    let name = conversation.name || '';
    let avatarUrl = null;
    let otherUser = null;

    if (!conversation.isGroup) {
      otherUser = conversation.members.find(
        (m: any) => m.userId !== userId
      )?.user;

      if (otherUser) {
        name = otherUser.name;
        avatarUrl = otherUser.profile?.avatarUrl || null;
      }
    }

    const lastMessage = conversation.messages?.[0];

    return {
      id: conversation.id,
      isGroup: conversation.isGroup,
      name,
      avatarUrl,
      otherUser: otherUser ? {
        id: otherUser.id,
        name: otherUser.name,
        isVerified: otherUser.isVerified,
        avatarUrl: otherUser.profile?.avatarUrl || null,
      } : null,
      lastMessage: lastMessage ? {
        id: lastMessage.id,
        content: lastMessage.content,
        messageType: lastMessage.messageType,
        senderId: lastMessage.senderId,
        createdAt: lastMessage.createdAt,
      } : null,
      unreadCount,
      updatedAt: conversation.updatedAt,
    };
  }

  /**
   * Helper to format message.
   */
  private static formatMessage(message: any) {
    return {
      id: message.id,
      conversationId: message.conversationId,
      content: message.content,
      messageType: message.messageType,
      mediaUrl: message.mediaUrl,
      isRead: message.isRead,
      createdAt: message.createdAt,
      sender: message.sender ? {
        id: message.sender.id,
        name: message.sender.name,
        isVerified: message.sender.isVerified,
        avatarUrl: message.sender.profile?.avatarUrl || null,
      } : null,
    };
  }

 /**
   * Deletes a message.
   */
  static async deleteMessage(messageId: number, userId: number) {
    const prisma = getPrisma();

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new CustomError('Message not found', 404);
    }

    if (message.senderId !== userId) {
      throw new CustomError('You can only delete your own messages', 403);
    }

    await prisma.message.delete({
      where: { id: messageId },
    });

    return { success: true, message: 'Message deleted successfully' };
  }

}