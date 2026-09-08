"use strict";

const crypto = require("crypto");
const adminService = require("../services/adminService");
const authService = require("../services/authService");
const {verifyToken, verifyAdmin} = require("../middleware/authMiddleware");
const {log, logAdminAction} = require("../utils/logger");
const {safeInternalError} = require("../utils/helpers");
const {db} = require("../utils/firebase");

let adminBootstrapSecretRef = null;

/**
 * Injects adminBootstrapSecret SecretParam reference.
 * @param {object} param
 */
function setAdminBootstrapSecretParam(param) {
  adminBootstrapSecretRef = param;
}

/**
 * POST /bootstrapAdmin
 */
async function bootstrapAdmin(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Only POST requests are allowed",
    });
  }

  try {
    const decodedToken = await verifyToken(req);
    const uid = decodedToken.uid;

    const providedSecret =
      req.headers["x-admin-bootstrap-key"] ||
      req.headers["x-bootstrap-key"] ||
      "";

    const isExistingAdminDoc =
      (await db.collection("admins").doc(uid).get()).exists;
    const isExistingAdmin =
      decodedToken.admin === true || isExistingAdminDoc;

    let activeSecret = null;
    try {
      if (adminBootstrapSecretRef && typeof adminBootstrapSecretRef.value === "function") {
        activeSecret = adminBootstrapSecretRef.value();
      }
    } catch (_) {
      // Secret manager may not be active in unit test environment
    }
    if (!activeSecret) {
      activeSecret = process.env.ADMIN_BOOTSTRAP_SECRET || null;
    }

    let secretValid = false;
    if (activeSecret && typeof providedSecret === "string" && providedSecret.length > 0) {
      const bufProvided = Buffer.from(providedSecret, "utf8");
      const bufActive = Buffer.from(activeSecret, "utf8");
      if (bufProvided.length === bufActive.length) {
        secretValid = crypto.timingSafeEqual(bufProvided, bufActive);
      }
    }

    if (!secretValid && !isExistingAdmin) {
      log.warn("bootstrapAdmin", `Unauthorized bootstrap attempt by ${uid}`);
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Invalid or missing administrator bootstrap key",
      });
    }

    await authService.bootstrapAdminUser(uid, decodedToken.email || "");

    logAdminAction(uid, "BOOTSTRAP_ADMIN", uid, {email: decodedToken.email});

    return res.status(200).json({
      success: true,
      message: "User successfully designated as Administrator",
      uid,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
      });
    }
    return safeInternalError(res, "Failed to bootstrap admin", "bootstrapAdmin", err);
  }
}

/**
 * GET /getAdminOverview
 */
async function getAdminOverview(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Only GET requests are allowed",
    });
  }

  try {
    const decodedToken = req.adminUser || (await verifyAdmin(req));
    logAdminAction(decodedToken.uid, "GET_OVERVIEW");

    const overview = await adminService.getOverview();

    return res.status(200).json({
      success: true,
      overview,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
      });
    }
    return safeInternalError(res, "Failed to get admin overview", "getAdminOverview", err);
  }
}

/**
 * GET /getAdminUsers
 */
async function getAdminUsers(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Only GET requests are allowed",
    });
  }

  try {
    const decodedToken = req.adminUser || (await verifyAdmin(req));
    logAdminAction(decodedToken.uid, "GET_USERS");

    const limitParam = parseInt(req.query.limit, 10);
    if (req.query.limit !== undefined && (isNaN(limitParam) || limitParam < 1)) {
      return res.status(400).json({
        success: false,
        message: "Invalid limit parameter. Must be a positive integer.",
      });
    }
    const limit = Math.min(isNaN(limitParam) ? 25 : limitParam, 100);

    const roleParam = typeof req.query.role === "string" ? req.query.role.trim().toUpperCase() : "";
    if (roleParam && !["PASSENGER", "DRIVER", "ADMIN"].includes(roleParam)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role filter. Allowed: PASSENGER, DRIVER, ADMIN",
      });
    }

    const startAfter = typeof req.query.startAfter === "string" ? req.query.startAfter.trim() : "";
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    const result = await adminService.getUsers({
      limit,
      role: roleParam,
      startAfter,
      search,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
      });
    }
    return safeInternalError(res, "Failed to get admin users", "getAdminUsers", err);
  }
}

/**
 * GET /getAdminDrivers
 */
async function getAdminDrivers(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Only GET requests are allowed",
    });
  }

  try {
    const decodedToken = req.adminUser || (await verifyAdmin(req));
    logAdminAction(decodedToken.uid, "GET_DRIVERS");

    const limitParam = parseInt(req.query.limit, 10);
    if (req.query.limit !== undefined && (isNaN(limitParam) || limitParam < 1)) {
      return res.status(400).json({
        success: false,
        message: "Invalid limit parameter. Must be a positive integer.",
      });
    }
    const limit = Math.min(isNaN(limitParam) ? 25 : limitParam, 100);

    let isAvailable;
    if (req.query.isAvailable !== undefined) {
      isAvailable = req.query.isAvailable === "true";
    }

    const startAfter = typeof req.query.startAfter === "string" ? req.query.startAfter.trim() : "";

    const result = await adminService.getDrivers({
      limit,
      isAvailable,
      startAfter,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
      });
    }
    return safeInternalError(res, "Failed to get admin drivers", "getAdminDrivers", err);
  }
}

/**
 * GET /getAdminRides
 */
async function getAdminRides(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Only GET requests are allowed",
    });
  }

  try {
    const decodedToken = req.adminUser || (await verifyAdmin(req));
    logAdminAction(decodedToken.uid, "GET_RIDES");

    const limitParam = parseInt(req.query.limit, 10);
    if (req.query.limit !== undefined && (isNaN(limitParam) || limitParam < 1)) {
      return res.status(400).json({
        success: false,
        message: "Invalid limit parameter. Must be a positive integer.",
      });
    }
    const limit = Math.min(isNaN(limitParam) ? 25 : limitParam, 100);

    const statusParam = typeof req.query.status === "string" ? req.query.status.trim().toUpperCase() : "";
    const validStatuses = ["REQUESTED", "ACCEPTED", "ARRIVING", "STARTED", "COMPLETED", "CANCELLED"];
    if (statusParam && !validStatuses.includes(statusParam)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status filter. Allowed: ${validStatuses.join(", ")}`,
      });
    }

    const startAfter = typeof req.query.startAfter === "string" ? req.query.startAfter.trim() : "";

    const result = await adminService.getRides({
      limit,
      status: statusParam,
      startAfter,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
      });
    }
    return safeInternalError(res, "Failed to get admin rides", "getAdminRides", err);
  }
}

/**
 * GET /getAdminPayments
 */
async function getAdminPayments(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Only GET requests are allowed",
    });
  }

  try {
    const decodedToken = req.adminUser || (await verifyAdmin(req));
    logAdminAction(decodedToken.uid, "GET_PAYMENTS");

    const limitParam = parseInt(req.query.limit, 10);
    if (req.query.limit !== undefined && (isNaN(limitParam) || limitParam < 1)) {
      return res.status(400).json({
        success: false,
        message: "Invalid limit parameter. Must be a positive integer.",
      });
    }
    const limit = Math.min(isNaN(limitParam) ? 25 : limitParam, 100);

    const statusParam = typeof req.query.status === "string" ? req.query.status.trim().toUpperCase() : "";
    const validStatuses = ["PENDING", "AUTHORIZED", "SUCCEEDED", "FAILED", "CANCELLED", "REFUNDED"];
    if (statusParam && !validStatuses.includes(statusParam)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status filter. Allowed: ${validStatuses.join(", ")}`,
      });
    }

    const startAfter = typeof req.query.startAfter === "string" ? req.query.startAfter.trim() : "";

    const result = await adminService.getPayments({
      limit,
      status: statusParam,
      startAfter,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
      });
    }
    return safeInternalError(res, "Failed to get admin payments", "getAdminPayments", err);
  }
}

/**
 * GET /getAdminRatings
 */
async function getAdminRatings(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Only GET requests are allowed",
    });
  }

  try {
    const decodedToken = req.adminUser || (await verifyAdmin(req));
    logAdminAction(decodedToken.uid, "GET_RATINGS");

    const limitParam = parseInt(req.query.limit, 10);
    if (req.query.limit !== undefined && (isNaN(limitParam) || limitParam < 1)) {
      return res.status(400).json({
        success: false,
        message: "Invalid limit parameter. Must be a positive integer.",
      });
    }
    const limit = Math.min(isNaN(limitParam) ? 25 : limitParam, 100);

    const startAfter = typeof req.query.startAfter === "string" ? req.query.startAfter.trim() : "";

    const result = await adminService.getRatings({
      limit,
      startAfter,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
      });
    }
    return safeInternalError(res, "Failed to get admin ratings", "getAdminRatings", err);
  }
}

/**
 * GET /getAdminRideDetails
 */
async function getAdminRideDetails(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Only GET requests are allowed",
    });
  }

  try {
    const decodedToken = req.adminUser || (await verifyAdmin(req));
    const rideId = typeof req.query.rideId === "string" ? req.query.rideId.trim() : "";

    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: "rideId parameter is required",
      });
    }

    logAdminAction(decodedToken.uid, "GET_RIDE_DETAILS", rideId);

    const result = await adminService.getRideDetails(rideId);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
      });
    }
    return safeInternalError(res, "Failed to get admin ride details", "getAdminRideDetails", err);
  }
}

module.exports = {
  bootstrapAdmin,
  getAdminOverview,
  getAdminUsers,
  getAdminDrivers,
  getAdminRides,
  getAdminPayments,
  getAdminRatings,
  getAdminRideDetails,
  setAdminBootstrapSecretParam,
};
