import { Router } from 'express';
import { PostsController } from './posts.controller';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth';

const router = Router();

// Protected routes
router.post('/', authenticateToken, PostsController.createPost);
router.get('/feed', authenticateToken, PostsController.getFeed);
router.put('/:id', authenticateToken, PostsController.updatePost);
router.delete('/:id', authenticateToken, PostsController.deletePost);

// Public/optional auth routes
router.get('/:id', optionalAuthenticateToken, PostsController.getPost);
router.get('/user/:userId', optionalAuthenticateToken, PostsController.getUserPosts);

export default router;