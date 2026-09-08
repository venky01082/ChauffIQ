"use strict";

const express = require("express");
const adminController = require("../controllers/adminController");
const {requireAdmin} = require("../middleware/authMiddleware");

const router = express.Router();

// Bootstrap admin endpoint (validates its own bootstrap token / developer secret)
router.post("/bootstrap", adminController.bootstrapAdmin);
router.post("/bootstrapAdmin", adminController.bootstrapAdmin);

// All subsequent admin routes require verified admin status
router.get("/overview", requireAdmin, adminController.getAdminOverview);
router.get("/getAdminOverview", requireAdmin, adminController.getAdminOverview);

router.get("/users", requireAdmin, adminController.getAdminUsers);
router.get("/getAdminUsers", requireAdmin, adminController.getAdminUsers);

router.get("/drivers", requireAdmin, adminController.getAdminDrivers);
router.get("/getAdminDrivers", requireAdmin, adminController.getAdminDrivers);

router.get("/rides", requireAdmin, adminController.getAdminRides);
router.get("/getAdminRides", requireAdmin, adminController.getAdminRides);

router.get("/payments", requireAdmin, adminController.getAdminPayments);
router.get("/getAdminPayments", requireAdmin, adminController.getAdminPayments);

router.get("/ratings", requireAdmin, adminController.getAdminRatings);
router.get("/getAdminRatings", requireAdmin, adminController.getAdminRatings);

router.get("/ride-details", requireAdmin, adminController.getAdminRideDetails);
router.get("/getAdminRideDetails", requireAdmin, adminController.getAdminRideDetails);

module.exports = router;
