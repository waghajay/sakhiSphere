import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SettingsService } from './settings.service';

export class SettingsController {
  /**
   * GET /api/settings (Protected)
   */
  static async getSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const settings = await SettingsService.getSettings(req.user.id);
      res.status(200).json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/settings/notifications (Protected)
   * Accepts both camelCase and snake_case keys
   */
  static async updateNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const body = req.body;

      // Convert snake_case to camelCase
      const data = {
        pushNotifications: body.pushNotifications ?? body.push_notifications,
        emailNotifications: body.emailNotifications ?? body.email_notifications,
        chatNotifications: body.chatNotifications ?? body.chat_notifications,
        communityUpdates: body.communityUpdates ?? body.community_updates,
      };

      const updated = await SettingsService.updateNotifications(req.user.id, data);
      res.status(200).json({
        success: true,
        message: 'Notification settings updated',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/settings/privacy (Protected)
   * Accepts both camelCase and snake_case keys
   */
  static async updatePrivacy(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const body = req.body;

      // Convert snake_case to camelCase
      const data = {
        profileVisibility: body.profileVisibility ?? body.privacy_profile_visibility,
        allowMessages: body.allowMessages ?? body.privacy_allow_messages,
        showOnlineStatus: body.showOnlineStatus ?? body.privacy_show_online_status,
      };

      const updated = await SettingsService.updatePrivacy(req.user.id, data);
      res.status(200).json({
        success: true,
        message: 'Privacy settings updated',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/settings/password (Protected)
   */
  static async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword || newPassword.length < 6) {
        res.status(400).json({
          success: false,
          message: 'Current password and new password (min 6 characters) are required',
        });
        return;
      }

      const result = await SettingsService.changePassword(req.user.id, currentPassword, newPassword);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}