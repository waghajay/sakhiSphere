import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public auth routes
router.post('/register', AuthController.register);
router.post('/send-otp', AuthController.sendOtp);
router.post('/verify-otp', AuthController.verifyOtp);
router.post('/login', AuthController.login);

// Protected profile route
router.get('/me', authenticateToken, AuthController.me);

export default router;
