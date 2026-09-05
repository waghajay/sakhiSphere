import { Router } from 'express';
import { LikesController } from './likes.controller';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth';

const router = Router();

// Protected routes
router.post('/posts/:postId/like', authenticateToken, LikesController.toggleLike);
router.get('/posts/:postId/like-status', authenticateToken, LikesController.checkLikeStatus);

// Public routes
router.get('/posts/:postId/likes', optionalAuthenticateToken, LikesController.getPostLikes);
router.get('/users/:userId/liked-posts', optionalAuthenticateToken, LikesController.getUserLikedPosts);

export default router;