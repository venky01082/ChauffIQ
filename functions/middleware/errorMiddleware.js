"use strict";

const {log} = require("../utils/logger");
const {AppError} = require("../utils/errors");

/**
 * Centralized Express error handler middleware.
 * Captures all unhandled errors, logs internal exceptions to GCP Error Reporting,
 * and formats consistent JSON error payloads.
 */
function errorMiddleware(err, req, res, _next) {
  const status = (err instanceof AppError && err.status) ?
    err.status :
    (err.status || 500);
  const message = err.message || "An unexpected error occurred";

  if (status >= 500) {
    log.error("errorMiddleware", `Internal error on ${req.method} ${req.originalUrl}: ${message}`, err);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred",
    });
  }

  const payload = {
    success: false,
    message: message,
  };
  if (err.code) payload.code = err.code;
  if (err.details) payload.details = err.details;

  if (err.retryAfterSec) {
    res.setHeader("Retry-After", String(err.retryAfterSec));
  }

  return res.status(status).json(payload);
}

module.exports = {
  errorMiddleware,
};
