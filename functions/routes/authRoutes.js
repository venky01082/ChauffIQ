"use strict";

const express = require("express");
const authController = require("../controllers/authController");
const {requireAuth} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/sync", requireAuth, authController.syncUser);
router.post("/syncUser", requireAuth, authController.syncUser);

module.exports = router;
