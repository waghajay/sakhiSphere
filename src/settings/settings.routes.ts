import { Router } from 'express';
import { SettingsController } from './settings.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, SettingsController.getSettings);
router.put('/notifications', authenticateToken, SettingsController.updateNotifications);
router.put('/privacy', authenticateToken, SettingsController.updatePrivacy);
router.put('/password', authenticateToken, SettingsController.changePassword);

export default router;
