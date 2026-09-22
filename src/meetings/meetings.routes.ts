import { Router } from 'express';
import { MeetingsController } from './meetings.controller';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth';

const router = Router();

// Create + list
router.post('/', authenticateToken, MeetingsController.createMeeting);
router.get('/', authenticateToken, MeetingsController.getMeetings);

// Actions (specific routes before generic /:id)
router.post('/:id/start', authenticateToken, MeetingsController.startMeeting);
router.post('/:id/end', authenticateToken, MeetingsController.endMeeting);
router.post('/:id/token', authenticateToken, MeetingsController.getAgoraToken);
router.post('/:id/join', authenticateToken, MeetingsController.joinMeeting);
router.post('/:id/leave', authenticateToken, MeetingsController.leaveMeeting);
router.post('/:id/invite', authenticateToken, MeetingsController.inviteUsers);
router.get('/:id/participants', optionalAuthenticateToken, MeetingsController.getParticipants);

// CRUD
router.get('/:id', optionalAuthenticateToken, MeetingsController.getMeeting);
router.put('/:id', authenticateToken, MeetingsController.updateMeeting);
router.delete('/:id', authenticateToken, MeetingsController.deleteMeeting);

export default router;