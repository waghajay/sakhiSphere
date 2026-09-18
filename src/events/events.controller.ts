import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { EventsService } from './events.service';
import { EventRsvpStatus } from '@prisma/client';

export class EventsController {
  /**
   * POST /api/events
   */
  static async createEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const event = await EventsService.createEvent(req.user.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: { event },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/events
   */
  static async getEvents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const filter = (req.query.filter as any) || 'upcoming';
      const groupId = req.query.groupId ? parseInt(req.query.groupId as string, 10) : undefined;

      const result = await EventsService.getEvents(req.user.id, {
        page,
        limit,
        search,
        filter,
        groupId,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/events/:id
   */
  static async getEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = parseInt(req.params.id, 10);
      if (isNaN(eventId)) {
        res.status(400).json({ success: false, message: 'Invalid event ID' });
        return;
      }

      const event = await EventsService.getEvent(eventId, req.user?.id);
      res.status(200).json({ success: true, data: { event } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/events/:id
   */
  static async updateEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const eventId = parseInt(req.params.id, 10);
      if (isNaN(eventId)) {
        res.status(400).json({ success: false, message: 'Invalid event ID' });
        return;
      }

      const event = await EventsService.updateEvent(eventId, req.user.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Event updated successfully',
        data: { event },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/events/:id
   */
  static async deleteEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const eventId = parseInt(req.params.id, 10);
      if (isNaN(eventId)) {
        res.status(400).json({ success: false, message: 'Invalid event ID' });
        return;
      }

      const result = await EventsService.deleteEvent(eventId, req.user.id);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/events/:id/rsvp
   * Body: { status: 'going' | 'maybe' | 'not_going' }
   */
  static async rsvpEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const eventId = parseInt(req.params.id, 10);
      if (isNaN(eventId)) {
        res.status(400).json({ success: false, message: 'Invalid event ID' });
        return;
      }

      const status = req.body.status as EventRsvpStatus;
      if (!status || !['going', 'maybe', 'not_going'].includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Status must be one of: going, maybe, not_going',
        });
        return;
      }

      const result = await EventsService.rsvpEvent(eventId, req.user.id, status);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/events/:id/rsvp
   */
  static async cancelRsvp(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const eventId = parseInt(req.params.id, 10);
      if (isNaN(eventId)) {
        res.status(400).json({ success: false, message: 'Invalid event ID' });
        return;
      }

      const result = await EventsService.cancelRsvp(eventId, req.user.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/events/:id/attendees?status=going&page=1&limit=20
   */
  static async getEventAttendees(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = parseInt(req.params.id, 10);
      if (isNaN(eventId)) {
        res.status(400).json({ success: false, message: 'Invalid event ID' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = (req.query.status as EventRsvpStatus) || 'going';

      if (!['going', 'maybe', 'not_going'].includes(status)) {
        res.status(400).json({ success: false, message: 'Invalid status filter' });
        return;
      }

      const result = await EventsService.getEventAttendees(eventId, status, page, limit);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}