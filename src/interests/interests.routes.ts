import { Router } from 'express';
import { InterestsController } from './interests.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', InterestsController.getAllInterests);
router.get('/my', authenticateToken, InterestsController.getMyInterests);
router.post('/select', authenticateToken, InterestsController.selectInterests);

export default router;
