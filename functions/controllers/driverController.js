"use strict";

const driverService = require("../services/driverService");
const {verifyToken} = require("../middleware/authMiddleware");
const {isValidCoordinates} = require("../middleware/validationMiddleware");
const {safeInternalError} = require("../utils/helpers");

/**
 * POST /createDriver
 */
async function createDriver(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Only POST requests are allowed",
    });
  }

  try {
    const decodedToken = req.user || (await verifyToken(req));
    const uid = decodedToken.uid;
    const body = req.body || {};
    const {vehicleNumber, vehicleModel, licenseNumber, name, phone} = body;

    if (!vehicleNumber || !vehicleModel) {
      return res.status(400).json({
        success: false,
        message: "vehicleNumber and vehicleModel are required",
      });
    }

    const driver = await driverService.createDriverProfile(uid, {
      vehicleNumber: vehicleNumber.trim(),
      vehicleModel: vehicleModel.trim(),
      licenseNumber: (licenseNumber || "").trim(),
      name: name || decodedToken.name || "",
      phone: phone || decodedToken.phone || "",
    });

    return res.status(201).json({
      success: true,
      message: "Driver profile created successfully",
      driver,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    return safeInternalError(res, "Failed to create driver profile", "createDriver", error);
  }
}

/**
 * POST or PATCH /updateDriverAvailability
 */
async function updateAvailability(req, res) {
  if (req.method !== "POST" && req.method !== "PATCH") {
    return res.status(405).json({
      success: false,
      message: "Only POST or PATCH requests are allowed",
    });
  }

  try {
    const decodedToken = req.user || (await verifyToken(req));
    const uid = decodedToken.uid;
    const body = req.body || {};

    if (body.isAvailable === undefined) {
      return res.status(400).json({
        success: false,
        message: "isAvailable boolean is required",
      });
    }

    const isAvailable = Boolean(body.isAvailable);
    const result = await driverService.updateAvailability(uid, isAvailable);

    return res.status(200).json({
      success: true,
      message: `Driver availability set to ${isAvailable}`,
      ...result,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    return safeInternalError(res, "Failed to update driver availability", "updateDriverAvailability", error);
  }
}

/**
 * GET /getAvailableDrivers
 */
async function getAvailableDrivers(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Only GET requests are allowed",
    });
  }

  try {
    if (!req.user) {
      await verifyToken(req);
    }

    const drivers = await driverService.getAvailableDrivers();

    return res.status(200).json({
      success: true,
      count: drivers.length,
      drivers,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    return safeInternalError(res, "Failed to get available drivers", "getAvailableDrivers", error);
  }
}

/**
 * POST /updateDriverLocation
 */
async function updateLocation(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Only POST requests are allowed",
    });
  }

  try {
    const decodedToken = req.user || (await verifyToken(req));
    const uid = decodedToken.uid;
    const body = req.body || {};
    const {latitude, longitude, heading, speed, rideId} = body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "latitude and longitude are required",
      });
    }

    if (!isValidCoordinates(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude range",
      });
    }

    const result = await driverService.updateLocation(uid, {
      latitude,
      longitude,
      heading,
      speed,
      rideId,
    });

    return res.status(200).json({
      success: true,
      message: "Location updated successfully",
      location: result,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    return safeInternalError(res, "Failed to update driver location", "updateDriverLocation", error);
  }
}

/**
 * GET /getDriverLocation
 */
async function getDriverLocation(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Only GET requests are allowed",
    });
  }

  try {
    if (!req.user) {
      await verifyToken(req);
    }

    const driverId = req.query.driverId || req.params.driverId;
    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: "driverId is required",
      });
    }

    const location = await driverService.getDriverLocation(driverId);

    return res.status(200).json({
      success: true,
      driverId,
      location,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    return safeInternalError(res, "Failed to get driver location", "getDriverLocation", error);
  }
}

module.exports = {
  createDriver,
  updateAvailability,
  getAvailableDrivers,
  updateLocation,
  getDriverLocation,
};
