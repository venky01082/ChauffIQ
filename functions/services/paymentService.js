"use strict";

const {db} = require("../utils/firebase");
const {NotFoundError, ForbiddenError, ValidationError} = require("../utils/errors");

/**
 * Initiates a sandbox payment for a completed ride.
 * @param {string} payerUid
 * @param {object} params
 * @param {string} params.rideId
 * @return {Promise<object>}
 */
async function createPayment(payerUid, {rideId}) {
  if (!rideId || typeof rideId !== "string" || rideId.trim().length === 0 || rideId.length > 100) {
    throw new ValidationError("rideId is required and must be a valid string");
  }

  const rideDoc = await db.collection("rides").doc(rideId).get();
  if (!rideDoc.exists) {
    throw new NotFoundError("Ride not found");
  }

  const ride = rideDoc.data();

  if (ride.passengerId !== payerUid) {
    throw new ForbiddenError("Only the passenger who booked this ride may create a payment");
  }

  if (ride.status !== "COMPLETED") {
    throw new ValidationError(`Cannot create payment for ride with status ${ride.status}. Must be COMPLETED`);
  }

  const paymentId = `pay_${rideId}`;
  const paymentRef = db.collection("payments").doc(paymentId);
  const existingPayment = await paymentRef.get();

  if (existingPayment.exists) {
    const existingData = existingPayment.data();
    if (
      existingData.status === "PENDING" ||
      existingData.status === "AUTHORIZED" ||
      existingData.status === "SUCCEEDED"
    ) {
      return {
        isExisting: true,
        paymentId: paymentId,
        payment: existingData,
      };
    }
  }

  // Server-authoritative fare calculation in paise (₹250 base + distance)
  const baseFarePaise = 25000;
  const pickupLen = (ride.pickup && ride.pickup.length) || 10;
  const destLen = (ride.destination && ride.destination.length) || 10;
  const variableFarePaise = Math.min(50000, (pickupLen + destLen) * 500);
  const totalAmountPaise = baseFarePaise + variableFarePaise;

  const nowIso = new Date().toISOString();
  const providerPaymentId = `sbx_pay_${rideId}_${Date.now()}`;

  const paymentData = {
    paymentId: paymentId,
    rideId: rideId,
    payerUid: payerUid,
    payeeUid: ride.driverId || null,
    amount: totalAmountPaise,
    currency: "INR",
    status: "PENDING",
    provider: "SANDBOX",
    providerPaymentId: providerPaymentId,
    isSandbox: true,
    createdAt: nowIso,
    updatedAt: nowIso,
    completedAt: null,
    failureReason: null,
  };

  await paymentRef.set(paymentData);

  return {
    isExisting: false,
    paymentId: paymentId,
    payment: paymentData,
  };
}

/**
 * Retrieves payment details with authorization checks.
 * @param {string} callerUid
 * @param {object} params
 * @param {string} [params.paymentId]
 * @param {string} [params.rideId]
 * @return {Promise<object>}
 */
async function getPayment(callerUid, {paymentId, rideId}) {
  let targetPaymentId = paymentId;
  if (!targetPaymentId && rideId) {
    targetPaymentId = `pay_${rideId}`;
  }

  if (
    !targetPaymentId || typeof targetPaymentId !== "string" ||
    targetPaymentId.trim().length === 0 || targetPaymentId.length > 120
  ) {
    throw new ValidationError("paymentId or rideId is required");
  }

  const paymentDoc = await db.collection("payments").doc(targetPaymentId).get();
  if (!paymentDoc.exists) {
    throw new NotFoundError("Payment not found");
  }

  const payment = paymentDoc.data();

  const isPayer = payment.payerUid === callerUid;
  const isPayee = payment.payeeUid === callerUid;

  let isFamily = false;
  if (!isPayer && !isPayee && payment.rideId) {
    const familySnap = await db
        .collection("familyMonitoring")
        .where("rideId", "==", payment.rideId)
        .where("familyMemberId", "==", callerUid)
        .where("active", "==", true)
        .limit(1)
        .get();
    isFamily = !familySnap.empty;
  }

  if (!isPayer && !isPayee && !isFamily) {
    throw new ForbiddenError("You are not authorized to view this payment");
  }

  return {
    paymentId: targetPaymentId,
    payment: payment,
  };
}

/**
 * Simulates sandbox payment lifecycle transition.
 * @param {string} callerUid
 * @param {object} params
 * @param {string} params.paymentId
 * @param {string} params.outcome
 * @return {Promise<object>}
 */
async function simulatePaymentResult(callerUid, {paymentId, outcome}) {
  if (
    !paymentId || typeof paymentId !== "string" ||
    paymentId.trim().length === 0 || paymentId.length > 120
  ) {
    throw new ValidationError("paymentId is required and must be a valid string");
  }

  const validOutcomes = ["SUCCESS", "FAILURE", "CANCEL"];
  if (!outcome || !validOutcomes.includes(outcome)) {
    throw new ValidationError("outcome must be one of: SUCCESS, FAILURE, CANCEL");
  }

  const paymentRef = db.collection("payments").doc(paymentId);
  const paymentDoc = await paymentRef.get();

  if (!paymentDoc.exists) {
    throw new NotFoundError("Payment not found");
  }

  const payment = paymentDoc.data();

  if (payment.payerUid !== callerUid) {
    throw new ForbiddenError("Only the payer can simulate outcomes for this payment");
  }

  if (payment.status !== "PENDING" && payment.status !== "AUTHORIZED") {
    throw new ValidationError(`Cannot simulate outcome for status ${payment.status}. Terminal states are immutable`);
  }

  const nowIso = new Date().toISOString();
  let newStatus = "SUCCEEDED";
  let failureReason = null;

  if (outcome === "SUCCESS") {
    newStatus = "SUCCEEDED";
  } else if (outcome === "FAILURE") {
    newStatus = "FAILED";
    failureReason = "SANDBOX_SIMULATED_FAILURE";
  } else if (outcome === "CANCEL") {
    newStatus = "CANCELLED";
    failureReason = "SANDBOX_CUSTOMER_CANCELLED";
  }

  const updates = {
    status: newStatus,
    updatedAt: nowIso,
    completedAt: nowIso,
    failureReason: failureReason,
  };

  await paymentRef.update(updates);

  return {
    ...payment,
    ...updates,
  };
}

module.exports = {
  createPayment,
  getPayment,
  simulatePaymentResult,
};
