"use strict";

const crypto = require("crypto");
const {db} = require("../utils/firebase");
const {log} = require("../utils/logger");

let secretParamRef = null;

/**
 * Injects SecretParam reference from index.js for developer bypass validation.
 * @param {object} param
 */
function setAdminBootstrapSecretParam(param) {
  secretParamRef = param;
}

/**
 * Distributed rate limiter backed by Firestore collection _rateLimits.
 * Uses SHA-256 hashed IP to ensure zero PII is persisted in database.
 * @param {object} req - Express request object
 * @param {string} action - 'register' | 'login'
 * @param {number} maxRequests - Max requests allowed in time window
 * @param {number} windowMs - Window duration in ms
 * @return {Promise<{allowed: boolean, remaining: number, retryAfterSec: number}>}
 */
async function checkRateLimit(
    req,
    action,
    maxRequests = 25,
    windowMs = 15 * 60 * 1000,
) {
  if (
    process.env.RATE_LIMIT_DISABLED === "true" ||
    process.env.FUNCTIONS_EMULATOR === "true"
  ) {
    return {allowed: true, remaining: maxRequests, retryAfterSec: 0};
  }

  // Allow developer test runners with valid ADMIN_BOOTSTRAP_SECRET
  const devKey =
    req.headers["x-admin-bootstrap-key"] ||
    req.headers["x-test-bypass-key"];
  if (typeof devKey === "string" && devKey.length > 0) {
    let activeSecret = null;
    try {
      if (secretParamRef && typeof secretParamRef.value === "function") {
        activeSecret = secretParamRef.value();
      }
    } catch (_) {
      // Ignore if secret manager is uninitialized
    }
    if (!activeSecret) {
      activeSecret = process.env.ADMIN_BOOTSTRAP_SECRET || null;
    }
    if (activeSecret) {
      const bufDev = Buffer.from(devKey, "utf8");
      const bufActive = Buffer.from(activeSecret, "utf8");
      if (
        bufDev.length === bufActive.length &&
        crypto.timingSafeEqual(bufDev, bufActive)
      ) {
        return {allowed: true, remaining: maxRequests, retryAfterSec: 0};
      }
    }
  }

  const forwarded = req.headers["x-forwarded-for"];
  const remoteIp = req.socket ? req.socket.remoteAddress : null;
  const rawIp =
    (typeof forwarded === "string" ?
      forwarded.split(",")[0] :
      (req.ip || remoteIp)) || "unknown";
  const ipHash = crypto
      .createHash("sha256")
      .update(String(rawIp).trim())
      .digest("hex")
      .slice(0, 32);
  const docId = `${action}_${ipHash}`;
  const docRef = db.collection("_rateLimits").doc(docId);

  const now = Date.now();
  try {
    const result = await db.runTransaction(async (t) => {
      const doc = await t.get(docRef);
      if (!doc.exists) {
        t.set(docRef, {
          action: action,
          count: 1,
          windowStart: now,
          expiresAt: new Date(now + windowMs).toISOString(),
        });
        return {allowed: true, remaining: maxRequests - 1, retryAfterSec: 0};
      }

      const data = doc.data() || {};
      const windowStart =
        typeof data.windowStart === "number" ?
          data.windowStart :
          now - windowMs - 1000;
      if (now - windowStart > windowMs) {
        t.set(docRef, {
          action: action,
          count: 1,
          windowStart: now,
          expiresAt: new Date(now + windowMs).toISOString(),
        });
        return {allowed: true, remaining: maxRequests - 1, retryAfterSec: 0};
      }

      if ((data.count || 0) >= maxRequests) {
        const retryAfterSec = Math.max(
            1,
            Math.ceil((windowStart + windowMs - now) / 1000),
        );
        return {allowed: false, remaining: 0, retryAfterSec: retryAfterSec};
      }

      t.update(docRef, {
        count: (data.count || 0) + 1,
      });
      return {
        allowed: true,
        remaining: maxRequests - ((data.count || 0) + 1),
        retryAfterSec: 0,
      };
    });

    return result;
  } catch (err) {
    log.warn("checkRateLimit", `Rate limit fallback: ${err.message}`);
    return {allowed: true, remaining: 1, retryAfterSec: 0};
  }
}

/**
 * Express middleware factory creating a rate limiter for an endpoint.
 * @param {string} action
 * @param {number} maxRequests
 * @param {number} windowMs
 * @return {Function}
 */
function rateLimiter(action, maxRequests = 25, windowMs = 15 * 60 * 1000) {
  return async (req, res, next) => {
    const rateLimit = await checkRateLimit(
        req, action, maxRequests, windowMs);
    if (!rateLimit.allowed) {
      res.setHeader("Retry-After", String(rateLimit.retryAfterSec));
      return res.status(429).json({
        success: false,
        message:
          `Too many ${action} attempts. Please try again in ` +
          `${rateLimit.retryAfterSec} seconds.`,
      });
    }
    return next();
  };
}

module.exports = {
  checkRateLimit,
  rateLimiter,
  setAdminBootstrapSecretParam,
};
