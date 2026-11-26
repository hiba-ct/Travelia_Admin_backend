
const Booking = require("../models/Booking");

// ===================================
// GET BOOKINGS OF LOGGED-IN USER
// ===================================
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      user: req.userId,
    })
      .populate("travel")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });

  } catch (error) {
    console.error("Get my bookings error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch your bookings.",
    });
  }
};


// ===================================
// GET ALL BOOKINGS FOR ADMIN
// ===================================
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("user", "name email")
      .populate("travel", "title destination country")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });

  } catch (error) {
    console.error("Get all bookings error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch all bookings.",
    });
  }
};
