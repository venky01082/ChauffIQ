"use strict";

const express = require("express");
const {corsMiddleware} = require("../middleware/corsMiddleware");
const {errorMiddleware} = require("../middleware/errorMiddleware");

const authRoutes = require("./authRoutes");
const driverRoutes = require("./driverRoutes");
const rideRoutes = require("./rideRoutes");
const familyRoutes = require("./familyRoutes");
const tripRoutes = require("./tripRoutes");
const paymentRoutes = require("./paymentRoutes");
const ratingRoutes = require("./ratingRoutes");
const notificationRoutes = require("./notificationRoutes");
const adminRoutes = require("./adminRoutes");

const app = express();

app.use(corsMiddleware);
app.use(express.json());

// Health check endpoint
app.get(["/health", "/api/health", "/v1/health", "/api/v1/health"], (req, res) => {
  res.status(200).json({
    status: "HEALTHY",
    service: "chauffiq-backend",
    region: "asia-southeast1",
    timestamp: new Date().toISOString(),
  });
});

// Domain routers attached directly and with /v1 prefix
const domainRouters = [
  {path: "/auth", router: authRoutes},
  {path: "/drivers", router: driverRoutes},
  {path: "/rides", router: rideRoutes},
  {path: "/family", router: familyRoutes},
  {path: "/trips", router: tripRoutes},
  {path: "/payments", router: paymentRoutes},
  {path: "/ratings", router: ratingRoutes},
  {path: "/notifications", router: notificationRoutes},
  {path: "/admin", router: adminRoutes},
];

domainRouters.forEach(({path, router}) => {
  app.use(path, router);
  app.use(`/v1${path}`, router);
  app.use(`/api/v1${path}`, router);
  app.use(`/api${path}`, router);
});

// Centralized error handling
app.use(errorMiddleware);

module.exports = app;
