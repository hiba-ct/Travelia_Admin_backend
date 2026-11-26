
const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  getProfile,
} = require("../controllers/authController");

const {
  authenticateToken,
} = require("../middleware/authMiddleware");

// Register
router.post("/register", registerUser);

// Login
router.post("/login", loginUser);

// Logged-in user profile
router.get("/profile", authenticateToken, getProfile);

module.exports = router;
