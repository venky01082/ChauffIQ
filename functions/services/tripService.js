"use strict";

const {db} = require("../utils/firebase");
const {ValidationError} = require("../utils/errors");

/**
 * Fetches filtered and paginated trip history for a user.
 * @param {string} callerUid
 * @param {object} options
 * @param {string} [options.role="ALL"] - 'PASSENGER' | 'DRIVER' | 'FAMILY' | 'ALL'
 * @param {string} [options.statusFilter="ALL"] - 'ALL' | 'COMPLETED' | 'CANCELLED' | 'ACTIVE'
 * @param {number} [options.limit=20] - Page size
 * @return {Promise<object>}
 */
async function getTripHistory(callerUid, {role = "ALL", statusFilter = "ALL", limit = 20} = {}) {
  const normRole = (role || "ALL").toUpperCase();
  const normStatus = (statusFilter || "ALL").toUpperCase();
  const boundedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);

  const allowedRoles = ["PASSENGER", "DRIVER", "FAMILY", "ALL"];
  const allowedStatuses = ["ALL", "COMPLETED", "CANCELLED", "ACTIVE"];

  if (!allowedRoles.includes(normRole)) {
    throw new ValidationError("Invalid role filter. Must be PASSENGER, DRIVER, FAMILY, or ALL");
  }

  if (!allowedStatuses.includes(normStatus)) {
    throw new ValidationError("Invalid status filter. Must be ALL, COMPLETED, CANCELLED, or ACTIVE");
  }

  let rideDocs = [];

  if (normRole === "PASSENGER") {
    const snap = await db
        .collection("rides")
        .where("passengerId", "==", callerUid)
        .get();
    rideDocs = snap.docs;
  } else if (normRole === "DRIVER") {
    const snap = await db
        .collection("rides")
        .where("driverId", "==", callerUid)
        .get();
    rideDocs = snap.docs;
  } else if (normRole === "FAMILY") {
    const familySnap = await db
        .collection("familyMonitoring")
        .where("familyMemberId", "==", callerUid)
        .where("active", "==", true)
        .get();
    const rideIds = familySnap.docs.map((doc) => doc.data().rideId);
    if (rideIds.length > 0) {
      const fetches = rideIds.map((rId) => db.collection("rides").doc(rId).get());
      const resolved = await Promise.all(fetches);
      rideDocs = resolved.filter((d) => d.exists);
    }
  } else {
    const [passSnap, drvSnap, familySnap] = await Promise.all([
      db.collection("rides").where("passengerId", "==", callerUid).get(),
      db.collection("rides").where("driverId", "==", callerUid).get(),
      db.collection("familyMonitoring")
          .where("familyMemberId", "==", callerUid)
          .where("active", "==", true)
          .get(),
    ]);

    const seen = new Set();
    const combined = [];

    passSnap.docs.forEach((d) => {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        combined.push(d);
      }
    });
    drvSnap.docs.forEach((d) => {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        combined.push(d);
      }
    });

    const familyRideIds = familySnap.docs.map((d) => d.data().rideId);
    if (familyRideIds.length > 0) {
      const familyFetches = familyRideIds
          .filter((rId) => !seen.has(rId))
          .map((rId) => db.collection("rides").doc(rId).get());
      const familyResolved = await Promise.all(familyFetches);
      familyResolved.forEach((d) => {
        if (d.exists && !seen.has(d.id)) {
          seen.add(d.id);
          combined.push(d);
        }
      });
    }

    rideDocs = combined;
  }

  let rides = rideDocs.map((doc) => {
    const data = doc.data();
    if (!data.requestedAt && data.createdAt) {
      data.requestedAt = data.createdAt;
    }
    return data;
  });

  if (normStatus === "COMPLETED") {
    rides = rides.filter((r) => r.status === "COMPLETED");
  } else if (normStatus === "CANCELLED") {
    rides = rides.filter((r) => r.status === "CANCELLED");
  } else if (normStatus === "ACTIVE") {
    rides = rides.filter(
        (r) =>
          r.status === "REQUESTED" ||
          r.status === "ACCEPTED" ||
          r.status === "ARRIVING" ||
          r.status === "STARTED",
    );
  }

  rides.sort((a, b) => {
    const timeA = new Date(a.createdAt || a.requestedAt || 0).getTime();
    const timeB = new Date(b.createdAt || b.requestedAt || 0).getTime();
    return timeB - timeA;
  });

  const paginatedRides = rides.slice(0, boundedLimit);

  return {
    count: paginatedRides.length,
    total: rides.length,
    rides: paginatedRides,
  };
}

module.exports = {
  getTripHistory,
};
