import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { getChannelMessages } from '../controllers/channels.controller.js';

const router = Router();
router.use(authMiddleware);
router.get('/:channelId/messages', getChannelMessages);

export default router;
