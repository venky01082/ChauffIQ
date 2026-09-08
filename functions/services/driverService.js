"use strict";

const {db} = require("../utils/firebase");
const {NotFoundError, ForbiddenError} = require("../utils/errors");

/**
 * Creates or registers a driver profile and upgrades user role.
 * @param {string} uid
 * @param {object} profile
 * @return {Promise<object>}
 */
async function createDriverProfile(uid, profile) {
  const driverData = {
    uid: uid,
    name: profile.name || "",
    phone: profile.phone || "",
    vehicleNumber: profile.vehicleNumber,
    vehicleModel: profile.vehicleModel,
    licenseNumber: profile.licenseNumber || "",
    rating: 5.0,
    ratingAverage: 5.0,
    ratingCount: 0,
    isAvailable: true,
    isOnline: true,
    totalTrips: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await Promise.all([
    db.collection("drivers").doc(uid).set(driverData, {merge: true}),
    db.collection("users").doc(uid).set({role: "DRIVER"}, {merge: true}),
  ]);

  return driverData;
}

/**
 * Updates driver availability status.
 * @param {string} uid
 * @param {boolean} isAvailable
 * @return {Promise<object>}
 */
async function updateAvailability(uid, isAvailable) {
  const driverRef = db.collection("drivers").doc(uid);
  const driverDoc = await driverRef.get();

  if (!driverDoc.exists) {
    throw new NotFoundError("Driver profile not found");
  }

  const updateData = {
    isAvailable: isAvailable,
    isOnline: isAvailable,
    updatedAt: new Date().toISOString(),
  };

  await driverRef.update(updateData);
  return {uid, isAvailable, isOnline: isAvailable};
}

/**
 * Lists available online drivers.
 * @return {Promise<object[]>}
 */
async function getAvailableDrivers() {
  const snapshot = await db
      .collection("drivers")
      .where("isAvailable", "==", true)
      .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      uid: data.uid || doc.id,
      name: data.name || "",
      phone: data.phone || "",
      vehicleNumber: data.vehicleNumber || "",
      vehicleModel: data.vehicleModel || "",
      rating: data.rating || 5.0,
      location: data.location || null,
      isAvailable: true,
    };
  });
}

/**
 * Updates real-time GPS location of a driver.
 * @param {string} driverId
 * @param {object} locationData
 * @return {Promise<object>}
 */
async function updateLocation(driverId, {latitude, longitude, heading = 0, speed = 0, rideId = ""}) {
  const timestamp = new Date().toISOString();
  const locPayload = {
    driverId: driverId,
    latitude: Number(latitude),
    longitude: Number(longitude),
    heading: Number(heading) || 0,
    speed: Number(speed) || 0,
    rideId: rideId || "",
    updatedAt: timestamp,
  };

  if (rideId) {
    const rideDoc = await db.collection("rides").doc(rideId).get();
    if (!rideDoc.exists) {
      throw new NotFoundError("Ride not found");
    }
    if (rideDoc.data().driverId !== driverId) {
      throw new ForbiddenError("You are not the assigned driver for this ride");
    }
  }

  const writes = [
    db.collection("driverLocations").doc(driverId).set(locPayload, {merge: true}),
    db.collection("drivers").doc(driverId).set({
      location: {
        latitude: Number(latitude),
        longitude: Number(longitude),
        updatedAt: timestamp,
      },
      updatedAt: timestamp,
    }, {merge: true}),
  ];

  if (rideId) {
    writes.push(
        db.collection("tracking").doc(rideId).set(locPayload, {merge: true}),
    );
  }

  await Promise.all(writes);

  return locPayload;
}

/**
 * Fetches real-time GPS location of a driver or active ride.
 * @param {string} identifier
 * @param {string} [callerUid]
 * @return {Promise<object>}
 */
async function getDriverLocation(identifier, callerUid = null) {
  // 1. Check if identifier matches an existing rideId
  const rideDoc = await db.collection("rides").doc(identifier).get();
  if (rideDoc.exists) {
    const ride = rideDoc.data();
    if (callerUid) {
      const isPassenger = ride.passengerId === callerUid;
      const isAssignedDriver = ride.driverId === callerUid;
      let isFamilyMember = false;
      if (!isPassenger && !isAssignedDriver) {
        const famSnap = await db
            .collection("familyMonitoring")
            .where("rideId", "==", identifier)
            .where("familyMemberId", "==", callerUid)
            .where("active", "==", true)
            .limit(1)
            .get();
        isFamilyMember = !famSnap.empty;
      }
      if (!isPassenger && !isAssignedDriver && !isFamilyMember) {
        throw new ForbiddenError("You do not have access to this ride's location");
      }
    }

    const trackDoc = await db.collection("tracking").doc(identifier).get();
    if (trackDoc.exists) {
      return trackDoc.data();
    }

    if (ride.driverId) {
      const dLocDoc = await db.collection("driverLocations").doc(ride.driverId).get();
      if (dLocDoc.exists) return dLocDoc.data();
    }
    throw new NotFoundError("Driver location not found");
  }

  // 2. Otherwise identifier is a driverId
  const locDoc = await db.collection("driverLocations").doc(identifier).get();
  if (locDoc.exists) {
    return locDoc.data();
  }

  const driverDoc = await db.collection("drivers").doc(identifier).get();
  if (driverDoc.exists && driverDoc.data().location) {
    return {
      driverId: identifier,
      ...driverDoc.data().location,
    };
  }

  throw new NotFoundError("Driver location not found");
}

module.exports = {
  createDriverProfile,
  updateAvailability,
  getAvailableDrivers,
  updateLocation,
  getDriverLocation,
};
