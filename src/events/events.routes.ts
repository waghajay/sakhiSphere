import { Router } from 'express';
import { EventsController } from './events.controller';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth';

const router = Router();

// Create + list
router.post('/', authenticateToken, EventsController.createEvent);
router.get('/', authenticateToken, EventsController.getEvents);

// RSVP actions (specific before generic /:id)
router.post('/:id/rsvp', authenticateToken, EventsController.rsvpEvent);
router.delete('/:id/rsvp', authenticateToken, EventsController.cancelRsvp);
router.get('/:id/attendees', optionalAuthenticateToken, EventsController.getEventAttendees);

// CRUD
router.get('/:id', optionalAuthenticateToken, EventsController.getEvent);
router.put('/:id', authenticateToken, EventsController.updateEvent);
router.delete('/:id', authenticateToken, EventsController.deleteEvent);

export default router;