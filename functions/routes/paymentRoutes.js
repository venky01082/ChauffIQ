"use strict";

const express = require("express");
const paymentController = require("../controllers/paymentController");
const {requireAuth} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);

router.post("/", paymentController.createPayment);
router.post("/createPayment", paymentController.createPayment);

router.get("/getPayment", paymentController.getPayment);
router.get("/:paymentId", paymentController.getPayment);
router.get("/", paymentController.getPayment);

router.post("/simulate", paymentController.simulatePaymentResult);
router.post("/simulatePaymentResult", paymentController.simulatePaymentResult);

module.exports = router;
