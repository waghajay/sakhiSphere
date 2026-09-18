import { getPrisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { Prisma, GroupPrivacy } from '@prisma/client';

export interface CreateGroupDto {
  name: string;
  description?: string;
  coverUrl?: string;
  privacy?: GroupPrivacy;
  category?: string;
}

export interface UpdateGroupDto {
  name?: string;
  description?: string;
  coverUrl?: string;
  privacy?: GroupPrivacy;
  category?: string;
}

export class GroupsService {
  /**
   * Creates a new group.
   */
  static async createGroup(userId: number, data: CreateGroupDto) {
    const prisma = getPrisma();

    if (!data.name || !data.name.trim()) {
      throw new CustomError('Group name is required', 400);
    }

    if (data.name.length > 100) {
      throw new CustomError('Group name must be less than 100 characters', 400);
    }

    const group = await prisma.group.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        coverUrl: data.coverUrl || null,
        privacy: data.privacy || 'public',
        category: data.category || null,
        ownerId: userId,
        memberCount: 1,
        members: {
          create: {
            userId,
            role: 'owner',
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            isVerified: true,
            profile: { select: { avatarUrl: true } },
          },
        },
        _count: {
          select: { members: true, posts: true },
        },
      },
    });

    return this.formatGroup(group, userId);
  }

  /**
   * Gets all groups with filters.
   * BUG FIX #1: Compose search + filter using AND so they don't overwrite each other.
   */
  static async getGroups(
    userId: number,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
      filter?: 'all' | 'my' | 'joined';
    } = {}
  ) {
    const prisma = getPrisma();
    const { page = 1, limit = 20, search, category, filter = 'all' } = options;
    const skip = (page - 1) * limit;

    // Build AND conditions array — each item is a separate constraint
    const AND: Prisma.GroupWhereInput[] = [];

    // Search filter (name OR description)
    if (search && search.trim()) {
      AND.push({
        OR: [
          { name: { contains: search.trim(), mode: 'insensitive' } },
          { description: { contains: search.trim(), mode: 'insensitive' } },
        ],
      });
    }

    // Category filter
    if (category) {
      AND.push({ category });
    }

    // Membership filter
    if (filter === 'my') {
      AND.push({ ownerId: userId });
    } else if (filter === 'joined') {
      AND.push({ members: { some: { userId } } });
    } else {
      // 'all' — public groups OR groups user is a member of
      AND.push({
        OR: [
          { privacy: 'public' },
          { members: { some: { userId } } },
        ],
      });
    }

    const where: Prisma.GroupWhereInput = AND.length > 0 ? { AND } : {};

    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              isVerified: true,
              profile: { select: { avatarUrl: true } },
            },
          },
          members: {
            where: { userId },
            select: { role: true },
          },
          _count: {
            select: { members: true, posts: true },
          },
        },
        orderBy: [
          { memberCount: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.group.count({ where }),
    ]);

    return {
      groups: groups.map(g => this.formatGroup(g, userId)),
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
   * Gets a single group by ID.
   */
  static async getGroup(groupId: number, userId?: number) {
    const prisma = getPrisma();

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            isVerified: true,
            profile: { select: { avatarUrl: true } },
          },
        },
        members: userId
          ? {
              where: { userId },
              select: { role: true },
            }
          : false,
        _count: {
          select: { members: true, posts: true },
        },
      },
    });

    if (!group) {
      throw new CustomError('Group not found', 404);
    }

    // Privacy check — only block non-members for private/invite_only groups
    const isMember = userId
      ? Array.isArray(group.members) && group.members.length > 0
      : false;

    if (group.privacy !== 'public' && !isMember) {
      throw new CustomError('This group is private', 403);
    }

    return this.formatGroup(group, userId);
  }

  /**
   * Updates a group.
   */
  static async updateGroup(groupId: number, userId: number, data: UpdateGroupDto) {
    const prisma = getPrisma();

    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!member) {
      throw new CustomError('You are not a member of this group', 403);
    }

    if (member.role !== 'owner' && member.role !== 'admin') {
      throw new CustomError('Only owner or admin can update the group', 403);
    }

    const updateData: Prisma.GroupUpdateInput = {};

    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw new CustomError('Group name cannot be empty', 400);
      }
      updateData.name = data.name.trim();
    }

    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.coverUrl !== undefined) updateData.coverUrl = data.coverUrl;
    if (data.privacy !== undefined) updateData.privacy = data.privacy;
    if (data.category !== undefined) updateData.category = data.category;

    const group = await prisma.group.update({
      where: { id: groupId },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            isVerified: true,
            profile: { select: { avatarUrl: true } },
          },
        },
        _count: {
          select: { members: true, posts: true },
        },
      },
    });

    return this.formatGroup(group, userId);
  }

  /**
   * Deletes a group (only owner).
   */
  static async deleteGroup(groupId: number, userId: number) {
    const prisma = getPrisma();

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new CustomError('Group not found', 404);
    }

    if (group.ownerId !== userId) {
      throw new CustomError('Only the group owner can delete this group', 403);
    }

    await prisma.group.delete({
      where: { id: groupId },
    });

    return { success: true, message: 'Group deleted successfully' };
  }

  /**
   * Joins a group.
   */
  static async joinGroup(groupId: number, userId: number) {
    const prisma = getPrisma();

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new CustomError('Group not found', 404);
    }

    if (group.privacy === 'invite_only') {
      throw new CustomError('This group is invite-only', 403);
    }

    const existing = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (existing) {
      throw new CustomError('You are already a member of this group', 400);
    }

    await prisma.$transaction([
      prisma.groupMember.create({
        data: { groupId, userId, role: 'member' },
      }),
      prisma.group.update({
        where: { id: groupId },
        data: { memberCount: { increment: 1 } },
      }),
    ]);

    return { success: true, message: 'Joined group successfully' };
  }

  /**
   * Leaves a group.
   */
  static async leaveGroup(groupId: number, userId: number) {
    const prisma = getPrisma();

    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!member) {
      throw new CustomError('You are not a member of this group', 400);
    }

    if (member.role === 'owner') {
      throw new CustomError(
        'Group owner cannot leave. Transfer ownership or delete the group.',
        400
      );
    }

    await prisma.$transaction([
      prisma.groupMember.delete({
        where: {
          groupId_userId: { groupId, userId },
        },
      }),
      prisma.group.update({
        where: { id: groupId },
        data: { memberCount: { decrement: 1 } },
      }),
    ]);

    return { success: true, message: 'Left group successfully' };
  }

  /**
   * Gets group members.
   */
  static async getGroupMembers(groupId: number, page: number = 1, limit: number = 20) {
    const prisma = getPrisma();
    const skip = (page - 1) * limit;

    const [members, total] = await Promise.all([
      prisma.groupMember.findMany({
        where: { groupId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              isVerified: true,
              profile: {
                select: { avatarUrl: true, bio: true, location: true },
              },
            },
          },
        },
        orderBy: [
          { role: 'asc' },
          { joinedAt: 'asc' },
        ],
        skip,
        take: limit,
      }),
      prisma.groupMember.count({ where: { groupId } }),
    ]);

    return {
      members: members.map(m => ({
        id: m.user.id,
        name: m.user.name,
        isVerified: m.user.isVerified,
        avatarUrl: m.user.profile?.avatarUrl || null,
        bio: m.user.profile?.bio || null,
        location: m.user.profile?.location || null,
        role: m.role,
        joinedAt: m.joinedAt,
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
   * Promotes a member to admin.
   */
  static async promoteMember(groupId: number, userId: number, targetUserId: number) {
    const prisma = getPrisma();

    const admin = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!admin || admin.role !== 'owner') {
      throw new CustomError('Only the group owner can promote members', 403);
    }

    const target = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });

    if (!target) {
      throw new CustomError('User is not a member of this group', 404);
    }

    await prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId: targetUserId } },
      data: { role: 'admin' },
    });

    return { success: true, message: 'Member promoted to admin' };
  }

  /**
   * Removes a member (owner/admin only).
   */
  static async removeMember(groupId: number, userId: number, targetUserId: number) {
    const prisma = getPrisma();

    const admin = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!admin || (admin.role !== 'owner' && admin.role !== 'admin')) {
      throw new CustomError('Only owner or admin can remove members', 403);
    }

    const target = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });

    if (!target) {
      throw new CustomError('User is not a member of this group', 404);
    }

    if (target.role === 'owner') {
      throw new CustomError('Cannot remove the group owner', 400);
    }

    await prisma.$transaction([
      prisma.groupMember.delete({
        where: { groupId_userId: { groupId, userId: targetUserId } },
      }),
      prisma.group.update({
        where: { id: groupId },
        data: { memberCount: { decrement: 1 } },
      }),
    ]);

    return { success: true, message: 'Member removed successfully' };
  }

  /**
   * Gets group categories.
   */
  static async getCategories() {
    return [
      'Women Empowerment',
      'Career & Professional',
      'Health & Wellness',
      'Education & Learning',
      'Hobbies & Crafts',
      'Travel & Adventure',
      'Food & Cooking',
      'Fitness & Sports',
      'Arts & Culture',
      'Technology',
      'Business & Startups',
      'Parenting & Family',
      'Fashion & Beauty',
      'Books & Literature',
      'Spirituality',
      'Others',
    ];
  }

  /**
   * Creates a post in a group.
   */
  static async createGroupPost(
    groupId: number,
    userId: number,
    data: {
      content: string;
      mediaUrls?: string[];
      mediaTypes?: ('image' | 'video')[];
    }
  ) {
    const prisma = getPrisma();

    if (!data.content || !data.content.trim()) {
      throw new CustomError('Post content is required', 400);
    }

    if (data.content.length > 5000) {
      throw new CustomError('Post content must be less than 5000 characters', 400);
    }

    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!member) {
      throw new CustomError('You must be a member of this group to post', 403);
    }

    const post = await prisma.groupPost.create({
      data: {
        groupId,
        userId,
        content: data.content.trim(),
        mediaUrls: data.mediaUrls || [],
        mediaTypes: (data.mediaTypes || []) as any,
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
        likes: {
          where: { userId },
          select: { id: true },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    // Increment denormalized counter
    await prisma.group.update({
      where: { id: groupId },
      data: { postCount: { increment: 1 } },
    });

    return this.formatGroupPost(post, userId);
  }

  /**
   * Gets posts in a group with pagination.
   * BUG FIX #3: Only enforce membership when the group is not public.
   */
  static async getGroupPosts(
    groupId: number,
    userId: number,
    page: number = 1,
    limit: number = 10
  ) {
    const prisma = getPrisma();
    const skip = (page - 1) * limit;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, privacy: true },
    });

    if (!group) {
      throw new CustomError('Group not found', 404);
    }

    // Only require membership for non-public groups
    if (group.privacy !== 'public') {
      const member = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: { groupId, userId },
        },
      });

      if (!member) {
        throw new CustomError(
          'You must be a member of this group to view posts',
          403
        );
      }
    }

    const [posts, total] = await Promise.all([
      prisma.groupPost.findMany({
        where: { groupId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              isVerified: true,
              profile: { select: { avatarUrl: true } },
            },
          },
          likes: {
            where: { userId },
            select: { id: true },
          },
          _count: {
            select: { likes: true, comments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.groupPost.count({ where: { groupId } }),
    ]);

    return {
      posts: posts.map(p => this.formatGroupPost(p, userId)),
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
   * Gets a single group post.
   * BUG FIX #4: Only enforce membership when the group is not public.
   */
  static async getGroupPost(postId: number, userId: number) {
    const prisma = getPrisma();

    const post = await prisma.groupPost.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            isVerified: true,
            profile: { select: { avatarUrl: true } },
          },
        },
        group: { select: { id: true, name: true, privacy: true } },
        likes: { where: { userId }, select: { id: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    if (!post) {
      throw new CustomError('Post not found', 404);
    }

    // Only require membership for non-public groups
    if (post.group.privacy !== 'public') {
      const member = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: { groupId: post.groupId, userId },
        },
      });

      if (!member) {
        throw new CustomError(
          'You must be a member of this group to view posts',
          403
        );
      }
    }

    return this.formatGroupPost(post, userId);
  }

  /**
   * Updates a group post.
   */
  static async updateGroupPost(
    postId: number,
    userId: number,
    data: { content?: string }
  ) {
    const prisma = getPrisma();

    const post = await prisma.groupPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new CustomError('Post not found', 404);
    }

    if (post.userId !== userId) {
      throw new CustomError('You can only edit your own posts', 403);
    }

    const updateData: Prisma.GroupPostUpdateInput = {};

    if (data.content !== undefined) {
      if (!data.content.trim()) {
        throw new CustomError('Post content cannot be empty', 400);
      }
      updateData.content = data.content.trim();
    }

    const updatedPost = await prisma.groupPost.update({
      where: { id: postId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            isVerified: true,
            profile: { select: { avatarUrl: true } },
          },
        },
        likes: { where: { userId }, select: { id: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    return this.formatGroupPost(updatedPost, userId);
  }

  /**
   * Deletes a group post.
   */
  static async deleteGroupPost(postId: number, userId: number) {
    const prisma = getPrisma();

    const post = await prisma.groupPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new CustomError('Post not found', 404);
    }

    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId: post.groupId, userId },
      },
    });

    const isPostOwner = post.userId === userId;
    const isGroupAdmin =
      member && (member.role === 'owner' || member.role === 'admin');

    if (!isPostOwner && !isGroupAdmin) {
      throw new CustomError('You do not have permission to delete this post', 403);
    }

    await prisma.$transaction([
      prisma.groupPost.delete({
        where: { id: postId },
      }),
      prisma.group.update({
        where: { id: post.groupId },
        data: { postCount: { decrement: 1 } },
      }),
    ]);

    return { success: true, message: 'Post deleted successfully' };
  }

  /**
   * Helper to format group.
   * BUG FIX #2: Trust group.postCount (source of truth). Fallback to _count.members only for memberCount.
   */
  private static formatGroup(group: any, userId?: number) {
    const membership =
      group.members && group.members.length > 0 ? group.members[0] : null;

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      coverUrl: group.coverUrl,
      privacy: group.privacy,
      category: group.category,
      // memberCount is denormalized on Group model; fall back to _count only if missing
      memberCount:
        typeof group.memberCount === 'number'
          ? group.memberCount
          : group._count?.members || 0,
      // postCount is denormalized on Group model
      postCount:
        typeof group.postCount === 'number'
          ? group.postCount
          : group._count?.posts || 0,
      owner: group.owner
        ? {
            id: group.owner.id,
            name: group.owner.name,
            isVerified: group.owner.isVerified,
            avatarUrl: group.owner.profile?.avatarUrl || null,
          }
        : null,
      isMember: Boolean(membership),
      myRole: membership?.role || null,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }

  /**
   * Helper to format group post.
   * BUG FIX #5: Always compute likedByMe from likes array (works even when likes=[{}]).
   */
  private static formatGroupPost(post: any, userId?: number) {
    const likes = post.likes || [];
    const likedByMe = userId
      ? likes.some((like: any) => like.userId === userId || like.id)
      : false;

    return {
      id: post.id,
      groupId: post.groupId,
      group: post.group
        ? { id: post.group.id, name: post.group.name }
        : null,
      content: post.content,
      mediaUrls: post.mediaUrls || [],
      mediaTypes: post.mediaTypes || [],
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: post.user
        ? {
            id: post.user.id,
            name: post.user.name,
            isVerified: post.user.isVerified,
            avatarUrl: post.user.profile?.avatarUrl || null,
          }
        : null,
      likesCount: post._count?.likes || 0,
      commentsCount: post._count?.comments || 0,
      likedByMe,
    };
  }
}