import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { CommentsService } from './comments.service';

export class CommentsController {
  /**
   * POST /api/posts/:postId/comments
   * Creates a new comment on a post.
   */
  static async createComment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const postId = parseInt(req.params.postId, 10);
      const { content, parentId } = req.body;

      if (isNaN(postId)) {
        res.status(400).json({ success: false, message: 'Invalid post ID' });
        return;
      }

      if (!content || !content.trim()) {
        res.status(400).json({ success: false, message: 'Comment content is required' });
        return;
      }

      const comment = await CommentsService.createComment(req.user.id, postId, {
        content,
        parentId: parentId ? parseInt(parentId, 10) : undefined,
      });

      res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        data: { comment },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/posts/:postId/comments
   * Gets all comments on a post.
   */
  static async getPostComments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const postId = parseInt(req.params.postId, 10);

      if (isNaN(postId)) {
        res.status(400).json({ success: false, message: 'Invalid post ID' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await CommentsService.getPostComments(postId, page, limit);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/comments/:commentId/replies
   * Gets replies to a comment.
   */
  static async getCommentReplies(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const commentId = parseInt(req.params.commentId, 10);

      if (isNaN(commentId)) {
        res.status(400).json({ success: false, message: 'Invalid comment ID' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await CommentsService.getCommentReplies(commentId, page, limit);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/comments/:commentId
   * Updates a comment.
   */
  static async updateComment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const commentId = parseInt(req.params.commentId, 10);
      const { content } = req.body;

      if (isNaN(commentId)) {
        res.status(400).json({ success: false, message: 'Invalid comment ID' });
        return;
      }

      if (!content || !content.trim()) {
        res.status(400).json({ success: false, message: 'Comment content is required' });
        return;
      }

      const comment = await CommentsService.updateComment(commentId, req.user.id, { content });
      res.status(200).json({
        success: true,
        message: 'Comment updated successfully',
        data: { comment },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/comments/:commentId
   * Deletes a comment.
   */
  static async deleteComment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const commentId = parseInt(req.params.commentId, 10);

      if (isNaN(commentId)) {
        res.status(400).json({ success: false, message: 'Invalid comment ID' });
        return;
      }

      const result = await CommentsService.deleteComment(commentId, req.user.id);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/comments/:commentId
   * Gets a single comment.
   */
  static async getComment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const commentId = parseInt(req.params.commentId, 10);

      if (isNaN(commentId)) {
        res.status(400).json({ success: false, message: 'Invalid comment ID' });
        return;
      }

      const comment = await CommentsService.getComment(commentId);
      res.status(200).json({ success: true, data: { comment } });
    } catch (error) {
      next(error);
    }
  }
}