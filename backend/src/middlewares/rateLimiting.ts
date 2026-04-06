import rateLimit from 'express-rate-limit';

// Helper to safely extract client IP (handles IPv6 and proxies)
const getClientIp = (req: any): string => {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
           req.headers['cf-connecting-ip'] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           req.ip ||
           'unknown';
};

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
        error: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/healthz' || req.path === '/health';
    },
});

/**
 * Video call rate limiters
 */

/**
 * Start call limiter: Max 15 calls per hour per user
 */
export const startCallLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50,
    keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise fall back to IP
        const userId = (req as any).user?.userId;
        const ip = getClientIp(req as any);
        return userId ? `start-call-${userId}` : `start-call-${ip}`;
    },
    message: {
        error: 'Too many calls started. Maximum 50 calls per hour.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Join call limiter: Max 20 join attempts per hour per user
 */
export const joinCallLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    keyGenerator: (req) => {
        const userId = (req as any).user?.userId;
        const ip = getClientIp(req as any);
        return userId ? `join-call-${userId}` : `join-call-${ip}`;
    },
    message: {
        error: 'Too many join attempts. Maximum 20 per hour.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Get call info limiter: Max 60 requests per minute (allows 5-second polling)
 */
export const getCallInfoLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60,
    keyGenerator: (req) => {
        const userId = (req as any).user?.userId;
        const ip = getClientIp(req as any);
        return userId ? `call-info-${userId}` : `call-info-${ip}`;
    },
    message: {
        error: 'Too many call info requests. Maximum 60 per minute.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Enable recording limiter: Max 10 enable recording requests per hour
 */
export const enableRecordingLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    keyGenerator: (req) => {
        const userId = (req as any).user?.userId;
        const ip = getClientIp(req as any);
        return userId ? `recording-${userId}` : `recording-${ip}`;
    },
    message: {
        error: 'Too many recording requests. Maximum 10 per hour.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * End call limiter: Max 10 end call requests per hour
 */
export const endCallLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    keyGenerator: (req) => {
        const userId = (req as any).user?.userId;
        const ip = getClientIp(req as any);
        return userId ? `end-call-${userId}` : `end-call-${ip}`;
    },
    message: {
        error: 'Too many end call requests. Maximum 10 per hour.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
