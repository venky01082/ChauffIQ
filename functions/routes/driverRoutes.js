"use strict";

const express = require("express");
const driverController = require("../controllers/driverController");
const {requireAuth} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);

router.post("/register", driverController.createDriver);
router.post("/createDriver", driverController.createDriver);

router.patch("/availability", driverController.updateAvailability);
router.post("/availability", driverController.updateAvailability);
router.post("/updateDriverAvailability", driverController.updateAvailability);

router.get("/available", driverController.getAvailableDrivers);
router.get("/getAvailableDrivers", driverController.getAvailableDrivers);

router.post("/location", driverController.updateLocation);
router.post("/updateDriverLocation", driverController.updateLocation);

router.get("/location", driverController.getDriverLocation);
router.get("/location/:driverId", driverController.getDriverLocation);
router.get("/getDriverLocation", driverController.getDriverLocation);

module.exports = router;
