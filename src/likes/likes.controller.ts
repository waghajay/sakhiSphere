import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { LikesService } from './likes.service';

export class LikesController {
  /**
   * POST /api/posts/:postId/like
   * Toggles like/unlike on a post.
   */
  static async toggleLike(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const postId = parseInt(req.params.postId, 10);

      if (isNaN(postId)) {
        res.status(400).json({ success: false, message: 'Invalid post ID' });
        return;
      }

      const result = await LikesService.toggleLike(req.user.id, postId);
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
   * GET /api/posts/:postId/likes
   * Gets all likes on a post.
   */
  static async getPostLikes(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const postId = parseInt(req.params.postId, 10);

      if (isNaN(postId)) {
        res.status(400).json({ success: false, message: 'Invalid post ID' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await LikesService.getPostLikes(postId, page, limit);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users/:userId/liked-posts
   * Gets posts liked by a user.
   */
  static async getUserLikedPosts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = parseInt(req.params.userId, 10);

      if (isNaN(userId)) {
        res.status(400).json({ success: false, message: 'Invalid user ID' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await LikesService.getUserLikedPosts(userId, page, limit);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/posts/:postId/like-status
   * Checks if user liked a post.
   */
  static async checkLikeStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const postId = parseInt(req.params.postId, 10);

      if (isNaN(postId)) {
        res.status(400).json({ success: false, message: 'Invalid post ID' });
        return;
      }

      const result = await LikesService.checkLikeStatus(req.user.id, postId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}