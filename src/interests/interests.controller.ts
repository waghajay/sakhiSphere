import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { InterestsService } from './interests.service';

export class InterestsController {
  /**
   * GET /api/interests (Public / Protected)
   */
  static async getAllInterests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const interests = await InterestsService.getAllInterests();
      res.status(200).json({ success: true, data: { interests } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/interests/my (Protected)
   */
  static async getMyInterests(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const interests = await InterestsService.getUserInterests(req.user.id);
      res.status(200).json({ success: true, data: { interests } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/interests/select (Protected)
   */
  static async selectInterests(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { interestIds } = req.body;
      if (!Array.isArray(interestIds)) {
        res.status(400).json({ success: false, message: 'interestIds must be an array of numbers' });
        return;
      }

      const updated = await InterestsService.setUserInterests(req.user.id, interestIds);
      res.status(200).json({
        success: true,
        message: 'Interests saved successfully',
        data: { interests: updated },
      });
    } catch (error) {
      next(error);
    }
  }
}
