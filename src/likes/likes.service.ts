import { getPrisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';

export class LikesService {
  /**
   * Toggles like/unlike on a post.
   */
  static async toggleLike(userId: number, postId: number) {
    const prisma = getPrisma();

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new CustomError('Post not found', 404);
    }

    // Check if already liked
    const existingLike = await prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await prisma.postLike.delete({
        where: {
          id: existingLike.id,
        },
      });

      const likeCount = await prisma.postLike.count({
        where: { postId },
      });

      return {
        liked: false,
        likesCount: likeCount,
        message: 'Post unliked',
      };
    } else {
      // Like
      await prisma.postLike.create({
        data: {
          postId,
          userId,
        },
      });

      const likeCount = await prisma.postLike.count({
        where: { postId },
      });

      return {
        liked: true,
        likesCount: likeCount,
        message: 'Post liked',
      };
    }
  }

  /**
   * Gets all likes on a post.
   */
  static async getPostLikes(postId: number, page: number = 1, limit: number = 20) {
    const prisma = getPrisma();
    const skip = (page - 1) * limit;

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new CustomError('Post not found', 404);
    }

    const [likes, total] = await Promise.all([
      prisma.postLike.findMany({
        where: { postId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              isVerified: true,
              profile: {
                select: {
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.postLike.count({
        where: { postId },
      }),
    ]);

    return {
      likes: likes.map(like => ({
        id: like.id,
        createdAt: like.createdAt,
        user: {
          id: like.user.id,
          name: like.user.name,
          isVerified: like.user.isVerified,
          avatarUrl: like.user.profile?.avatarUrl || null,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  /**
   * Gets posts liked by a user.
   */
  static async getUserLikedPosts(userId: number, page: number = 1, limit: number = 10) {
    const prisma = getPrisma();
    const skip = (page - 1) * limit;

    const [likes, total] = await Promise.all([
      prisma.postLike.findMany({
        where: { userId },
        include: {
          post: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  isVerified: true,
                  profile: {
                    select: {
                      avatarUrl: true,
                    },
                  },
                },
              },
              _count: {
                select: {
                  likes: true,
                  comments: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.postLike.count({
        where: { userId },
      }),
    ]);

    return {
      posts: likes.map(like => ({
        id: like.post.id,
        content: like.post.content,
        mediaUrls: like.post.mediaUrls,
        mediaTypes: like.post.mediaTypes,
        visibility: like.post.visibility,
        createdAt: like.post.createdAt,
        author: {
          id: like.post.user.id,
          name: like.post.user.name,
          isVerified: like.post.user.isVerified,
          avatarUrl: like.post.user.profile?.avatarUrl || null,
        },
        likesCount: like.post._count.likes,
        commentsCount: like.post._count.comments,
        likedByMe: true,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  /**
   * Checks if user liked a post.
   */
  static async checkLikeStatus(userId: number, postId: number) {
    const prisma = getPrisma();

    const like = await prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    const likeCount = await prisma.postLike.count({
      where: { postId },
    });

    return {
      liked: Boolean(like),
      likesCount: likeCount,
    };
  }
}