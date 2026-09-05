import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PostsService } from './posts.service';

export class PostsController {
  static async createPost(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { content, mediaUrls, mediaTypes, visibility } = req.body;

      if (!content || !content.trim()) {
        res.status(400).json({ success: false, message: 'Post content is required' });
        return;
      }

      const post = await PostsService.createPost(req.user.id, {
        content,
        mediaUrls: mediaUrls || [],
        mediaTypes: mediaTypes || [],
        visibility: visibility || 'public',
      });

      res.status(201).json({
        success: true,
        message: 'Post created successfully',
        data: { post },
      });
    } catch (error) {
      next(error);
    }
  }

  // SINGLE getFeed method (remove duplicate)
  static async getFeed(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const sortBy = (req.query.sortBy as string) || 'recent';

      const validSortOptions = ['recent', 'popular', 'following', 'interests'];
      if (!validSortOptions.includes(sortBy)) {
        res.status(400).json({ 
          success: false, 
          message: 'Invalid sortBy option. Use: recent, popular, following, interests' 
        });
        return;
      }

      const result = await PostsService.getFeed(req.user.id, { page, limit, sortBy: sortBy as any });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getPost(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const postId = parseInt(req.params.id, 10);

      if (isNaN(postId)) {
        res.status(400).json({ success: false, message: 'Invalid post ID' });
        return;
      }

      const post = await PostsService.getPost(postId, req.user?.id);
      res.status(200).json({ success: true, data: { post } });
    } catch (error) {
      next(error);
    }
  }

  static async updatePost(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const postId = parseInt(req.params.id, 10);

      if (isNaN(postId)) {
        res.status(400).json({ success: false, message: 'Invalid post ID' });
        return;
      }

      const post = await PostsService.updatePost(postId, req.user.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Post updated successfully',
        data: { post },
      });
    } catch (error) {
      next(error);
    }
  }

  static async deletePost(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const postId = parseInt(req.params.id, 10);

      if (isNaN(postId)) {
        res.status(400).json({ success: false, message: 'Invalid post ID' });
        return;
      }

      const result = await PostsService.deletePost(postId, req.user.id);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserPosts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetUserId = parseInt(req.params.userId, 10);

      if (isNaN(targetUserId)) {
        res.status(400).json({ success: false, message: 'Invalid user ID' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await PostsService.getUserPosts(targetUserId, page, limit, req.user?.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}