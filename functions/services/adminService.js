"use strict";

const {db} = require("../utils/firebase");
const {NotFoundError} = require("../utils/errors");

/**
 * Returns aggregated platform metrics across users, drivers, rides, payments, and ratings.
 * @return {Promise<object>}
 */
async function getOverview() {
  const [usersSnap, driversSnap, ridesSnap, paymentsSnap, ratingsSnap] =
    await Promise.all([
      db.collection("users").get(),
      db.collection("drivers").get(),
      db.collection("rides").get(),
      db.collection("payments").get(),
      db.collection("ratings").get(),
    ]);

  let passengerCount = 0;
  let driverCount = 0;
  let adminCount = 0;
  usersSnap.forEach((doc) => {
    const r = (doc.data().role || "").toUpperCase();
    if (r === "DRIVER") driverCount++;
    else if (r === "ADMIN") adminCount++;
    else passengerCount++;
  });

  let availableDrivers = 0;
  let unavailableDrivers = 0;
  driversSnap.forEach((doc) => {
    if (doc.data().isAvailable) availableDrivers++;
    else unavailableDrivers++;
  });

  const rideStatusCounts = {
    REQUESTED: 0,
    ACCEPTED: 0,
    ARRIVING: 0,
    STARTED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };
  ridesSnap.forEach((doc) => {
    const st = doc.data().status;
    if (rideStatusCounts[st] !== undefined) {
      rideStatusCounts[st]++;
    }
  });

  const paymentStatusCounts = {
    PENDING: 0,
    AUTHORIZED: 0,
    SUCCEEDED: 0,
    FAILED: 0,
    CANCELLED: 0,
    REFUNDED: 0,
  };
  let totalVolumePaise = 0;
  paymentsSnap.forEach((doc) => {
    const st = doc.data().status;
    if (paymentStatusCounts[st] !== undefined) {
      paymentStatusCounts[st]++;
    }
    if (st === "SUCCEEDED" && Number.isInteger(doc.data().amount)) {
      totalVolumePaise += doc.data().amount;
    }
  });

  let ratingCount = 0;
  let driverRatingSum = 0;
  let driverRatingCount = 0;
  let passengerRatingSum = 0;
  let passengerRatingCount = 0;
  ratingsSnap.forEach((doc) => {
    const d = doc.data();
    const val = Number(d.rating);
    if (val >= 1 && val <= 5) {
      ratingCount++;
      if (d.toRole === "DRIVER") {
        driverRatingSum += val;
        driverRatingCount++;
      } else if (d.toRole === "PASSENGER") {
        passengerRatingSum += val;
        passengerRatingCount++;
      }
    }
  });

  const averageDriverRating = driverRatingCount > 0 ?
    Number((driverRatingSum / driverRatingCount).toFixed(1)) :
    5.0;
  const averagePassengerRating = passengerRatingCount > 0 ?
    Number((passengerRatingSum / passengerRatingCount).toFixed(1)) :
    5.0;

  return {
    users: {
      total: usersSnap.size,
      passengers: passengerCount,
      drivers: driverCount,
      admins: adminCount,
    },
    drivers: {
      total: driversSnap.size,
      available: availableDrivers,
      unavailable: unavailableDrivers,
    },
    rides: {
      total: ridesSnap.size,
      ...rideStatusCounts,
    },
    payments: {
      total: paymentsSnap.size,
      totalVolumePaise: totalVolumePaise,
      totalVolumeRupees: Number((totalVolumePaise / 100).toFixed(2)),
      currency: "INR",
      isSandbox: true,
      provider: "SANDBOX",
      ...paymentStatusCounts,
    },
    ratings: {
      total: ratingCount,
      averageDriverRating: averageDriverRating,
      driverRatingCount: driverRatingCount,
      averagePassengerRating: averagePassengerRating,
      passengerRatingCount: passengerRatingCount,
    },
    system: {
      status: "OPERATIONAL",
      region: "asia-southeast1",
      backend: "HEALTHY",
      firestore: "CONNECTED",
      hosting: "ACTIVE",
      isSandboxPayment: true,
    },
  };
}

/**
 * Paginated, sanitized list of registered users.
 * @param {object} params
 * @return {Promise<object>}
 */
async function getUsers({limit = 25, role = "", startAfter = "", search = ""}) {
  let query = db.collection("users").orderBy("createdAt", "desc");
  if (role) {
    query = db
        .collection("users")
        .where("role", "==", role)
        .orderBy("createdAt", "desc");
  }

  if (startAfter) {
    const startDoc = await db.collection("users").doc(startAfter).get();
    if (startDoc.exists) {
      query = query.startAfter(startDoc);
    }
  }

  const snapshot = await query.limit(limit + 1).get();
  const hasMore = snapshot.docs.length > limit;
  const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

  let users = docs.map((d) => {
    const data = d.data();
    return {
      uid: data.uid || d.id,
      name: data.name || "",
      email: data.email || "",
      phone: data.phone || "",
      role: data.role || "PASSENGER",
      createdAt: data.createdAt || "",
    };
  });

  if (search) {
    const s = search.toLowerCase();
    users = users.filter((u) =>
      u.name.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s) ||
      u.phone.toLowerCase().includes(s) ||
      u.uid.toLowerCase().includes(s),
    );
  }

  const nextCursor = docs.length > 0 ? docs[docs.length - 1].id : null;

  return {
    users,
    totalCount: users.length,
    hasMore,
    nextCursor,
  };
}

/**
 * Paginated list of registered drivers.
 * @param {object} params
 * @return {Promise<object>}
 */
async function getDrivers({limit = 25, isAvailable, startAfter = ""}) {
  let query = db.collection("drivers").orderBy("createdAt", "desc");
  if (isAvailable !== undefined) {
    query = db
        .collection("drivers")
        .where("isAvailable", "==", isAvailable)
        .orderBy("createdAt", "desc");
  }

  if (startAfter) {
    const startDoc = await db.collection("drivers").doc(startAfter).get();
    if (startDoc.exists) {
      query = query.startAfter(startDoc);
    }
  }

  const snapshot = await query.limit(limit + 1).get();
  const hasMore = snapshot.docs.length > limit;
  const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

  const drivers = docs.map((d) => {
    const data = d.data();
    return {
      uid: data.uid || d.id,
      name: data.name || "",
      phone: data.phone || "",
      vehicleNumber: data.vehicleNumber || "",
      vehicleModel: data.vehicleModel || "",
      rating: data.rating || 5,
      ratingAverage: data.ratingAverage !== undefined ? data.ratingAverage : (data.rating || 5),
      ratingCount: data.ratingCount || 0,
      isAvailable: data.isAvailable !== false,
      isOnline: data.isOnline !== false,
      totalTrips: data.totalTrips || 0,
      createdAt: data.createdAt || "",
      updatedAt: data.updatedAt || "",
    };
  });

  const nextCursor = docs.length > 0 ? docs[docs.length - 1].id : null;

  return {
    drivers,
    totalCount: drivers.length,
    hasMore,
    nextCursor,
  };
}

/**
 * Paginated list of rides.
 * @param {object} params
 * @return {Promise<object>}
 */
async function getRides({limit = 25, status = "", startAfter = ""}) {
  let query = db.collection("rides").orderBy("createdAt", "desc");
  if (status) {
    query = db
        .collection("rides")
        .where("status", "==", status)
        .orderBy("createdAt", "desc");
  }

  if (startAfter) {
    const startDoc = await db.collection("rides").doc(startAfter).get();
    if (startDoc.exists) {
      query = query.startAfter(startDoc);
    }
  }

  const snapshot = await query.limit(limit + 1).get();
  const hasMore = snapshot.docs.length > limit;
  const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

  const rides = docs.map((d) => {
    const data = d.data();
    return {
      rideId: data.rideId || d.id,
      passengerId: data.passengerId || "",
      driverId: data.driverId || "",
      pickup: data.pickup || "",
      destination: data.destination || "",
      status: data.status || "REQUESTED",
      requestedAt: data.requestedAt || data.createdAt || "",
      acceptedAt: data.acceptedAt || "",
      arrivingAt: data.arrivingAt || "",
      startedAt: data.startedAt || "",
      completedAt: data.completedAt || "",
      cancelledAt: data.cancelledAt || "",
      createdAt: data.createdAt || "",
      updatedAt: data.updatedAt || "",
    };
  });

  const nextCursor = docs.length > 0 ? docs[docs.length - 1].id : null;

  return {
    rides,
    totalCount: rides.length,
    hasMore,
    nextCursor,
  };
}

/**
 * Paginated list of payments.
 * @param {object} params
 * @return {Promise<object>}
 */
async function getPayments({limit = 25, status = "", startAfter = ""}) {
  let query = db.collection("payments").orderBy("createdAt", "desc");
  if (status) {
    query = db
        .collection("payments")
        .where("status", "==", status)
        .orderBy("createdAt", "desc");
  }

  if (startAfter) {
    const startDoc = await db.collection("payments").doc(startAfter).get();
    if (startDoc.exists) {
      query = query.startAfter(startDoc);
    }
  }

  const snapshot = await query.limit(limit + 1).get();
  const hasMore = snapshot.docs.length > limit;
  const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

  const payments = docs.map((d) => {
    const data = d.data();
    return {
      paymentId: data.paymentId || d.id,
      rideId: data.rideId || "",
      payerUid: data.payerUid || "",
      payeeUid: data.payeeUid || "",
      amount: data.amount || 0,
      currency: data.currency || "INR",
      status: data.status || "PENDING",
      provider: "SANDBOX",
      isSandbox: true,
      createdAt: data.createdAt || "",
      updatedAt: data.updatedAt || "",
      completedAt: data.completedAt || "",
      failedAt: data.failedAt || "",
      cancelledAt: data.cancelledAt || "",
    };
  });

  const nextCursor = docs.length > 0 ? docs[docs.length - 1].id : null;

  return {
    payments,
    totalCount: payments.length,
    hasMore,
    nextCursor,
    isSandbox: true,
  };
}

/**
 * Paginated list of ratings.
 * @param {object} params
 * @return {Promise<object>}
 */
async function getRatings({limit = 25, startAfter = ""}) {
  let query = db.collection("ratings").orderBy("createdAt", "desc");
  if (startAfter) {
    const startDoc = await db.collection("ratings").doc(startAfter).get();
    if (startDoc.exists) {
      query = query.startAfter(startDoc);
    }
  }

  const snapshot = await query.limit(limit + 1).get();
  const hasMore = snapshot.docs.length > limit;
  const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

  const ratings = docs.map((d) => {
    const data = d.data();
    return {
      ratingId: data.ratingId || d.id,
      rideId: data.rideId || "",
      fromUid: data.fromUid || "",
      toUid: data.toUid || "",
      fromRole: data.fromRole || "",
      toRole: data.toRole || "",
      rating: data.rating || 5,
      feedback: data.feedback || "",
      createdAt: data.createdAt || "",
    };
  });

  const nextCursor = docs.length > 0 ? docs[docs.length - 1].id : null;

  return {
    ratings,
    totalCount: ratings.length,
    hasMore,
    nextCursor,
  };
}

/**
 * Detailed inspection of a single ride including participants and payment.
 * @param {string} rideId
 * @return {Promise<object>}
 */
async function getRideDetails(rideId) {
  const rideDoc = await db.collection("rides").doc(rideId).get();
  if (!rideDoc.exists) {
    throw new NotFoundError("Ride not found");
  }
  const rideData = rideDoc.data();

  const [passengerDoc, driverDoc, paymentDoc, ratingsSnap] =
    await Promise.all([
      rideData.passengerId ? db.collection("users").doc(rideData.passengerId).get() : null,
      rideData.driverId ? db.collection("drivers").doc(rideData.driverId).get() : null,
      db.collection("payments").doc(`pay_${rideId}`).get(),
      db.collection("ratings").where("rideId", "==", rideId).get(),
    ]);

  const passenger = passengerDoc && passengerDoc.exists ? {
    uid: passengerDoc.id,
    name: passengerDoc.data().name || "",
    email: passengerDoc.data().email || "",
    phone: passengerDoc.data().phone || "",
  } : null;

  const driver = driverDoc && driverDoc.exists ? {
    uid: driverDoc.id,
    name: driverDoc.data().name || "",
    phone: driverDoc.data().phone || "",
    vehicleNumber: driverDoc.data().vehicleNumber || "",
    vehicleModel: driverDoc.data().vehicleModel || "",
    rating: driverDoc.data().rating || 5,
  } : null;

  const payment = paymentDoc.exists ? {
    paymentId: paymentDoc.id,
    amount: paymentDoc.data().amount,
    currency: paymentDoc.data().currency,
    status: paymentDoc.data().status,
    provider: "SANDBOX",
    isSandbox: true,
    createdAt: paymentDoc.data().createdAt,
    completedAt: paymentDoc.data().completedAt,
  } : null;

  const ratings = ratingsSnap.docs.map((d) => ({
    ratingId: d.id,
    fromUid: d.data().fromUid,
    toUid: d.data().toUid,
    fromRole: d.data().fromRole,
    toRole: d.data().toRole,
    rating: d.data().rating,
    feedback: d.data().feedback,
    createdAt: d.data().createdAt,
  }));

  return {
    ride: {
      rideId: rideDoc.id,
      pickup: rideData.pickup,
      destination: rideData.destination,
      status: rideData.status,
      requestedAt: rideData.requestedAt || rideData.createdAt,
      acceptedAt: rideData.acceptedAt,
      arrivingAt: rideData.arrivingAt,
      startedAt: rideData.startedAt,
      completedAt: rideData.completedAt,
      cancelledAt: rideData.cancelledAt,
      createdAt: rideData.createdAt,
    },
    passenger,
    driver,
    payment,
    ratings,
  };
}

module.exports = {
  getOverview,
  getUsers,
  getDrivers,
  getRides,
  getPayments,
  getRatings,
  getRideDetails,
};
