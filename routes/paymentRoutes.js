
const express = require("express");
const router = express.Router();

const {
  createPaymentOrder,
  verifyPayment,
  markPaymentFailed,
} = require("../controllers/paymentController");

const { authenticateToken } = require("../middleware/authMiddleware");

// CREATE PAYMENT ORDER
router.post(
  "/create-order",
  authenticateToken,
  createPaymentOrder
);

// VERIFY PAYMENT
router.post(
  "/verify",
  authenticateToken,
  verifyPayment
);

// PAYMENT FAILED
router.post(
  "/payment-failed",
  authenticateToken,
  markPaymentFailed
);

module.exports = router;
