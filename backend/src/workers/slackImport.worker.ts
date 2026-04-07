import { Worker } from 'bullmq';
import { connection } from '../config/redis.js';
import axios from 'axios';
import { getIO } from '../infrastructure/socket.js';
import { ChannelMessageModel } from '../models/channelMessage.model.js';
import { UserMongooseModel } from '../models/user.model.js';

export const startSlackImportWorker = () => {
    console.log('[Slack Import] 🚀 WORKER INITIALIZING...');
    
    const worker = new Worker('slack-import-queue', async (job) => {
        console.log(`\n[Slack Import] ✅ JOB RECEIVED FROM QUEUE: ${JSON.stringify(job.data)}`);
        
        const { channelId, slackChannelId, triggerUserId } = job.data;
        const io = getIO();
        
        console.log(`[Slack Import] 📋 Job Details - ID: ${job.id}, ChannelId: ${channelId}, SlackChannelId: ${slackChannelId}, UserId: ${triggerUserId}`);
        console.log(`[Slack Import] 🔌 Socket.io instance: ${io ? 'CONNECTED' : 'NOT CONNECTED'}`);

        try {
            console.log(`\n[Slack Import] 📡 Job ${job.id} STARTED`);
            io.to(channelId).emit('slack_import_progress', { status: 'started', progress: 0 });
            console.log(`[Slack Import] ✉️  Emitted 'slack_import_progress' with status=started to channel ${channelId}`);

            if (!slackChannelId) {
                throw new Error("Missing Slack Channel ID");
            }

            console.log(`\n[Slack Import] 🔍 STEP 1: Fetching user ${triggerUserId} from database...`);
            const user = await UserMongooseModel.findById(triggerUserId);
            console.log(`[Slack Import] ✅ User found: ${user?._id}, has slackIntegration: ${!!user?.slackIntegration}`);
            
            const token = user?.slackIntegration?.accessToken;
            console.log(`[Slack Import] 🔑 Slack token exists: ${!!token} (length: ${token?.length || 0})`);
            
            if (!token) {
                throw new Error("User has not connected their Slack account.");
            }

            console.log(`\n[Slack Import] 🔍 STEP 2: Fetching Slack users list for mapping...`);
            const usersRes = await axios.get('https://slack.com/api/users.list', {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log(`[Slack Import] ✅ Slack users.list response: ok=${usersRes.data.ok}, error=${usersRes.data.error || 'NONE'}, members count=${usersRes.data.members?.length}`);
            
            if (!usersRes.data.ok) {
                throw new Error(`Failed to fetch Slack users: ${usersRes.data.error}`);
            }

            const slackUsers = usersRes.data.members || [];
            console.log(`[Slack Import] 📦 Fetched ${slackUsers.length} Slack users`);
            
            console.log(`\n[Slack Import] 🔍 STEP 3: Fetching internal app users for email mapping...`);
            const allInternalUsers = await UserMongooseModel.find({}).lean();
            console.log(`[Slack Import] ✅ Found ${allInternalUsers.length} internal users`);
            
            const memberMapping: Record<string, string> = {};

            for (const sUser of slackUsers) {
                const sEmail = sUser.profile?.email;
                if (sEmail) {
                    const matchedUser = allInternalUsers.find((u: any) => u.email === sEmail);
                    if (matchedUser) {
                        memberMapping[sUser.id] = matchedUser._id.toString();
                        console.log(`[Slack Import]   ✓ Mapped Slack user ${sUser.id} (${sEmail}) → DB user ${matchedUser._id}`);
                    }
                }
            }
            console.log(`[Slack Import] 📊 Total member mappings created: ${Object.keys(memberMapping).length}`);

            console.log(`\n[Slack Import] 🔍 STEP 4: Fetching Slack channel history (paginated)...`);
            let hasMore = true;
            let cursor: string | undefined = undefined;
            let totalImported = 0;
            let i = 0;

            while (hasMore) {
                console.log(`[Slack Import] 📄 Fetching page ${i + 1}${cursor ? ` (cursor: ${cursor.substring(0, 20)}...)` : ''}...`);
                
                const slackHistoryResp: any = await axios.get('https://slack.com/api/conversations.history', {
                    headers: { Authorization: `Bearer ${token}` },
                    params: {
                        channel: slackChannelId,
                        limit: 200,
                        cursor
                    }
                });

                console.log(`[Slack Import] ✅ conversations.history response: ok=${slackHistoryResp.data.ok}, error=${slackHistoryResp.data.error || 'NONE'}, messages=${slackHistoryResp.data.messages?.length}`);
                
                if (!slackHistoryResp.data.ok) {
                    throw new Error(`Failed to fetch Slack history: ${slackHistoryResp.data.error}`);
                }

                const messages = slackHistoryResp.data.messages || [];
                console.log(`[Slack Import]   📨 Page ${i + 1} contains ${messages.length} messages`);
                
                const messagesToInsert = messages.map((msg: any) => {
                    const fallbackSenderId = triggerUserId;
                    const mappedSenderId = msg.user ? memberMapping[msg.user] || fallbackSenderId : fallbackSenderId;

                    return {
                        channelId,
                        text: msg.text || "...",
                        sender: mappedSenderId,
                        createdAt: msg.ts ? new Date(parseFloat(msg.ts) * 1000) : new Date(),
                    };
                });

                if (messagesToInsert.length > 0) {
                    console.log(`[Slack Import]   💾 Inserting ${messagesToInsert.length} messages into database...`);
                    await ChannelMessageModel.insertMany(messagesToInsert);
                    totalImported += messagesToInsert.length;
                    console.log(`[Slack Import]   ✅ Successfully inserted ${messagesToInsert.length} messages (total: ${totalImported})`);
                    
                    console.log(`[Slack Import]   ✉️  Emitting progress event: page=${i+1}, imported=${totalImported}`);
                    io.to(channelId).emit('slack_import_progress', { 
                        status: 'processing', 
                        progress: i + 1,
                        importedSoFar: totalImported
                    });
                }

                hasMore = slackHistoryResp.data.response_metadata?.next_cursor ? true : false;
                cursor = slackHistoryResp.data.response_metadata?.next_cursor;
                i++;
                
                console.log(`[Slack Import]   ⏭️  Has more pages: ${hasMore}`);
            }

            console.log(`\n[Slack Import] 🎉 IMPORT COMPLETE!`);
            console.log(`[Slack Import] 📊 Final Stats - Job: ${job.id}, Total messages imported: ${totalImported}`);
            
            console.log(`[Slack Import] ✉️  Emitting 'slack_import_progress' with status=completed`);
            io.to(channelId).emit('slack_import_progress', { status: 'completed', progress: 100, totalImported });
            
            console.log(`[Slack Import] ✉️  Emitting 'channel_logs_updated' event`);
            io.to(channelId).emit('channel_logs_updated', { channelId });
            
            console.log(`[Slack Import] ✅ Job ${job.id} SUCCESS - All emissions complete\n`);

        } catch (error) {
            console.error(`\n❌ [Slack Import] JOB FAILED`);
            console.error(`[Slack Import] Job ID: ${job.id}`);
            console.error(`[Slack Import] Error: ${(error as Error).message}`);
            console.error(`[Slack Import] Stack: ${(error as Error).stack}`);
            
            try {
                console.log(`[Slack Import] ✉️  Emitting error event to channel ${channelId}`);
                io.to(channelId).emit('slack_import_progress', { status: 'error', error: (error as Error).message });
                console.log(`[Slack Import] ✅ Error event emitted`);
            } catch (emitErr) {
                console.error(`[Slack Import] ❌ Failed to emit error event: ${emitErr}`);
            }
            
            throw error;
        }
    }, { connection });

    console.log('[Slack Import] 🎯 Registering worker event handlers...');
    
    worker.on('ready', () => {
        console.log('[Slack Import] ✅ Worker is READY to process jobs');
    });

    worker.on('failed', (job, err) => {
        console.error(`❌ [Slack Import] WORKER EVENT: Job ${job?.id} failed`);
        console.error(`[Slack Import] Error: ${err.message}`);
        console.error(`[Slack Import] Stack: ${err.stack}`);
    });

    worker.on('completed', (job) => {
        console.log(`✅ [Slack Import] WORKER EVENT: Job ${job.id} completed successfully`);
    });

    worker.on('error', (err) => {
        console.error(`❌ [Slack Import] WORKER ERROR EVENT: ${err.message}`);
        console.error(`[Slack Import] ${err.stack}`);
    });

    console.log('[Slack Import] 🚀 WORKER FULLY INITIALIZED\n');
};
