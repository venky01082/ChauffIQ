"use strict";

const {ALLOWED_ORIGINS} = require("../utils/constants");

/**
 * Validates whether the origin header matches allowed patterns.
 * @param {string} origin - Incoming Origin header
 * @return {boolean}
 */
function isOriginAllowed(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some((pattern) => {
    if (pattern instanceof RegExp) {
      return pattern.test(origin);
    }
    return pattern === origin;
  });
}

/**
 * Express CORS middleware handling allowed origins and OPTIONS preflights.
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {Function} next - Next callback
 */
function corsMiddleware(req, res, next) {
  const origin = req.headers["origin"];

  if (origin && isOriginAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, x-admin-bootstrap-key, x-test-bypass-key, x-client-version",
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Max-Age", "86400");
  }

  if (req.method === "OPTIONS") {
    if (origin && !isOriginAllowed(origin)) {
      return res.status(403).end();
    }
    return res.status(204).end();
  }

  return next();
}

module.exports = {
  corsMiddleware,
  isOriginAllowed,
};
