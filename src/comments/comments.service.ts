import { getPrisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';

export interface CreateCommentDto {
  content: string;
  parentId?: number;
}

export interface UpdateCommentDto {
  content: string;
}

export class CommentsService {
  /**
   * Creates a new comment on a post.
   */
  static async createComment(userId: number, postId: number, data: CreateCommentDto) {
    const prisma = getPrisma();

    // Validate content
    if (!data.content || !data.content.trim()) {
      throw new CustomError('Comment content is required', 400);
    }

    if (data.content.length > 2000) {
      throw new CustomError('Comment must be less than 2000 characters', 400);
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new CustomError('Post not found', 404);
    }

    // If parentId provided, check if parent comment exists and belongs to same post
    if (data.parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: data.parentId },
      });

      if (!parentComment) {
        throw new CustomError('Parent comment not found', 404);
      }

      if (parentComment.postId !== postId) {
        throw new CustomError('Parent comment does not belong to this post', 400);
      }
    }

    const comment = await prisma.comment.create({
      data: {
        postId,
        userId,
        content: data.content.trim(),
        parentId: data.parentId || null,
      },
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
            replies: true,
          },
        },
      },
    });

    return this.formatComment(comment);
  }

  /**
   * Gets all comments on a post with pagination.
   */
  static async getPostComments(
    postId: number,
    page: number = 1,
    limit: number = 20
  ) {
    const prisma = getPrisma();
    const skip = (page - 1) * limit;

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new CustomError('Post not found', 404);
    }

    // Get only top-level comments (no parent)
    const where = {
      postId,
      parentId: null,
    };

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
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
              replies: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.comment.count({ where }),
    ]);

    return {
      comments: comments.map(comment => this.formatComment(comment)),
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
   * Gets replies to a specific comment.
   */
  static async getCommentReplies(
    commentId: number,
    page: number = 1,
    limit: number = 20
  ) {
    const prisma = getPrisma();
    const skip = (page - 1) * limit;

    // Check if parent comment exists
    const parentComment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!parentComment) {
      throw new CustomError('Comment not found', 404);
    }

    const where = {
      parentId: commentId,
    };

    const [replies, total] = await Promise.all([
      prisma.comment.findMany({
        where,
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
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.comment.count({ where }),
    ]);

    return {
      comments: replies.map(comment => this.formatComment(comment)),
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
   * Updates a comment.
   */
  static async updateComment(commentId: number, userId: number, data: UpdateCommentDto) {
    const prisma = getPrisma();

    // Validate content
    if (!data.content || !data.content.trim()) {
      throw new CustomError('Comment content cannot be empty', 400);
    }

    if (data.content.length > 2000) {
      throw new CustomError('Comment must be less than 2000 characters', 400);
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new CustomError('Comment not found', 404);
    }

    if (comment.userId !== userId) {
      throw new CustomError('You can only edit your own comments', 403);
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content: data.content.trim(),
      },
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
            replies: true,
          },
        },
      },
    });

    return this.formatComment(updatedComment);
  }

  /**
   * Deletes a comment.
   */
  static async deleteComment(commentId: number, userId: number) {
    const prisma = getPrisma();

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new CustomError('Comment not found', 404);
    }

    if (comment.userId !== userId) {
      throw new CustomError('You can only delete your own comments', 403);
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    return { success: true, message: 'Comment deleted successfully' };
  }

  /**
   * Gets a single comment by ID.
   */
  static async getComment(commentId: number) {
    const prisma = getPrisma();

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
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
            replies: true,
          },
        },
      },
    });

    if (!comment) {
      throw new CustomError('Comment not found', 404);
    }

    return this.formatComment(comment);
  }

  /**
   * Helper method to format comment response.
   */
  private static formatComment(comment: any) {
    return {
      id: comment.id,
      postId: comment.postId,
      parentId: comment.parentId,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: comment.user ? {
        id: comment.user.id,
        name: comment.user.name,
        isVerified: comment.user.isVerified,
        avatarUrl: comment.user.profile?.avatarUrl || null,
      } : null,
      repliesCount: comment._count?.replies || 0,
    };
  }
}