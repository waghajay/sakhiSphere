import { Router } from 'express';
import { ChatController } from './chat.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/conversations', authenticateToken, ChatController.createOrGetConversation);
router.get('/conversations', authenticateToken, ChatController.getUserConversations);
router.get('/conversations/:conversationId/messages', authenticateToken, ChatController.getMessages);
router.post('/conversations/:conversationId/messages', authenticateToken, ChatController.sendMessage);
router.delete('/messages/:messageId', authenticateToken, ChatController.deleteMessage);
router.get('/unread-count', authenticateToken, ChatController.getUnreadCount);

export default router;