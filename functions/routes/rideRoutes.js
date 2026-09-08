"use strict";

const express = require("express");
const rideController = require("../controllers/rideController");
const {requireAuth} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);

router.post("/book", rideController.createRide);
router.post("/createRide", rideController.createRide);

router.get("/getRide", rideController.getRide);
router.get("/:rideId", rideController.getRide);

router.patch("/:rideId/status", rideController.updateRideStatus);
router.post("/status", rideController.updateRideStatus);
router.post("/updateRideStatus", rideController.updateRideStatus);

module.exports = router;
