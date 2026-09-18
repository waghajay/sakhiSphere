import { getPrisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';

export class GroupPostInteractionsService {
  /**
   * Toggles like on a group post.
   */
  static async toggleLike(groupPostId: number, userId: number) {
    const prisma = getPrisma();

    // Verify post exists and get group
    const post = await prisma.groupPost.findUnique({
      where: { id: groupPostId },
      select: { id: true, groupId: true },
    });

    if (!post) {
      throw new CustomError('Post not found', 404);
    }

    // Check membership
    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId: post.groupId, userId },
      },
    });

    if (!member) {
      throw new CustomError('You must be a member to like posts', 403);
    }

    // Check if already liked
    const existingLike = await prisma.groupPostLike.findUnique({
      where: {
        groupPostId_userId: { groupPostId, userId },
      },
    });

    if (existingLike) {
      await prisma.groupPostLike.delete({
        where: { id: existingLike.id },
      });

      const likeCount = await prisma.groupPostLike.count({
        where: { groupPostId },
      });

      return { liked: false, likesCount: likeCount };
    } else {
      await prisma.groupPostLike.create({
        data: { groupPostId, userId },
      });

      const likeCount = await prisma.groupPostLike.count({
        where: { groupPostId },
      });

      return { liked: true, likesCount: likeCount };
    }
  }

  /**
   * Creates a comment on a group post.
   */
  static async createComment(
    groupPostId: number,
    userId: number,
    data: { content: string; parentId?: number }
  ) {
    const prisma = getPrisma();

    if (!data.content || !data.content.trim()) {
      throw new CustomError('Comment content is required', 400);
    }

    if (data.content.length > 2000) {
      throw new CustomError('Comment must be less than 2000 characters', 400);
    }

    // Verify post exists
    const post = await prisma.groupPost.findUnique({
      where: { id: groupPostId },
      select: { id: true, groupId: true },
    });

    if (!post) {
      throw new CustomError('Post not found', 404);
    }

    // Check membership
    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId: post.groupId, userId },
      },
    });

    if (!member) {
      throw new CustomError('You must be a member to comment', 403);
    }

    // If parentId, verify parent comment exists
    if (data.parentId) {
      const parent = await prisma.groupPostComment.findUnique({
        where: { id: data.parentId },
      });
      if (!parent || parent.groupPostId !== groupPostId) {
        throw new CustomError('Parent comment not found', 404);
      }
    }

    const comment = await prisma.groupPostComment.create({
      data: {
        groupPostId,
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
            profile: { select: { avatarUrl: true } },
          },
        },
        _count: { select: { replies: true } },
      },
    });

    return this.formatComment(comment);
  }

  /**
   * Gets comments for a group post.
   */
  static async getComments(
    groupPostId: number,
    userId: number,
    page: number = 1,
    limit: number = 20
  ) {
    const prisma = getPrisma();
    const skip = (page - 1) * limit;

    const post = await prisma.groupPost.findUnique({
      where: { id: groupPostId },
      select: { groupId: true },
    });

    if (!post) {
      throw new CustomError('Post not found', 404);
    }

    // Check membership
    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId: post.groupId, userId },
      },
    });

    if (!member) {
      throw new CustomError('You must be a member to view comments', 403);
    }

    const where = {
      groupPostId,
      parentId: null,
    };

    const [comments, total] = await Promise.all([
      prisma.groupPostComment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              isVerified: true,
              profile: { select: { avatarUrl: true } },
            },
          },
          _count: { select: { replies: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.groupPostComment.count({ where }),
    ]);

    return {
      comments: comments.map(c => this.formatComment(c)),
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
   * Gets replies to a comment.
   */
  static async getReplies(
    commentId: number,
    userId: number,
    page: number = 1,
    limit: number = 20
  ) {
    const prisma = getPrisma();
    const skip = (page - 1) * limit;

    const parent = await prisma.groupPostComment.findUnique({
      where: { id: commentId },
      include: { groupPost: { select: { groupId: true } } },
    });

    if (!parent) {
      throw new CustomError('Comment not found', 404);
    }

    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId: parent.groupPost.groupId, userId },
      },
    });

    if (!member) {
      throw new CustomError('You must be a member to view replies', 403);
    }

    const where = { parentId: commentId };

    const [replies, total] = await Promise.all([
      prisma.groupPostComment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              isVerified: true,
              profile: { select: { avatarUrl: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.groupPostComment.count({ where }),
    ]);

    return {
      comments: replies.map(c => this.formatComment(c)),
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
  static async updateComment(commentId: number, userId: number, content: string) {
    const prisma = getPrisma();

    if (!content || !content.trim()) {
      throw new CustomError('Comment content cannot be empty', 400);
    }

    const comment = await prisma.groupPostComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new CustomError('Comment not found', 404);
    }

    if (comment.userId !== userId) {
      throw new CustomError('You can only edit your own comments', 403);
    }

    const updated = await prisma.groupPostComment.update({
      where: { id: commentId },
      data: { content: content.trim() },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            isVerified: true,
            profile: { select: { avatarUrl: true } },
          },
        },
        _count: { select: { replies: true } },
      },
    });

    return this.formatComment(updated);
  }

  /**
   * Deletes a comment.
   */
  static async deleteComment(commentId: number, userId: number) {
    const prisma = getPrisma();

    const comment = await prisma.groupPostComment.findUnique({
      where: { id: commentId },
      include: { groupPost: { select: { groupId: true } } },
    });

    if (!comment) {
      throw new CustomError('Comment not found', 404);
    }

    // Owner can delete own comment; group admin/owner can delete any
    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId: comment.groupPost.groupId, userId },
      },
    });

    const isCommentOwner = comment.userId === userId;
    const isGroupAdmin = member && (member.role === 'owner' || member.role === 'admin');

    if (!isCommentOwner && !isGroupAdmin) {
      throw new CustomError('You do not have permission to delete this comment', 403);
    }

    await prisma.groupPostComment.delete({
      where: { id: commentId },
    });

    return { success: true, message: 'Comment deleted successfully' };
  }

  /**
   * Helper to format comment.
   */
  private static formatComment(comment: any) {
    return {
      id: comment.id,
      groupPostId: comment.groupPostId,
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