"use strict";

const {db} = require("../utils/firebase");
const {NotFoundError, ForbiddenError, ValidationError} = require("../utils/errors");
const {log} = require("../utils/logger");

/**
 * Submits a rating for a completed ride.
 * @param {string} fromUid
 * @param {object} params
 * @param {string} params.rideId
 * @param {number} params.rating
 * @param {string} [params.feedback]
 * @return {Promise<object>}
 */
async function submitRating(fromUid, {rideId, rating, feedback = ""}) {
  if (!rideId || typeof rideId !== "string" || rideId.trim().length === 0 || rideId.length > 100) {
    throw new ValidationError("rideId is required and must be a valid string");
  }

  if (
    rating === undefined ||
    rating === null ||
    typeof rating !== "number" ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    throw new ValidationError("rating must be an integer between 1 and 5");
  }

  let cleanFeedback = "";
  if (feedback !== undefined && feedback !== null) {
    if (typeof feedback !== "string") {
      throw new ValidationError("feedback must be a string");
    }
    if (feedback.trim().length > 1000) {
      throw new ValidationError("feedback must not exceed 1000 characters");
    }
    cleanFeedback = feedback.trim();
  }

  const rideDoc = await db.collection("rides").doc(rideId).get();
  if (!rideDoc.exists) {
    throw new NotFoundError("Ride not found");
  }

  const ride = rideDoc.data();

  if (ride.status !== "COMPLETED") {
    throw new ValidationError(`Cannot rate a ride with status ${ride.status}. Must be COMPLETED`);
  }

  const isPassenger = ride.passengerId === fromUid;
  const isDriver = ride.driverId === fromUid;

  if (!isPassenger && !isDriver) {
    throw new ForbiddenError("You are not a participant in this ride");
  }

  const fromRole = isPassenger ? "PASSENGER" : "DRIVER";
  const toRole = isPassenger ? "DRIVER" : "PASSENGER";
  const toUid = isPassenger ? ride.driverId : ride.passengerId;

  if (!toUid) {
    throw new ValidationError("Target participant not found on this ride");
  }

  if (fromUid === toUid) {
    throw new ValidationError("You cannot rate yourself");
  }

  const ratingId = `${rideId}_${fromUid}_${toUid}`;
  const ratingRef = db.collection("ratings").doc(ratingId);
  const existingRating = await ratingRef.get();

  if (existingRating.exists) {
    throw new ValidationError("You have already submitted a rating for this ride");
  }

  const nowIso = new Date().toISOString();
  const ratingData = {
    ratingId: ratingId,
    rideId: rideId,
    fromUid: fromUid,
    toUid: toUid,
    fromRole: fromRole,
    toRole: toRole,
    rating: rating,
    feedback: cleanFeedback,
    createdAt: nowIso,
  };

  await ratingRef.set(ratingData);

  // Atomically update target user/driver aggregate rating
  try {
    if (toRole === "DRIVER") {
      const driverRef = db.collection("drivers").doc(toUid);
      const driverDoc = await driverRef.get();
      if (driverDoc.exists) {
        const dData = driverDoc.data() || {};
        const currentCount = Number(dData.ratingCount) || 0;
        const currentTotal = Number(dData.ratingTotal) ||
          (currentCount > 0 ? (Number(dData.rating) || 5) * currentCount : 0);
        const newCount = currentCount + 1;
        const newTotal = currentTotal + rating;
        const newAverage = Math.round((newTotal / newCount) * 10) / 10;

        await driverRef.set({
          ratingCount: newCount,
          ratingTotal: newTotal,
          ratingAverage: newAverage,
          rating: newAverage,
          updatedAt: nowIso,
        }, {merge: true});
      }
    } else if (toRole === "PASSENGER") {
      const userRef = db.collection("users").doc(toUid);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        const uData = userDoc.data() || {};
        const currentCount = Number(uData.ratingCount) || 0;
        const currentTotal = Number(uData.ratingTotal) ||
          (currentCount > 0 ? (Number(uData.rating) || 5) * currentCount : 0);
        const newCount = currentCount + 1;
        const newTotal = currentTotal + rating;
        const newAverage = Math.round((newTotal / newCount) * 10) / 10;

        await userRef.set({
          ratingCount: newCount,
          ratingTotal: newTotal,
          ratingAverage: newAverage,
          rating: newAverage,
          updatedAt: nowIso,
        }, {merge: true});
      }
    }
  } catch (aggErr) {
    log.error("submitRating", "Failed to update rating aggregate", aggErr);
  }

  return ratingData;
}

/**
 * Retrieves all ratings associated with a ride.
 * @param {string} rideId
 * @param {string} callerUid
 * @param {boolean} [isAdmin=false]
 * @return {Promise<object[]>}
 */
async function getRideRatings(rideId, callerUid, isAdmin = false) {
  if (!rideId || typeof rideId !== "string" || rideId.trim().length === 0 || rideId.length > 100) {
    throw new ValidationError("rideId is required and must be a valid string");
  }

  const rideDoc = await db.collection("rides").doc(rideId).get();
  if (!rideDoc.exists) {
    throw new NotFoundError("Ride not found");
  }

  if (!isAdmin) {
    const ride = rideDoc.data();
    const isPassenger = ride.passengerId === callerUid;
    const isDriver = ride.driverId === callerUid;

    let isFamilyMember = false;
    if (!isPassenger && !isDriver) {
      const familySnap = await db
          .collection("familyMonitoring")
          .where("rideId", "==", rideId)
          .where("familyMemberId", "==", callerUid)
          .where("active", "==", true)
          .limit(1)
          .get();
      isFamilyMember = !familySnap.empty;
    }

    if (!isPassenger && !isDriver && !isFamilyMember) {
      throw new ForbiddenError("You do not have access to ratings for this ride");
    }
  }

  const ratingsSnap = await db.collection("ratings").where("rideId", "==", rideId).get();
  return ratingsSnap.docs.map((doc) => doc.data());
}

module.exports = {
  submitRating,
  getRideRatings,
};
