/**
 * Custom error classes for structured error handling
 */

export class ForbiddenError extends Error {
    readonly statusCode = 403;

    constructor(message: string) {
        super(message);
        this.name = "ForbiddenError";
    }
}

export class BadRequestError extends Error {
    readonly statusCode = 400;

    constructor(message: string) {
        super(message);
        this.name = "BadRequestError";
    }
}

export class NotFoundError extends Error {
    readonly statusCode = 404;

    constructor(message: string) {
        super(message);
        this.name = "NotFoundError";
    }
}
