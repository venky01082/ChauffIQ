"use strict";

const {setGlobalOptions} = require("firebase-functions/v2");
const {onRequest: rawOnRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");

// Structured Cloud Logging uses ReportedErrorEvent and serviceContext via ./utils/logger
const {ALLOWED_ORIGINS} = require("./utils/constants");
const {setAdminBootstrapSecretParam: setRateLimitSecretParam} = require("./middleware/rateLimitMiddleware");

// Controllers
const authController = require("./controllers/authController");
const driverController = require("./controllers/driverController");
const rideController = require("./controllers/rideController");
const familyController = require("./controllers/familyController");
const tripController = require("./controllers/tripController");
const paymentController = require("./controllers/paymentController");
const ratingController = require("./controllers/ratingController");
const notificationController = require("./controllers/notificationController");
const adminController = require("./controllers/adminController");

// Express API Router
const apiApp = require("./routes/apiRouter");

// Declare SecretParam for production Google Identity Toolkit Web API Key
const webApiKey = defineSecret("WEB_API_KEY");
// Declare SecretParam for developer-controlled Administrator Bootstrap Key
const adminBootstrapSecret = defineSecret("ADMIN_BOOTSTRAP_SECRET");

// Inject secret params into controllers & middlewares
authController.setWebApiKeyParam(webApiKey);
adminController.setAdminBootstrapSecretParam(adminBootstrapSecret);
setRateLimitSecretParam(adminBootstrapSecret);

// Global Cloud Functions v2 configuration
setGlobalOptions({
  region: "asia-southeast1",
  maxInstances: 10,
  cors: ALLOWED_ORIGINS,
  secrets: ["WEB_API_KEY", "ADMIN_BOOTSTRAP_SECRET"],
});

/**
 * Standard HTTPS Cloud Function wrapper enforcing CORS and public invocation.
 * @param {Function} handler
 * @return {Function}
 */
const onRequest = (handler) =>
  rawOnRequest({cors: ALLOWED_ORIGINS, invoker: "public"}, handler);

// ============================================================
// UNIFIED EXPRESS API GATEWAY
// ============================================================

/**
 * Unified Express REST API Gateway (/api/v1/*, /api/*)
 */
exports.api = rawOnRequest(
    {
      cors: ALLOWED_ORIGINS,
      invoker: "public",
      secrets: [webApiKey, adminBootstrapSecret],
    },
    apiApp,
);

// ============================================================
// INDIVIDUAL CLOUD FUNCTIONS V2 (CLIENT COMPATIBILITY)
// ============================================================

// 1. Health check & hello
exports.hello = onRequest((req, res) => {
  res.json({
    success: true,
    message: "ChauffIQ Backend is working!",
    region: "asia-southeast1",
    timestamp: new Date().toISOString(),
  });
});

// 2. Auth APIs
exports.register = onRequest(authController.register);
exports.login = rawOnRequest(
    {cors: ALLOWED_ORIGINS, invoker: "public", secrets: [webApiKey]},
    authController.login,
);
exports.syncUser = onRequest(authController.syncUser);

// 3. Driver APIs
exports.createDriver = onRequest(driverController.createDriver);
exports.updateDriverAvailability = onRequest(driverController.updateAvailability);
exports.getAvailableDrivers = onRequest(driverController.getAvailableDrivers);
exports.updateDriverLocation = onRequest(driverController.updateLocation);
exports.getDriverLocation = onRequest(driverController.getDriverLocation);

// 4. Ride APIs
exports.createRide = onRequest(rideController.createRide);
exports.getRide = onRequest(rideController.getRide);
exports.updateRideStatus = onRequest(rideController.updateRideStatus);

// 5. Family Monitoring APIs
exports.createFamilyMonitoring = onRequest(familyController.createFamilyMonitoring);

// 6. Notification APIs
exports.createNotification = onRequest(notificationController.createNotification);
exports.registerFcmToken = onRequest(notificationController.registerFcmToken);

// 7. Trip History APIs
exports.getTripHistory = onRequest(tripController.getTripHistory);

// 8. Rating & Review APIs
exports.submitRating = onRequest(ratingController.submitRating);
exports.getRideRatings = onRequest(ratingController.getRideRatings);

// 9. Payment APIs
exports.createPayment = onRequest(paymentController.createPayment);
exports.getPayment = onRequest(paymentController.getPayment);
exports.simulatePaymentResult = onRequest(paymentController.simulatePaymentResult);

// 10. Admin Dashboard APIs
exports.bootstrapAdmin = rawOnRequest(
    {cors: ALLOWED_ORIGINS, invoker: "public", secrets: [adminBootstrapSecret]},
    adminController.bootstrapAdmin,
);
exports.getAdminOverview = onRequest(adminController.getAdminOverview);
exports.getAdminUsers = onRequest(adminController.getAdminUsers);
exports.getAdminDrivers = onRequest(adminController.getAdminDrivers);
exports.getAdminRides = onRequest(adminController.getAdminRides);
exports.getAdminPayments = onRequest(adminController.getAdminPayments);
exports.getAdminRatings = onRequest(adminController.getAdminRatings);
exports.getAdminRideDetails = onRequest(adminController.getAdminRideDetails);
