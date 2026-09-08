"use strict";

const familyService = require("../services/familyService");
const {verifyToken} = require("../middleware/authMiddleware");
const {safeInternalError} = require("../utils/helpers");

/**
 * POST /createFamilyMonitoring
 */
async function createFamilyMonitoring(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Only POST requests are allowed",
    });
  }

  try {
    const decodedToken = req.user || (await verifyToken(req));
    const passengerId = decodedToken.uid;
    const body = req.body || {};
    const {familyMemberId, rideId} = body;

    const result = await familyService.createFamilyMonitoring(passengerId, {
      familyMemberId,
      rideId,
    });

    return res.status(201).json({
      success: true,
      message: "Family monitoring enabled",
      monitoringId: result.monitoringId,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    return safeInternalError(
        res,
        "Failed to enable family monitoring",
        "createFamilyMonitoring",
        error,
    );
  }
}

/**
 * GET /familyMonitoredRides
 */
async function getFamilyMonitoredRides(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Only GET requests are allowed",
    });
  }

  try {
    const decodedToken = req.user || (await verifyToken(req));
    const rides = await familyService.getFamilyMonitoredRides(decodedToken.uid);

    return res.status(200).json({
      success: true,
      count: rides.length,
      rides,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    return safeInternalError(
        res,
        "Failed to get family monitored rides",
        "getFamilyMonitoredRides",
        error,
    );
  }
}

module.exports = {
  createFamilyMonitoring,
  getFamilyMonitoredRides,
};
