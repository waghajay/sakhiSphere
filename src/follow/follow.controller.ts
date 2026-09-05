import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { FollowService } from './follow.service';

export class FollowController {
  /**
   * POST /api/users/:userId/follow
   * Toggles follow/unfollow.
   */
  static async toggleFollow(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const targetUserId = parseInt(req.params.userId, 10);

      if (isNaN(targetUserId)) {
        res.status(400).json({ success: false, message: 'Invalid user ID' });
        return;
      }

      const result = await FollowService.toggleFollow(req.user.id, targetUserId);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users/:userId/followers
   * Gets followers list.
   */
  static async getFollowers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = parseInt(req.params.userId, 10);

      if (isNaN(userId)) {
        res.status(400).json({ success: false, message: 'Invalid user ID' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await FollowService.getFollowers(userId, page, limit, req.user?.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users/:userId/following
   * Gets following list.
   */
  static async getFollowing(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = parseInt(req.params.userId, 10);

      if (isNaN(userId)) {
        res.status(400).json({ success: false, message: 'Invalid user ID' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await FollowService.getFollowing(userId, page, limit, req.user?.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users/:userId/follow-counts
   * Gets follower/following counts.
   */
  static async getFollowCounts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = parseInt(req.params.userId, 10);

      if (isNaN(userId)) {
        res.status(400).json({ success: false, message: 'Invalid user ID' });
        return;
      }

      const result = await FollowService.getFollowCounts(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users/:userId/follow-status
   * Checks follow status.
   */
  static async checkFollowStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const targetUserId = parseInt(req.params.userId, 10);

      if (isNaN(targetUserId)) {
        res.status(400).json({ success: false, message: 'Invalid user ID' });
        return;
      }

      const result = await FollowService.checkFollowStatus(req.user.id, targetUserId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }


  // Add to follow.controller.ts

/**
 * GET /api/users/:userId/mutual-connections
 * Gets mutual connections between users.
 */
static async getMutualConnections(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const targetUserId = parseInt(req.params.userId, 10);

    if (isNaN(targetUserId)) {
      res.status(400).json({ success: false, message: 'Invalid user ID' });
      return;
    }

    const connections = await FollowService.getMutualConnections(req.user.id, targetUserId);
    res.status(200).json({ success: true, data: { connections } });
  } catch (error) {
    next(error);
  }
}

  /**
   * GET /api/users/suggested
   * Gets suggested users to follow.
   */
  static async getSuggestedUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const result = await FollowService.getSuggestedUsers(req.user.id, limit);
      res.status(200).json({ success: true, data: { users: result } });
    } catch (error) {
      next(error);
    }
  }
}