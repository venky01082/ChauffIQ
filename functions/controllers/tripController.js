"use strict";

const tripService = require("../services/tripService");
const {verifyToken} = require("../middleware/authMiddleware");
const {safeInternalError} = require("../utils/helpers");

/**
 * GET /getTripHistory
 */
async function getTripHistory(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Only GET requests are allowed",
    });
  }

  try {
    const decodedToken = req.user || (await verifyToken(req));
    const {role, status, limit} = req.query;

    const result = await tripService.getTripHistory(decodedToken.uid, {
      role,
      statusFilter: status,
      limit,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    return safeInternalError(res, "Failed to get trip history", "getTripHistory", error);
  }
}

module.exports = {
  getTripHistory,
};
