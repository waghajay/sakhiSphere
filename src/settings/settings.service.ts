import bcrypt from 'bcryptjs';
import { getPrisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';

export class SettingsService {
  /**
   * Gets all user settings.
   */
  static async getSettings(userId: number) {
    const prisma = getPrisma();

    const [settings, profile] = await Promise.all([
      prisma.userSettings.findUnique({
        where: { userId },
      }),
      prisma.profile.findUnique({
        where: { userId },
      }),
    ]);

    return {
      notifications: {
        pushNotifications: settings?.pushNotifications ?? true,
        emailNotifications: settings?.emailNotifications ?? true,
        chatNotifications: settings?.chatNotifications ?? true,
        communityUpdates: settings?.communityUpdates ?? true,
      },
      privacy: {
        profileVisibility: profile?.privacyProfileVisibility || 'members_only',
        allowMessages: profile?.privacyAllowMessages || 'all_members',
        showOnlineStatus: profile?.privacyShowOnlineStatus ?? true,
      },
    };
  }

  /**
   * Updates notification settings.
   * Accepts both camelCase and snake_case keys.
   */
  static async updateNotifications(userId: number, data: any) {
    const prisma = getPrisma();

    // Build update data with correct Prisma field names
    const updateData: Prisma.UserSettingsUpdateInput = {};

    if (data.pushNotifications !== undefined || data.push_notifications !== undefined) {
      updateData.pushNotifications = data.pushNotifications ?? data.push_notifications;
    }
    if (data.emailNotifications !== undefined || data.email_notifications !== undefined) {
      updateData.emailNotifications = data.emailNotifications ?? data.email_notifications;
    }
    if (data.chatNotifications !== undefined || data.chat_notifications !== undefined) {
      updateData.chatNotifications = data.chatNotifications ?? data.chat_notifications;
    }
    if (data.communityUpdates !== undefined || data.community_updates !== undefined) {
      updateData.communityUpdates = data.communityUpdates ?? data.community_updates;
    }

    await prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        pushNotifications: updateData.pushNotifications === true,
        emailNotifications: updateData.emailNotifications === true,
        chatNotifications: updateData.chatNotifications === true,
        communityUpdates: updateData.communityUpdates === true,
      },
      update: updateData,
    });

    return this.getSettings(userId);
  }

  /**
   * Updates privacy settings.
   * Accepts both camelCase and snake_case keys.
   */
  static async updatePrivacy(userId: number, data: any) {
    const prisma = getPrisma();

    // Build update data with correct Prisma field names
    const updateData: Prisma.ProfileUpdateInput = {};

    // Map to correct Prisma field names with 'privacy' prefix
    const profileVisibility = data.profileVisibility ?? data.privacy_profile_visibility;
    const allowMessages = data.allowMessages ?? data.privacy_allow_messages;
    const showOnlineStatus = data.showOnlineStatus ?? data.privacy_show_online_status;

    if (profileVisibility !== undefined) {
      updateData.privacyProfileVisibility = profileVisibility;
    }
    if (allowMessages !== undefined) {
      updateData.privacyAllowMessages = allowMessages;
    }
    if (showOnlineStatus !== undefined) {
      updateData.privacyShowOnlineStatus = showOnlineStatus;
    }

    await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        privacyProfileVisibility: (profileVisibility as any) || 'members_only',
        privacyAllowMessages: (allowMessages as any) || 'all_members',
        privacyShowOnlineStatus: showOnlineStatus ?? true,
      },
      update: updateData,
    });

    return this.getSettings(userId);
  }

  /**
   * Changes user password.
   */
  static async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const prisma = getPrisma();

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new CustomError('User not found', 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new CustomError('Incorrect current password', 400);
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { success: true, message: 'Password updated successfully' };
  }
}