"use strict";

const {db} = require("../utils/firebase");
const {NotFoundError} = require("../utils/errors");

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

  await Promise.all([
    db.collection("driverLocations").doc(driverId).set(locPayload, {merge: true}),
    db.collection("drivers").doc(driverId).set({
      location: {
        latitude: Number(latitude),
        longitude: Number(longitude),
        updatedAt: timestamp,
      },
      updatedAt: timestamp,
    }, {merge: true}),
  ]);

  return locPayload;
}

/**
 * Fetches real-time GPS location of a driver.
 * @param {string} driverId
 * @return {Promise<object>}
 */
async function getDriverLocation(driverId) {
  const locDoc = await db.collection("driverLocations").doc(driverId).get();
  if (locDoc.exists) {
    return locDoc.data();
  }

  const driverDoc = await db.collection("drivers").doc(driverId).get();
  if (driverDoc.exists && driverDoc.data().location) {
    return {
      driverId: driverId,
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
