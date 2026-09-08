"use strict";

const express = require("express");
const ratingController = require("../controllers/ratingController");
const {requireAuth} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);

router.post("/", ratingController.submitRating);
router.post("/submitRating", ratingController.submitRating);

router.get("/ride/:rideId", ratingController.getRideRatings);
router.get("/getRideRatings", ratingController.getRideRatings);
router.get("/", ratingController.getRideRatings);

module.exports = router;
