"use strict";

const ratingService = require("../services/ratingService");
const {verifyToken} = require("../middleware/authMiddleware");
const {safeInternalError} = require("../utils/helpers");

/**
 * POST /submitRating
 */
async function submitRating(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Only POST requests are allowed",
    });
  }

  try {
    const decodedToken = req.user || (await verifyToken(req));
    const body = req.body || {};

    const rating = await ratingService.submitRating(decodedToken.uid, {
      rideId: body.rideId,
      rating: body.rating,
      feedback: body.feedback,
    });

    return res.status(201).json({
      success: true,
      message: "Rating submitted successfully",
      ratingId: rating.ratingId,
      rating,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    return safeInternalError(res, "Failed to submit rating", "submitRating", error);
  }
}

/**
 * GET /getRideRatings
 */
async function getRideRatings(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Only GET requests are allowed",
    });
  }

  try {
    const decodedToken = req.user || (await verifyToken(req));
    const rideId = req.query.rideId || req.params.rideId;

    const isAdmin = decodedToken.admin === true || decodedToken.role === "ADMIN";
    const ratings = await ratingService.getRideRatings(rideId, decodedToken.uid, isAdmin);

    return res.status(200).json({
      success: true,
      rideId,
      ratings,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    return safeInternalError(res, "Failed to get ride ratings", "getRideRatings", error);
  }
}

module.exports = {
  submitRating,
  getRideRatings,
};
