// search.routes.ts
import { Router } from 'express';
import { SearchController } from './search.controller';
import { optionalAuthenticateToken } from '../middleware/auth';

const router = Router();

router.get('/users', optionalAuthenticateToken, SearchController.searchUsers);
router.get('/posts', optionalAuthenticateToken, SearchController.searchPosts);

export default router;