import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ChatService } from './chat.service';

export class ChatController {
  /**
   * POST /api/chat/conversations
   * Creates or gets direct conversation.
   */
  static async createOrGetConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { targetUserId } = req.body;

      if (!targetUserId) {
        res.status(400).json({ success: false, message: 'targetUserId is required' });
        return;
      }

      const conversation = await ChatService.createOrGetDirectConversation(
        req.user.id,
        parseInt(targetUserId, 10)
      );

      res.status(200).json({
        success: true,
        message: 'Conversation ready',
        data: { conversation },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/chat/conversations
   * Gets user conversations.
   */
  static async getUserConversations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await ChatService.getUserConversations(req.user.id, page, limit);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/chat/conversations/:conversationId/messages
   * Gets messages for a conversation.
   */
  static async getMessages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const conversationId = parseInt(req.params.conversationId, 10);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      if (isNaN(conversationId)) {
        res.status(400).json({ success: false, message: 'Invalid conversation ID' });
        return;
      }

      const result = await ChatService.getConversationMessages(
        conversationId,
        req.user.id,
        page,
        limit
      );

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/chat/conversations/:conversationId/messages
   * Sends a message.
   */
  static async sendMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const conversationId = parseInt(req.params.conversationId, 10);
      const { content, messageType, mediaUrl } = req.body;

      if (isNaN(conversationId)) {
        res.status(400).json({ success: false, message: 'Invalid conversation ID' });
        return;
      }

      if (!content || !content.trim()) {
        res.status(400).json({ success: false, message: 'Message content is required' });
        return;
      }

      const message = await ChatService.sendMessage(
        conversationId,
        req.user.id,
        content,
        messageType,
        mediaUrl
      );

      res.status(201).json({
        success: true,
        message: 'Message sent',
        data: { message },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/chat/unread-count
   * Gets unread message count.
   */
  static async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const result = await ChatService.getUnreadCount(req.user.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }


    /**
     * DELETE /api/chat/messages/:messageId
     * Deletes a message.
     */
    static async deleteMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
        if (!req.user?.id) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const messageId = parseInt(req.params.messageId, 10);

        if (isNaN(messageId)) {
            res.status(400).json({ success: false, message: 'Invalid message ID' });
            return;
        }

        const result = await ChatService.deleteMessage(messageId, req.user.id);
        res.status(200).json({
            success: true,
            message: result.message,
        });
        } catch (error) {
        next(error);
        }
    }
}



