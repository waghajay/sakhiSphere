import { getPrisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';

export class FollowService {
  /**
   * Toggles follow/unfollow on a user.
   */
  static async toggleFollow(userId: number, targetUserId: number) {
    const prisma = getPrisma();

    // Cannot follow yourself
    if (userId === targetUserId) {
      throw new CustomError('You cannot follow yourself', 400);
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new CustomError('User not found', 404);
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });

    if (existingFollow) {
      // Unfollow
      await prisma.follow.delete({
        where: { id: existingFollow.id },
      });

      const followerCount = await prisma.follow.count({
        where: { followingId: targetUserId },
      });

      return {
        following: false,
        followersCount: followerCount,
        message: 'Unfollowed successfully',
      };
    } else {
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
        throw new CustomError('You cannot follow this user', 403);
      }

      // Follow
      await prisma.follow.create({
        data: {
          followerId: userId,
          followingId: targetUserId,
        },
      });

      const followerCount = await prisma.follow.count({
        where: { followingId: targetUserId },
      });

      return {
        following: true,
        followersCount: followerCount,
        message: 'Followed successfully',
      };
    }
  }

  /**
   * Gets followers of a user.
   */
  static async getFollowers(
    userId: number,
    page: number = 1,
    limit: number = 20,
    currentUserId?: number
  ) {
    const prisma = getPrisma();
    const skip = (page - 1) * limit;

    const where = { followingId: userId };

    const [follows, total] = await Promise.all([
      prisma.follow.findMany({
        where,
        include: {
          follower: {
            select: {
              id: true,
              name: true,
              isVerified: true,
              profile: {
                select: {
                  avatarUrl: true,
                  bio: true,
                  location: true,
                  occupation: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.follow.count({ where }),
    ]);

    // Check follow status for each follower
    const users = await Promise.all(
      follows.map(async (follow) => {
        const isFollowing = currentUserId
          ? await prisma.follow.findUnique({
              where: {
                followerId_followingId: {
                  followerId: currentUserId,
                  followingId: follow.followerId,
                },
              },
            })
          : null;

        return {
          id: follow.follower.id,
          name: follow.follower.name,
          isVerified: follow.follower.isVerified,
          avatarUrl: follow.follower.profile?.avatarUrl || null,
          bio: follow.follower.profile?.bio || null,
          location: follow.follower.profile?.location || null,
          occupation: follow.follower.profile?.occupation || null,
          isFollowing: Boolean(isFollowing),
          followedAt: follow.createdAt,
        };
      })
    );

    return {
      users,
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
   * Gets users that a user is following.
   */
  static async getFollowing(
    userId: number,
    page: number = 1,
    limit: number = 20,
    currentUserId?: number
  ) {
    const prisma = getPrisma();
    const skip = (page - 1) * limit;

    const where = { followerId: userId };

    const [follows, total] = await Promise.all([
      prisma.follow.findMany({
        where,
        include: {
          following: {
            select: {
              id: true,
              name: true,
              isVerified: true,
              profile: {
                select: {
                  avatarUrl: true,
                  bio: true,
                  location: true,
                  occupation: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.follow.count({ where }),
    ]);

    const users = await Promise.all(
      follows.map(async (follow) => {
        const isFollowing = currentUserId
          ? await prisma.follow.findUnique({
              where: {
                followerId_followingId: {
                  followerId: currentUserId,
                  followingId: follow.followingId,
                },
              },
            })
          : null;

        return {
          id: follow.following.id,
          name: follow.following.name,
          isVerified: follow.following.isVerified,
          avatarUrl: follow.following.profile?.avatarUrl || null,
          bio: follow.following.profile?.bio || null,
          location: follow.following.profile?.location || null,
          occupation: follow.following.profile?.occupation || null,
          isFollowing: Boolean(isFollowing),
          followedAt: follow.createdAt,
        };
      })
    );

    return {
      users,
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
   * Gets follower and following counts for a user.
   */
  static async getFollowCounts(userId: number) {
    const prisma = getPrisma();

    const [followersCount, followingCount, postsCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
      prisma.post.count({ where: { userId } }),
    ]);

    return {
      followersCount,
      followingCount,
      postsCount,
    };
  }

  /**
   * Checks if current user is following target user.
   */
  static async checkFollowStatus(userId: number, targetUserId: number) {
    const prisma = getPrisma();

    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });

    const followersCount = await prisma.follow.count({
      where: { followingId: targetUserId },
    });

    return {
      following: Boolean(follow),
      followersCount,
    };
  }

  /**
   * Gets mutual connections between two users.
   */
  static async getMutualConnections(userId: number, targetUserId: number) {
    const prisma = getPrisma();

    // Get users that both follow
    const mutualConnections = await prisma.follow.findMany({
      where: {
        followerId: targetUserId,
        following: {
          followers: {
            some: {
              followerId: userId,
            },
          },
        },
      },
      include: {
        following: {
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
      take: 5,
    });

    return mutualConnections.map(connection => ({
      id: connection.following.id,
      name: connection.following.name,
      isVerified: connection.following.isVerified,
      avatarUrl: connection.following.profile?.avatarUrl || null,
    }));
  }

  /**
   * Gets suggested users to follow.
   */
  static async getSuggestedUsers(userId: number, limit: number = 10) {
    const prisma = getPrisma();

    // Get users that follow the same people as current user
    const userFollowing = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = userFollowing.map(f => f.followingId);

    // Get users followed by the people current user follows
    const suggestions = await prisma.user.findMany({
      where: {
        id: { not: userId },
        isEmailVerified: true,
        NOT: {
          followers: {
            some: {
              followerId: userId,
            },
          },
        },
        followers: {
          some: {
            followerId: { in: followingIds },
          },
        },
      },
      include: {
        profile: {
          select: {
            avatarUrl: true,
            bio: true,
          },
        },
        _count: {
          select: {
            followers: true,
          },
        },
      },
      take: limit,
    });

    return suggestions.map(user => ({
      id: user.id,
      name: user.name,
      isVerified: user.isVerified,
      avatarUrl: user.profile?.avatarUrl || null,
      bio: user.profile?.bio || null,
      followersCount: user._count.followers,
      isFollowing: false,
      isSuggested: true,
    }));
  }
}