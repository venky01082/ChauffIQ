"use strict";

/**
 * Base Application Error with HTTP status code support.
 */
class AppError extends Error {
  /**
   * @param {number} status - HTTP status code
   * @param {string} message - Error message
   * @param {string} [code] - Optional error code
   */
  constructor(status, message, code = "APP_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication Error (401 Unauthorized)
 */
class AuthError extends AppError {
  /**
   * @param {number|string} [statusOrMessage] - Status code or message
   * @param {string} [message] - Error message
   */
  constructor(statusOrMessage = 401, message = "Authentication failed") {
    if (typeof statusOrMessage === "string") {
      super(401, statusOrMessage, "UNAUTHORIZED");
    } else {
      super(statusOrMessage, message, "UNAUTHORIZED");
    }
  }
}

/**
 * Forbidden Error (403 Forbidden)
 */
class ForbiddenError extends AppError {
  /**
   * @param {string} [message] - Error message
   */
  constructor(message = "Access denied") {
    super(403, message, "FORBIDDEN");
  }
}

/**
 * Validation Error (400 Bad Request)
 */
class ValidationError extends AppError {
  /**
   * @param {string} [message] - Error message
   * @param {object} [details] - Detailed validation errors
   */
  constructor(message = "Validation error", details = null) {
    super(400, message, "VALIDATION_ERROR");
    this.details = details;
  }
}

/**
 * Not Found Error (404 Not Found)
 */
class NotFoundError extends AppError {
  /**
   * @param {string} [message] - Error message
   */
  constructor(message = "Resource not found") {
    super(404, message, "NOT_FOUND");
  }
}

/**
 * Method Not Allowed Error (405 Method Not Allowed)
 */
class MethodNotAllowedError extends AppError {
  /**
   * @param {string} [message] - Error message
   */
  constructor(message = "Method not allowed") {
    super(405, message, "METHOD_NOT_ALLOWED");
  }
}

/**
 * Rate Limit Error (429 Too Many Requests)
 */
class RateLimitError extends AppError {
  /**
   * @param {number} retryAfterSec - Retry after in seconds
   * @param {string} [message] - Error message
   */
  constructor(retryAfterSec = 60, message = "") {
    const msg = message ||
      `Too many requests. Please try again in ${retryAfterSec} seconds.`;
    super(429, msg, "RATE_LIMIT_EXCEEDED");
    this.retryAfterSec = retryAfterSec;
  }
}

module.exports = {
  AppError,
  AuthError,
  ForbiddenError,
  ValidationError,
  NotFoundError,
  MethodNotAllowedError,
  RateLimitError,
};
