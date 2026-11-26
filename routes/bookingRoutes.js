
const express = require("express");
const router = express.Router();

const {
  getMyBookings,
  getAllBookings,
} = require("../controllers/bookingController");

// USER BOOKINGS
router.get("/my-bookings", getMyBookings);

// ADMIN - ALL CUSTOMER BOOKINGS
router.get("/admin/bookings", getAllBookings);

module.exports = router;
