"use strict";

const express = require("express");
const notificationController = require("../controllers/notificationController");
const {requireAuth} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);

router.post("/", notificationController.createNotification);
router.post("/createNotification", notificationController.createNotification);

router.post("/fcm-token", notificationController.registerFcmToken);
router.delete("/fcm-token", notificationController.registerFcmToken);
router.post("/registerFcmToken", notificationController.registerFcmToken);
router.delete("/registerFcmToken", notificationController.registerFcmToken);

module.exports = router;
