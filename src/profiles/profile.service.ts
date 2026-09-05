import { getPrisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';
import { CloudinaryService } from '../services/cloudinary.service';
import fs from 'fs';

export interface UpdateProfileDto {
  name?: string;
  bio?: string;
  location?: string;
  occupation?: string;
  avatarUrl?: string;
}

export class ProfileService {
  /**
   * Gets user profile.
   */
  static async getProfile(userId: number) {
    const prisma = getPrisma();
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        interests: {
          include: {
            interest: true,
          },
        },
      },
    });

    if (!user) {
      throw new CustomError('User not found', 404);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      bio: user.profile?.bio,
      avatarUrl: user.profile?.avatarUrl,
      location: user.profile?.location,
      occupation: user.profile?.occupation,
      isEmailVerified: user.isEmailVerified,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      interests: user.interests.map(ui => ui.interest),
    };
  }

  /**
   * Updates user profile including avatar.
   */
  static async updateProfile(userId: number, data: UpdateProfileDto) {
    const prisma = getPrisma();

    await prisma.$transaction(async (tx) => {
      // Update name in users table
      if (data.name?.trim()) {
        await tx.user.update({
          where: { id: userId },
          data: { name: data.name.trim() },
        });
      }

      // Update profile fields
      const profileData: Prisma.ProfileUpdateInput = {};
      
      if (data.bio !== undefined) profileData.bio = data.bio;
      if (data.location !== undefined) profileData.location = data.location;
      if (data.occupation !== undefined) profileData.occupation = data.occupation;
      if (data.avatarUrl !== undefined) profileData.avatarUrl = data.avatarUrl;

      if (Object.keys(profileData).length > 0) {
        await tx.profile.upsert({
          where: { userId },
          create: {
            userId,
            bio: data.bio,
            location: data.location,
            occupation: data.occupation,
            avatarUrl: data.avatarUrl,
          },
          update: {
            bio: data.bio !== undefined ? data.bio : undefined,
            location: data.location !== undefined ? data.location : undefined,
            occupation: data.occupation !== undefined ? data.occupation : undefined,
            avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : undefined,
          },
        });
      }
    });

    return this.getProfile(userId);
  }

  /**
   * Uploads profile photo.
   */
  static async uploadProfilePhoto(userId: number, filePath: string) {
    const prisma = getPrisma();

    // Upload to Cloudinary
    const result = await CloudinaryService.uploadImage(
      filePath,
      `sakhisphere/profile_photos/user_${userId}`
    );

    // Update profile with new avatar URL
    await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        avatarUrl: result.url,
      },
      update: {
        avatarUrl: result.url,
      },
    });

    // Delete local file after upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      avatarUrl: result.url,
      message: 'Profile photo updated successfully',
    };
  }

  /**
   * Gets public profile.
   */
  static async getPublicProfile(targetUserId: number) {
    const prisma = getPrisma();

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        profile: true,
        interests: {
          include: {
            interest: true,
          },
        },
      },
    });

    if (!user) {
      throw new CustomError('Member profile not found', 404);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      bio: user.profile?.bio || null,
      avatar_url: user.profile?.avatarUrl || null,
      location: user.profile?.location || null,
      occupation: user.profile?.occupation || null,
      is_verified: user.isVerified,
      createdAt: user.createdAt,
      interests: user.interests.map(ui => ({
        id: ui.interest.id,
        name: ui.interest.name,
        category: ui.interest.category,
        icon: ui.interest.icon,
      })),
      privacy: {
        profileVisibility: user.profile?.privacyProfileVisibility || 'members_only',
        allowMessages: user.profile?.privacyAllowMessages || 'all_members',
      },
    };
  }
}