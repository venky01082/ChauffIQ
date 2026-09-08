"use strict";

const ALLOWED_ORIGINS = [
  "https://chauffiq-a0366.web.app",
  "https://chauffiq-a0366.firebaseapp.com",
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

const ROLES = Object.freeze({
  PASSENGER: "PASSENGER",
  DRIVER: "DRIVER",
  FAMILY: "FAMILY",
  ADMIN: "ADMIN",
});

const RIDE_STATUS = Object.freeze({
  REQUESTED: "REQUESTED",
  ACCEPTED: "ACCEPTED",
  ARRIVING: "ARRIVING",
  STARTED: "STARTED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
});

const VALID_TRANSITIONS = Object.freeze({
  REQUESTED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["ARRIVING", "CANCELLED"],
  ARRIVING: ["STARTED", "CANCELLED"],
  STARTED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
});

const PAYMENT_STATUS = Object.freeze({
  PENDING: "PENDING",
  AUTHORIZED: "AUTHORIZED",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
});

const COLLECTIONS = Object.freeze({
  USERS: "users",
  DRIVERS: "drivers",
  RIDES: "rides",
  PAYMENTS: "payments",
  RATINGS: "ratings",
  NOTIFICATIONS: "notifications",
  FAMILY_MONITORING: "familyMonitoring",
  ADMINS: "admins",
  RATE_LIMITS: "_rateLimits",
  DRIVER_LOCATIONS: "driverLocations",
});

module.exports = {
  ALLOWED_ORIGINS,
  ROLES,
  RIDE_STATUS,
  VALID_TRANSITIONS,
  PAYMENT_STATUS,
  COLLECTIONS,
};
