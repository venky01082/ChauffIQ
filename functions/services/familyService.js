"use strict";

const {db} = require("../utils/firebase");
const {NotFoundError, ForbiddenError, ValidationError} = require("../utils/errors");

/**
 * Enables family monitoring for a passenger's ride.
 * @param {string} passengerId
 * @param {object} params
 * @param {string} params.familyMemberId
 * @param {string} params.rideId
 * @return {Promise<object>}
 */
async function createFamilyMonitoring(passengerId, {familyMemberId, rideId}) {
  if (
    !familyMemberId || !rideId ||
    typeof familyMemberId !== "string" ||
    typeof rideId !== "string" ||
    familyMemberId.length > 128 ||
    rideId.length > 100
  ) {
    throw new ValidationError("familyMemberId and rideId are required");
  }

  if (familyMemberId === passengerId) {
    throw new ValidationError("Cannot add yourself as a family monitor");
  }

  const rideDoc = await db.collection("rides").doc(rideId).get();
  if (!rideDoc.exists) {
    throw new NotFoundError("Ride not found");
  }

  if (rideDoc.data().passengerId !== passengerId) {
    throw new ForbiddenError("You can only enable monitoring for your own rides");
  }

  const monitoringRef = db.collection("familyMonitoring").doc();
  const monitoringData = {
    monitoringId: monitoringRef.id,
    familyMemberId: familyMemberId,
    passengerId: passengerId,
    rideId: rideId,
    active: true,
    createdAt: new Date().toISOString(),
  };

  await monitoringRef.set(monitoringData);
  return monitoringData;
}

/**
 * Retrieves all rides currently monitored by a family member.
 * @param {string} familyMemberId
 * @return {Promise<object[]>}
 */
async function getFamilyMonitoredRides(familyMemberId) {
  const snapshot = await db
      .collection("familyMonitoring")
      .where("familyMemberId", "==", familyMemberId)
      .where("active", "==", true)
      .get();

  const rideIds = snapshot.docs.map((doc) => doc.data().rideId).filter(Boolean);
  if (rideIds.length === 0) {
    return [];
  }

  // Fetch ride docs in parallel
  const rideDocs = await Promise.all(
      rideIds.map((id) => db.collection("rides").doc(id).get()),
  );

  return rideDocs
      .filter((doc) => doc.exists)
      .map((doc) => ({
        rideId: doc.id,
        ...doc.data(),
      }));
}

module.exports = {
  createFamilyMonitoring,
  getFamilyMonitoredRides,
};
