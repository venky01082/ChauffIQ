"use strict";

const {auth, db} = require("../utils/firebase");
const {AuthError, ForbiddenError} = require("../utils/errors");

/**
 * Verifies the Firebase ID token from the Authorization header.
 * Reads: Authorization: Bearer <idToken>
 * Throws AuthError on any failure.
 * @param {object} req - Express request object
 * @return {Promise<object>} Decoded Firebase token (contains .uid)
 */
async function verifyToken(req) {
  const authHeader = req.headers["authorization"] || "";
  if (!authHeader.startsWith("Bearer ")) {
    throw new AuthError(401, "Missing or invalid Authorization header");
  }
  const idToken = authHeader.slice(7);
  if (!idToken) {
    throw new AuthError(401, "Token is empty");
  }
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (err) {
    throw new AuthError(401, "Invalid or expired token");
  }
}

/**
 * Verifies that the request carries a valid ID token belonging to an
 * authorized admin.
 * Checks server-authoritative custom claims and Firestore /admins/{uid} collection.
 * Rejects unauthenticated callers with 401.
 * Rejects authenticated non-admin callers with 403.
 * @param {object} req - Express request object
 * @return {Promise<object>} Decoded token of verified admin
 */
async function verifyAdmin(req) {
  const decodedToken = await verifyToken(req);
  const uid = decodedToken.uid;

  // 1. Check custom claims
  if (decodedToken.admin === true || decodedToken.role === "ADMIN") {
    return decodedToken;
  }

  // 2. Check server-authoritative Firestore /admins/{uid} collection
  const adminDoc = await db.collection("admins").doc(uid).get();
  if (adminDoc.exists && adminDoc.data().active !== false) {
    return decodedToken;
  }

  // Caller is authenticated but not an admin
  throw new AuthError(403, "Access denied: Administrator privileges required");
}

/**
 * Express middleware ensuring request has valid Firebase ID token.
 * Populates req.user.
 */
async function requireAuth(req, res, next) {
  try {
    const decodedToken = await verifyToken(req);
    req.user = decodedToken;
    return next();
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
      });
    }
    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
}

/**
 * Express middleware ensuring request caller has verified administrator privileges.
 * Populates req.user and req.adminUser.
 */
async function requireAdmin(req, res, next) {
  try {
    const decodedToken = await verifyAdmin(req);
    req.user = decodedToken;
    req.adminUser = decodedToken;
    return next();
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
      });
    }
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }
}

/**
 * Express middleware checking user role.
 * @param {string[]} allowedRoles
 * @return {Function}
 */
function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        req.user = await verifyToken(req);
      }
      const userRole = (req.user.role || "").toUpperCase();
      if (allowedRoles.includes(userRole)) {
        return next();
      }
      // Check user document if role wasn't embedded in custom claims
      const userDoc = await db.collection("users").doc(req.user.uid).get();
      if (userDoc.exists) {
        const docRole = (userDoc.data().role || "").toUpperCase();
        if (allowedRoles.includes(docRole)) {
          req.user.role = docRole;
          return next();
        }
      }
      throw new ForbiddenError(`Access requires one of: ${allowedRoles.join(", ")}`);
    } catch (err) {
      if (err instanceof AuthError || err instanceof ForbiddenError) {
        return res.status(err.status).json({
          success: false,
          message: err.message,
        });
      }
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }
  };
}

module.exports = {
  verifyToken,
  verifyAdmin,
  requireAuth,
  requireAdmin,
  requireRole,
};
