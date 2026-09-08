"use strict";

const rideService = require("../services/rideService");
const {verifyToken} = require("../middleware/authMiddleware");
const {safeInternalError} = require("../utils/helpers");

/**
 * POST /createRide
 */
async function createRide(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Only POST requests are allowed",
    });
  }

  try {
    const decodedToken = req.user || (await verifyToken(req));
    const passengerUid = decodedToken.uid;
    const body = req.body || {};
    const {pickup, destination, fare} = body;

    if (!pickup || !destination) {
      return res.status(400).json({
        success: false,
        message: "pickup and destination are required",
      });
    }

    const ride = await rideService.createRide(passengerUid, {
      pickup,
      destination,
      fare,
      pickupCoordinates: body.pickupCoordinates,
      destinationCoordinates: body.destinationCoordinates,
    });

    return res.status(201).json({
      success: true,
      message: "Ride requested successfully",
      rideId: ride.rideId,
      ride,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    return safeInternalError(res, "Failed to create ride", "createRide", error);
  }
}

/**
 * GET /getRide
 */
async function getRide(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Only GET requests are allowed",
    });
  }

  try {
    const decodedToken = req.user || (await verifyToken(req));
    const rideId = req.query.rideId || req.params.rideId;

    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: "rideId is required",
      });
    }

    const isAdmin = decodedToken.admin === true || decodedToken.role === "ADMIN";
    const ride = await rideService.getRide(rideId, decodedToken.uid, isAdmin);

    return res.status(200).json({
      success: true,
      ride,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    return safeInternalError(res, "Failed to get ride", "getRide", error);
  }
}

/**
 * POST or PATCH /updateRideStatus
 */
async function updateRideStatus(req, res) {
  if (req.method !== "POST" && req.method !== "PATCH") {
    return res.status(405).json({
      success: false,
      message: "Only POST or PATCH requests are allowed",
    });
  }

  try {
    const decodedToken = req.user || (await verifyToken(req));
    const body = req.body || {};
    const rideId = body.rideId || req.params.rideId;
    const status = body.status;

    if (!rideId || !status) {
      return res.status(400).json({
        success: false,
        message: "rideId and status are required",
      });
    }

    const updatedRide = await rideService.updateRideStatus(
        rideId,
        decodedToken.uid,
        status,
        body,
    );

    return res.status(200).json({
      success: true,
      message: `Ride status updated to ${updatedRide.status}`,
      ride: updatedRide,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    return safeInternalError(res, "Failed to update ride status", "updateRideStatus", error);
  }
}

module.exports = {
  createRide,
  getRide,
  updateRideStatus,
};
