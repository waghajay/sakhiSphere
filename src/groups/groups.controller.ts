import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { GroupsService } from './groups.service';
import { GroupPostInteractionsService } from './group-post-interactions.service';

export class GroupsController {
  /**
   * POST /api/groups
   */
  static async createGroup(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const group = await GroupsService.createGroup(req.user.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Group created successfully',
        data: { group },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/groups
   */
  static async getGroups(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const category = req.query.category as string;
      const filter = (req.query.filter as 'all' | 'my' | 'joined') || 'all';

      const result = await GroupsService.getGroups(req.user.id, {
        page, limit, search, category, filter,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/groups/:id
   */
  static async getGroup(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = parseInt(req.params.id, 10);

      if (isNaN(groupId)) {
        res.status(400).json({ success: false, message: 'Invalid group ID' });
        return;
      }

      const group = await GroupsService.getGroup(groupId, req.user?.id);
      res.status(200).json({ success: true, data: { group } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/groups/:id
   */
  static async updateGroup(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const groupId = parseInt(req.params.id, 10);

      if (isNaN(groupId)) {
        res.status(400).json({ success: false, message: 'Invalid group ID' });
        return;
      }

      const group = await GroupsService.updateGroup(groupId, req.user.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Group updated successfully',
        data: { group },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/groups/:id
   */
  static async deleteGroup(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const groupId = parseInt(req.params.id, 10);

      if (isNaN(groupId)) {
        res.status(400).json({ success: false, message: 'Invalid group ID' });
        return;
      }

      const result = await GroupsService.deleteGroup(groupId, req.user.id);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/groups/:id/join
   */
  static async joinGroup(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const groupId = parseInt(req.params.id, 10);

      if (isNaN(groupId)) {
        res.status(400).json({ success: false, message: 'Invalid group ID' });
        return;
      }

      const result = await GroupsService.joinGroup(groupId, req.user.id);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }


// Add these methods to the existing GroupsController class

  /**
   * POST /api/groups/:id/posts
   */
  static async createGroupPost(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const groupId = parseInt(req.params.id, 10);

      if (isNaN(groupId)) {
        res.status(400).json({ success: false, message: 'Invalid group ID' });
        return;
      }

      const post = await GroupsService.createGroupPost(groupId, req.user.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Post created successfully',
        data: { post },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/groups/:id/posts
   */
  static async getGroupPosts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const groupId = parseInt(req.params.id, 10);

      if (isNaN(groupId)) {
        res.status(400).json({ success: false, message: 'Invalid group ID' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await GroupsService.getGroupPosts(groupId, req.user.id, page, limit);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/groups/posts/:postId
   */
  static async getGroupPost(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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

      const post = await GroupsService.getGroupPost(postId, req.user.id);
      res.status(200).json({ success: true, data: { post } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/groups/posts/:postId
   */
  static async updateGroupPost(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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

      const post = await GroupsService.updateGroupPost(postId, req.user.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Post updated successfully',
        data: { post },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/groups/posts/:postId
   */
  static async deleteGroupPost(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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

      const result = await GroupsService.deleteGroupPost(postId, req.user.id);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/groups/:id/leave
   */
  static async leaveGroup(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const groupId = parseInt(req.params.id, 10);

      if (isNaN(groupId)) {
        res.status(400).json({ success: false, message: 'Invalid group ID' });
        return;
      }

      const result = await GroupsService.leaveGroup(groupId, req.user.id);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/groups/:id/members
   */
  static async getGroupMembers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = parseInt(req.params.id, 10);

      if (isNaN(groupId)) {
        res.status(400).json({ success: false, message: 'Invalid group ID' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await GroupsService.getGroupMembers(groupId, page, limit);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/groups/:id/members/:userId/promote
   */
  static async promoteMember(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const groupId = parseInt(req.params.id, 10);
      const targetUserId = parseInt(req.params.userId, 10);

      if (isNaN(groupId) || isNaN(targetUserId)) {
        res.status(400).json({ success: false, message: 'Invalid IDs' });
        return;
      }

      const result = await GroupsService.promoteMember(groupId, req.user.id, targetUserId);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/groups/:id/members/:userId
   */
  static async removeMember(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const groupId = parseInt(req.params.id, 10);
      const targetUserId = parseInt(req.params.userId, 10);

      if (isNaN(groupId) || isNaN(targetUserId)) {
        res.status(400).json({ success: false, message: 'Invalid IDs' });
        return;
      }

      const result = await GroupsService.removeMember(groupId, req.user.id, targetUserId);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/groups/categories
   */
  static async getCategories(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await GroupsService.getCategories();
      res.status(200).json({ success: true, data: { categories } });
    } catch (error) {
      next(error);
    }
  }

  // Add these methods to GroupsController


  /**
   * POST /api/groups/posts/:postId/like
   */
  static async togglePostLike(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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

      const result = await GroupPostInteractionsService.toggleLike(postId, req.user.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/groups/posts/:postId/comments
   */
  static async createPostComment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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

      const comment = await GroupPostInteractionsService.createComment(
        postId,
        req.user.id,
        req.body
      );

      res.status(201).json({
        success: true,
        message: 'Comment added',
        data: { comment },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/groups/posts/:postId/comments
   */
  static async getPostComments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await GroupPostInteractionsService.getComments(
        postId,
        req.user.id,
        page,
        limit
      );

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/groups/comments/:commentId/replies
   */
  static async getCommentReplies(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await GroupPostInteractionsService.getReplies(
        commentId,
        req.user.id,
        page,
        limit
      );

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/groups/comments/:commentId
   */
  static async updateComment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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

      const comment = await GroupPostInteractionsService.updateComment(
        commentId,
        req.user.id,
        req.body.content
      );

      res.status(200).json({
        success: true,
        message: 'Comment updated',
        data: { comment },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/groups/comments/:commentId
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

      const result = await GroupPostInteractionsService.deleteComment(commentId, req.user.id);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

}