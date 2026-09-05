// src/verification/verification.routes.ts
import { Router } from 'express';
import { VerificationController } from './verification.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Routes
router.get('/status', authenticateToken, VerificationController.getStatus);
router.post('/request', authenticateToken, VerificationController.submitRequest);
router.post('/review/:requestId', authenticateToken, VerificationController.reviewRequest);

export default router;