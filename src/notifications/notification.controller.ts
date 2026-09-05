import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { NotificationService } from './notification.service';
import { getPrisma } from '../config/database';

export class NotificationController {
  /**
   * GET /api/notifications
   */
  static async getUserNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await NotificationService.getUserNotifications(req.user.id, page, limit);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/notifications/register-token
   * Register push notification token.
   */
  static async registerToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { token, platform } = req.body;

      if (!token || !platform) {
        res.status(400).json({ success: false, message: 'token and platform are required' });
        return;
      }

      const prisma = getPrisma();
      
      await prisma.pushToken.upsert({
        where: { token },
        update: { userId: req.user.id, platform },
        create: { userId: req.user.id, token, platform },
      });

      res.status(200).json({ success: true, message: 'Token registered successfully' });
    } catch (error) {
      next(error);
    }
  }
}