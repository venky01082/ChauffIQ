"use strict";

const crypto = require("crypto");
const {log} = require("./logger");

/**
 * Constant-time comparison between two strings.
 * Prevents timing attacks on secrets and keys.
 * @param {string} a
 * @param {string} b
 * @return {boolean}
 */
function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * SHA-256 hashes an IP address to preserve user privacy and avoid persisting PII.
 * @param {string} rawIp
 * @return {string}
 */
function hashIp(rawIp) {
  return crypto
      .createHash("sha256")
      .update(String(rawIp || "unknown").trim())
      .digest("hex")
      .slice(0, 32);
}

/**
 * Returns a sanitized HTTP 500 JSON response without leaking internal errors.
 * @param {object} res - Express response object
 * @param {string} userMessage - Safe human-readable message
 * @param {string} tag - Contextual function tag for logging
 * @param {Error} error - Internal error for logging
 * @return {object}
 */
function safeInternalError(res, userMessage, tag, error) {
  log.error(tag, userMessage, error);
  return res.status(500).json({
    success: false,
    message: userMessage,
  });
}

/**
 * Sends a standardized success JSON response.
 * @param {object} res - Express response object
 * @param {object} data - Response payload
 * @param {number} [status=200] - HTTP status code
 * @return {object}
 */
function sendSuccess(res, data = {}, status = 200) {
  return res.status(status).json({
    success: true,
    ...data,
  });
}

/**
 * Sends a standardized error JSON response.
 * @param {object} res - Express response object
 * @param {string|Error} err - Error or message
 * @param {number} [status=500] - HTTP status code
 * @return {object}
 */
function sendError(res, err, status = 500) {
  const message = typeof err === "string" ? err : (err.message || "Internal server error");
  const statusCode = err.status || status;
  return res.status(statusCode).json({
    success: false,
    message: message,
    code: err.code || "ERROR",
  });
}

/**
 * Removes sensitive fields from a user object.
 * @param {object} user
 * @return {object}
 */
function sanitizeUser(user) {
  if (!user) return null;
  const {
    password: _p,
    idToken: _it,
    refreshToken: _rt,
    fcmTokens: _ft,
    ...clean
  } = user;
  return clean;
}

module.exports = {
  timingSafeEqual,
  hashIp,
  safeInternalError,
  sendSuccess,
  sendError,
  sanitizeUser,
};
