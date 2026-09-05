import { Router } from 'express';
import { CommentsController } from './comments.controller';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth';

const router = Router();

// Protected routes
router.post('/posts/:postId/comments', authenticateToken, CommentsController.createComment);
router.put('/comments/:commentId', authenticateToken, CommentsController.updateComment);
router.delete('/comments/:commentId', authenticateToken, CommentsController.deleteComment);

// Public routes
router.get('/posts/:postId/comments', optionalAuthenticateToken, CommentsController.getPostComments);
router.get('/comments/:commentId/replies', optionalAuthenticateToken, CommentsController.getCommentReplies);
router.get('/comments/:commentId', optionalAuthenticateToken, CommentsController.getComment);

export default router;