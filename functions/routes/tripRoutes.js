"use strict";

const express = require("express");
const tripController = require("../controllers/tripController");
const {requireAuth} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);

router.get("/history", tripController.getTripHistory);
router.get("/getTripHistory", tripController.getTripHistory);

module.exports = router;
