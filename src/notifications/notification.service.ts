import { getPrisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';

export class NotificationService {
  /**
   * Gets notifications for a user.
   */
  static async getUserNotifications(userId: number, page: number = 1, limit: number = 20) {
    const prisma = getPrisma();
    const skip = (page - 1) * limit;

    // Get notifications from likes, comments, follows
    const [likes, comments, follows] = await Promise.all([
      prisma.postLike.findMany({
        where: {
          post: { userId },
          userId: { not: userId },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              isVerified: true,
              profile: { select: { avatarUrl: true } },
            },
          },
          post: {
            select: { id: true, content: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.comment.findMany({
        where: {
          post: { userId },
          userId: { not: userId },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              isVerified: true,
              profile: { select: { avatarUrl: true } },
            },
          },
          post: {
            select: { id: true, content: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.follow.findMany({
        where: {
          followingId: userId,
          followerId: { not: userId },
        },
        include: {
          follower: {
            select: {
              id: true,
              name: true,
              isVerified: true,
              profile: { select: { avatarUrl: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);

    // Format notifications
    const notifications = [
      ...likes.map(like => ({
        id: `like_${like.id}`,
        type: 'like',
        actor: {
          id: like.user.id,
          name: like.user.name,
          isVerified: like.user.isVerified,
          avatarUrl: like.user.profile?.avatarUrl || null,
        },
        content: 'liked your post',
        postId: like.postId,
        postPreview: like.post.content.substring(0, 100),
        createdAt: like.createdAt,
        isRead: false,
      })),
      ...comments.map(comment => ({
        id: `comment_${comment.id}`,
        type: 'comment',
        actor: {
          id: comment.user.id,
          name: comment.user.name,
          isVerified: comment.user.isVerified,
          avatarUrl: comment.user.profile?.avatarUrl || null,
        },
        content: `commented: "${comment.content.substring(0, 100)}"`,
        postId: comment.postId,
        postPreview: comment.post.content.substring(0, 100),
        createdAt: comment.createdAt,
        isRead: false,
      })),
      ...follows.map(follow => ({
        id: `follow_${follow.id}`,
        type: 'follow',
        actor: {
          id: follow.follower.id,
          name: follow.follower.name,
          isVerified: follow.follower.isVerified,
          avatarUrl: follow.follower.profile?.avatarUrl || null,
        },
        content: 'started following you',
        createdAt: follow.createdAt,
        isRead: false,
      })),
    ];

    // Sort by date
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      notifications: notifications.slice(skip, skip + limit),
      unreadCount: notifications.length,
      pagination: {
        page,
        limit,
        total: notifications.length,
        hasMore: notifications.length > skip + limit,
      },
    };
  }
}