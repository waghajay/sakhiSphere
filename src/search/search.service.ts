import { getPrisma } from '../config/database';
import { Prisma } from '@prisma/client';

export class SearchService {
  /**
   * Searches for users by name, email, location, or occupation.
   */
  static async searchUsers(
    query: string,
    page: number = 1,
    limit: number = 20,
    currentUserId?: number
  ) {
    const prisma = getPrisma();
    const skip = (page - 1) * limit;

    if (!query || query.trim().length < 2) {
      return {
        users: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasMore: false,
        },
      };
    }

    const searchTerm = query.trim();
    const searchPattern = `%${searchTerm}%`;

    const where: Prisma.UserWhereInput = {
      isEmailVerified: true,
      id: currentUserId ? { not: currentUserId } : undefined,
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        {
          profile: {
            OR: [
              { location: { contains: searchTerm, mode: 'insensitive' } },
              { occupation: { contains: searchTerm, mode: 'insensitive' } },
              { bio: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
        },
        {
          interests: {
            some: {
              interest: {
                name: { contains: searchTerm, mode: 'insensitive' },
              },
            },
          },
        },
      ],
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          profile: {
            select: {
              avatarUrl: true,
              bio: true,
              location: true,
              occupation: true,
            },
          },
          interests: {
            include: {
              interest: true,
            },
            take: 3,
          },
          _count: {
            select: {
              followers: true,
              following: true,
              posts: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    // Check follow status for each user
    const usersWithFollowStatus = await Promise.all(
      users.map(async (user) => {
        const isFollowing = currentUserId
          ? await prisma.follow.findUnique({
              where: {
                followerId_followingId: {
                  followerId: currentUserId,
                  followingId: user.id,
                },
              },
            })
          : null;

        return {
          id: user.id,
          name: user.name,
          isVerified: user.isVerified,
          avatarUrl: user.profile?.avatarUrl || null,
          bio: user.profile?.bio || null,
          location: user.profile?.location || null,
          occupation: user.profile?.occupation || null,
          interests: user.interests.map(ui => ui.interest),
          followersCount: user._count.followers,
          followingCount: user._count.following,
          postsCount: user._count.posts,
          isFollowing: Boolean(isFollowing),
        };
      })
    );

    return {
      users: usersWithFollowStatus,
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
   * Searches for posts by content.
   */
  static async searchPosts(
    query: string,
    page: number = 1,
    limit: number = 20
  ) {
    const prisma = getPrisma();
    const skip = (page - 1) * limit;

    if (!query || query.trim().length < 2) {
      return {
        posts: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasMore: false,
        },
      };
    }

    const searchTerm = query.trim();

    const where: Prisma.PostWhereInput = {
      content: { contains: searchTerm, mode: 'insensitive' },
      visibility: 'public',
    };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
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
              likes: true,
              comments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    return {
      posts: posts.map(post => ({
        id: post.id,
        content: post.content,
        mediaUrls: post.mediaUrls,
        mediaTypes: post.mediaTypes,
        createdAt: post.createdAt,
        author: {
          id: post.user.id,
          name: post.user.name,
          isVerified: post.user.isVerified,
          avatarUrl: post.user.profile?.avatarUrl || null,
        },
        likesCount: post._count.likes,
        commentsCount: post._count.comments,
        likedByMe: false,
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
}