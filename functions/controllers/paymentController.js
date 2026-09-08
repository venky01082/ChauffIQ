"use strict";

const paymentService = require("../services/paymentService");
const {verifyToken} = require("../middleware/authMiddleware");
const {safeInternalError} = require("../utils/helpers");

/**
 * POST /createPayment
 */
async function createPayment(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Only POST requests are allowed",
    });
  }

  try {
    const decodedToken = req.user || (await verifyToken(req));
    const body = req.body || {};

    const result = await paymentService.createPayment(decodedToken.uid, {
      rideId: body.rideId,
    });

    const status = result.isExisting ? 200 : 201;
    const msg = result.isExisting ?
      "Payment record already exists (idempotent)" :
      "Sandbox payment initiated successfully";

    return res.status(status).json({
      success: true,
      message: msg,
      paymentId: result.paymentId,
      payment: result.payment,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    return safeInternalError(res, "Failed to create payment", "createPayment", error);
  }
}

/**
 * GET /getPayment
 */
async function getPayment(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Only GET requests are allowed",
    });
  }

  try {
    const decodedToken = req.user || (await verifyToken(req));
    const paymentId = req.query.paymentId || req.params.paymentId;
    const rideId = req.query.rideId || req.params.rideId;

    const result = await paymentService.getPayment(decodedToken.uid, {
      paymentId,
      rideId,
    });

    return res.status(200).json({
      success: true,
      paymentId: result.paymentId,
      payment: result.payment,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    return safeInternalError(res, "Failed to retrieve payment", "getPayment", error);
  }
}

/**
 * POST /simulatePaymentResult
 */
async function simulatePaymentResult(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Only POST requests are allowed",
    });
  }

  try {
    const decodedToken = req.user || (await verifyToken(req));
    const body = req.body || {};
    const paymentId = body.paymentId || req.params.paymentId;
    const outcome = body.outcome;

    const updatedPayment = await paymentService.simulatePaymentResult(
        decodedToken.uid,
        {
          paymentId,
          outcome,
        },
    );

    return res.status(200).json({
      success: true,
      message: `Sandbox payment updated to ${updatedPayment.status}`,
      payment: updatedPayment,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    return safeInternalError(res, "Failed to simulate payment", "simulatePaymentResult", error);
  }
}

module.exports = {
  createPayment,
  getPayment,
  simulatePaymentResult,
};
