import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { MeetingsService } from './meetings.service';

export class MeetingsController {
  /**
   * POST /api/meetings
   */
  static async createMeeting(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const meeting = await MeetingsService.createMeeting(req.user.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Meeting created successfully',
        data: { meeting },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/meetings
   */
  static async getMeetings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filter = (req.query.filter as any) || 'upcoming';
      const groupId = req.query.groupId ? parseInt(req.query.groupId as string, 10) : undefined;
      const eventId = req.query.eventId ? parseInt(req.query.eventId as string, 10) : undefined;

      const result = await MeetingsService.getMeetings(req.user.id, {
        page, limit, filter, groupId, eventId,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/meetings/:id
   */
  static async getMeeting(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'Invalid meeting ID' });
        return;
      }
      const meeting = await MeetingsService.getMeeting(id, req.user?.id);
      res.status(200).json({ success: true, data: { meeting } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/meetings/:id
   */
  static async updateMeeting(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'Invalid meeting ID' });
        return;
      }
      const meeting = await MeetingsService.updateMeeting(id, req.user.id, req.body);
      res.status(200).json({ success: true, data: { meeting } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/meetings/:id
   */
  static async deleteMeeting(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'Invalid meeting ID' });
        return;
      }
      const result = await MeetingsService.deleteMeeting(id, req.user.id);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/meetings/:id/start
   */
  static async startMeeting(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'Invalid meeting ID' });
        return;
      }
      const result = await MeetingsService.startMeeting(id, req.user.id);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/meetings/:id/end
   */
  static async endMeeting(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'Invalid meeting ID' });
        return;
      }
      const result = await MeetingsService.endMeeting(id, req.user.id);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/meetings/:id/token
   */
  static async getAgoraToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'Invalid meeting ID' });
        return;
      }
      const tokenData = await MeetingsService.getAgoraToken(id, req.user.id);
      res.status(200).json({ success: true, data: tokenData });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/meetings/:id/join
   */
  static async joinMeeting(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'Invalid meeting ID' });
        return;
      }
      const result = await MeetingsService.joinMeeting(id, req.user.id);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/meetings/:id/leave
   */
  static async leaveMeeting(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'Invalid meeting ID' });
        return;
      }
      const result = await MeetingsService.leaveMeeting(id, req.user.id);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/meetings/:id/participants
   */
  static async getParticipants(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'Invalid meeting ID' });
        return;
      }
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const result = await MeetingsService.getParticipants(id, page, limit);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/meetings/:id/invite
   */
  static async inviteUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'Invalid meeting ID' });
        return;
      }
      const { userIds } = req.body;
      if (!Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({ success: false, message: 'userIds array required' });
        return;
      }
      const result = await MeetingsService.inviteUsers(id, req.user.id, userIds);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }
}