// follow.routes.ts
import { Router } from 'express';
import { FollowController } from './follow.controller';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth';

const router = Router();

router.post('/users/:userId/follow', authenticateToken, FollowController.toggleFollow);
router.get('/users/:userId/followers', optionalAuthenticateToken, FollowController.getFollowers);
router.get('/users/:userId/following', optionalAuthenticateToken, FollowController.getFollowing);
router.get('/users/:userId/follow-counts', optionalAuthenticateToken, FollowController.getFollowCounts);
router.get('/users/:userId/follow-status', authenticateToken, FollowController.checkFollowStatus);
router.get('/users/suggested', authenticateToken, FollowController.getSuggestedUsers);
router.get('/users/:userId/mutual-connections', authenticateToken, FollowController.getMutualConnections);

export default router;