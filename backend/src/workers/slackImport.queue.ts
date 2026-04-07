import { Queue } from 'bullmq';
import { connection } from '../config/redis.js';

export const SLACK_IMPORT_QUEUE = 'slack-import-queue';

console.log('[slackImport.queue] Initializing queue with connection:', connection);

export const slackImportQueue = new Queue(SLACK_IMPORT_QUEUE, {
    connection,
    defaultJobOptions: {
        attempts: 2,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: true,
        removeOnFail: false
    }
});

slackImportQueue.on('error', (err) => {
    console.error('[slackImportQueue] Queue error:', err);
});

export const addSlackImportJob = async (channelId: string, slackChannelId: string, triggerUserId: string) => {
    console.log(`[addSlackImportJob] Adding job - Channel: ${channelId}, SlackChannel: ${slackChannelId}, User: ${triggerUserId}`);
    try {
        const job = await slackImportQueue.add('import-slack', {
            channelId,
            slackChannelId,
            triggerUserId
        }, {
            removeOnComplete: true,
            removeOnFail: false
        });
        console.log(`[addSlackImportJob] Job added successfully with ID: ${job.id}`);
        return job;
    } catch (err) {
        console.error('[addSlackImportJob] Failed to add job:', err);
        throw err;
    }
};
