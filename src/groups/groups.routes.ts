import { Router } from 'express';
import { GroupsController } from './groups.controller';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth';

const router = Router();

// Categories
router.get('/categories', GroupsController.getCategories);

// Group posts — LIKES & COMMENTS (must be BEFORE /:id routes)
router.post('/posts/:postId/like', authenticateToken, GroupsController.togglePostLike);
router.post('/posts/:postId/comments', authenticateToken, GroupsController.createPostComment);
router.get('/posts/:postId/comments', authenticateToken, GroupsController.getPostComments);
router.put('/posts/:postId', authenticateToken, GroupsController.updateGroupPost);
router.delete('/posts/:postId', authenticateToken, GroupsController.deleteGroupPost);
router.get('/posts/:postId', authenticateToken, GroupsController.getGroupPost);

// Group post comments
router.get('/comments/:commentId/replies', authenticateToken, GroupsController.getCommentReplies);
router.put('/comments/:commentId', authenticateToken, GroupsController.updateComment);
router.delete('/comments/:commentId', authenticateToken, GroupsController.deleteComment);

// Group CRUD
router.post('/', authenticateToken, GroupsController.createGroup);
router.get('/', authenticateToken, GroupsController.getGroups);
router.get('/:id', optionalAuthenticateToken, GroupsController.getGroup);
router.put('/:id', authenticateToken, GroupsController.updateGroup);
router.delete('/:id', authenticateToken, GroupsController.deleteGroup);

// Membership
router.post('/:id/join', authenticateToken, GroupsController.joinGroup);
router.post('/:id/leave', authenticateToken, GroupsController.leaveGroup);
router.get('/:id/members', optionalAuthenticateToken, GroupsController.getGroupMembers);
router.post('/:id/members/:userId/promote', authenticateToken, GroupsController.promoteMember);
router.delete('/:id/members/:userId', authenticateToken, GroupsController.removeMember);

// Group posts
router.post('/:id/posts', authenticateToken, GroupsController.createGroupPost);
router.get('/:id/posts', authenticateToken, GroupsController.getGroupPosts);

export default router;