import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {
    addChannelMember,
    createChannel,
    getChannel,
    getChannelMessages,
    getChannels,
    getChannelUsers,
    joinChannel,
} from '../controllers/channels.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getChannels);
router.post('/', createChannel);
router.get('/users', getChannelUsers);
router.get('/:channelId', getChannel);
router.post('/:channelId/join', joinChannel);
router.post('/:channelId/members', addChannelMember);
router.get('/:channelId/messages', getChannelMessages);

export default router;
