"use strict";

const {db} = require("../utils/firebase");
const {VALID_TRANSITIONS, RIDE_STATUS} = require("../utils/constants");
const {NotFoundError, ForbiddenError, ValidationError} = require("../utils/errors");
const {sendPushNotificationToUser} = require("./notificationService");

/**
 * Creates a new ride request.
 * @param {string} passengerUid
 * @param {object} rideData
 * @return {Promise<object>}
 */
async function createRide(passengerUid, rideData) {
  const rideRef = db.collection("rides").doc();
  const now = new Date().toISOString();

  const ridePayload = {
    rideId: rideRef.id,
    passengerId: passengerUid,
    pickup: rideData.pickup,
    destination: rideData.destination,
    fare: Number(rideData.fare) || 0,
    status: RIDE_STATUS.REQUESTED,
    driverId: null,
    requestedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  if (rideData.pickupCoordinates) {
    ridePayload.pickupCoordinates = rideData.pickupCoordinates;
  }
  if (rideData.destinationCoordinates) {
    ridePayload.destinationCoordinates = rideData.destinationCoordinates;
  }

  await rideRef.set(ridePayload);
  return ridePayload;
}

/**
 * Retrieves ride by ID with authorization verification.
 * @param {string} rideId
 * @param {string} callerUid
 * @param {boolean} [isAdmin=false]
 * @return {Promise<object>}
 */
async function getRide(rideId, callerUid, isAdmin = false) {
  const rideDoc = await db.collection("rides").doc(rideId).get();
  if (!rideDoc.exists) {
    throw new NotFoundError("Ride not found");
  }

  const ride = rideDoc.data();

  if (isAdmin) {
    return ride;
  }

  const isPassenger = ride.passengerId === callerUid;
  const isDriver = ride.driverId === callerUid;

  if (isPassenger || isDriver) {
    return ride;
  }

  // Check family monitoring authorization
  const familyMonitoringSnap = await db
      .collection("familyMonitoring")
      .where("familyMemberId", "==", callerUid)
      .where("passengerId", "==", ride.passengerId)
      .where("active", "==", true)
      .limit(1)
      .get();

  if (!familyMonitoringSnap.empty) {
    return ride;
  }

  throw new ForbiddenError("You are not authorized to view this ride");
}

/**
 * Updates ride lifecycle status with validation and notifications.
 * @param {string} rideId
 * @param {string} callerUid
 * @param {string} newStatus
 * @param {object} [extraData={}]
 * @return {Promise<object>}
 */
async function updateRideStatus(rideId, callerUid, newStatus, extraData = {}) {
  const rideRef = db.collection("rides").doc(rideId);
  const rideDoc = await rideRef.get();

  if (!rideDoc.exists) {
    throw new NotFoundError("Ride not found");
  }

  const currentRide = rideDoc.data();
  const currentStatus = currentRide.status;
  const targetStatus = newStatus.toUpperCase();

  const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowedTransitions.includes(targetStatus)) {
    throw new ValidationError(
        `Invalid ride status transition from ${currentStatus} to ${targetStatus}`,
    );
  }

  const isDriver = currentRide.driverId === callerUid;
  const isPassenger = currentRide.passengerId === callerUid;

  // Driver accepts a ride
  if (targetStatus === RIDE_STATUS.ACCEPTED) {
    if (currentRide.driverId && currentRide.driverId !== callerUid) {
      throw new ValidationError("Ride has already been accepted by another driver");
    }
  } else if (targetStatus === RIDE_STATUS.CANCELLED) {
    if (!isPassenger && !isDriver) {
      throw new ForbiddenError("Only ride participants may cancel this ride");
    }
  } else {
    // ARRIVING, STARTED, COMPLETED can only be triggered by the assigned driver
    if (!isDriver) {
      throw new ForbiddenError("Only the assigned driver can update this ride state");
    }
  }

  const now = new Date().toISOString();
  const updatePayload = {
    status: targetStatus,
    updatedAt: now,
  };

  if (targetStatus === RIDE_STATUS.ACCEPTED) {
    updatePayload.driverId = callerUid;
    updatePayload.acceptedAt = now;
    // Mark driver unavailable
    await db.collection("drivers").doc(callerUid).set({
      isAvailable: false,
      updatedAt: now,
    }, {merge: true});
  } else if (targetStatus === RIDE_STATUS.ARRIVING) {
    updatePayload.arrivingAt = now;
  } else if (targetStatus === RIDE_STATUS.STARTED) {
    updatePayload.startedAt = now;
  } else if (targetStatus === RIDE_STATUS.COMPLETED) {
    updatePayload.completedAt = now;
    if (currentRide.driverId) {
      await db.collection("drivers").doc(currentRide.driverId).set({
        isAvailable: true,
        updatedAt: now,
      }, {merge: true});
    }
  } else if (targetStatus === RIDE_STATUS.CANCELLED) {
    updatePayload.cancelledAt = now;
    updatePayload.cancelReason = extraData.reason || "User cancelled";
    if (currentRide.driverId) {
      await db.collection("drivers").doc(currentRide.driverId).set({
        isAvailable: true,
        updatedAt: now,
      }, {merge: true});
    }
  }

  await rideRef.update(updatePayload);

  // Notify passenger of status updates
  if (currentRide.passengerId) {
    sendPushNotificationToUser(currentRide.passengerId, {
      title: `Ride Update: ${targetStatus}`,
      body: `Your ride is now ${targetStatus.toLowerCase()}`,
      data: {rideId, status: targetStatus},
    }).catch(() => {});
  }

  return {
    ...currentRide,
    ...updatePayload,
  };
}

module.exports = {
  createRide,
  getRide,
  updateRideStatus,
};
