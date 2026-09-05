import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SearchService } from './search.service';

export class SearchController {
  /**
   * GET /api/search/users?q=query
   * Searches for users.
   */
  static async searchUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query.q as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await SearchService.searchUsers(query, page, limit, req.user?.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/search/posts?q=query
   * Searches for posts.
   */
  static async searchPosts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query.q as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await SearchService.searchPosts(query, page, limit);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}