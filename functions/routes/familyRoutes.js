"use strict";

const express = require("express");
const familyController = require("../controllers/familyController");
const {requireAuth} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);

router.post("/monitor", familyController.createFamilyMonitoring);
router.post("/createFamilyMonitoring", familyController.createFamilyMonitoring);

router.get("/rides", familyController.getFamilyMonitoredRides);
router.get("/familyMonitoredRides", familyController.getFamilyMonitoredRides);

module.exports = router;
