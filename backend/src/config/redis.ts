import Redis from 'ioredis';
import { ENV } from './env.js';

let redisInstance: Redis | null = null;
let redisSubscriberInstance: Redis | null = null;

// Parse Redis URL to extract connection options
const parseRedisUrl = (url: string) => {
    try {
        const redisUrl = new URL(url);
        return {
            host: redisUrl.hostname || 'localhost',
            port: parseInt(redisUrl.port || '6379', 10),
            password: redisUrl.password || undefined,
            username: redisUrl.username || undefined,
            db: redisUrl.pathname ? parseInt(redisUrl.pathname.slice(1), 10) : 0,
        };
    } catch {
        return {
            host: 'localhost',
            port: 6379,
            db: 0,
        };
    }
};

// The main connection for basic commands, publisher, and standard queues
export const getRedisClient = () => {
    if (!redisInstance) {
        redisInstance = new Redis(ENV.REDIS_URL, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false
        });

        redisInstance.on('error', (err) => {
            console.error('[Redis error]', err);
        });
    }
    return redisInstance;
};

// A separate connection needed by BullMQ for subscribers/blocking operations
export const getRedisSubscriber = () => {
    if (!redisSubscriberInstance) {
        redisSubscriberInstance = new Redis(ENV.REDIS_URL, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false
        });

        redisSubscriberInstance.on('error', (err) => {
            console.error('[Redis Subscriber error]', err);
        });
    }
    return redisSubscriberInstance;
};

// BullMQ connection configuration - pass plain options object, not Redis instance
export const connection = parseRedisUrl(ENV.REDIS_URL);
