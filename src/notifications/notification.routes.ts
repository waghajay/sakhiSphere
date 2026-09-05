import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, NotificationController.getUserNotifications);
router.post('/register-token', authenticateToken, NotificationController.registerToken);

export default router;