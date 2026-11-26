
const mongoose = require("mongoose");
const crypto = require("crypto");

const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Travel = require("../models/Travel");
const razorpay = require("../services/razorpayService");

// CREATE BOOKING AND RAZORPAY ORDER
exports.createPaymentOrder = async (req, res) => {
  try {
    const {
      travelId,
      guests,
      fullName,
      email,
      phone,
      travelDate,
      specialRequests,
    } = req.body;

    const guestCount = Number(guests);

    if (
      !mongoose.isValidObjectId(travelId) ||
      !Number.isInteger(guestCount) ||
      guestCount < 1 ||
      guestCount > 20 ||
      !fullName?.trim() ||
      !email?.trim() ||
      !phone?.trim() ||
      !travelDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter all required booking details.",
      });
    }

    const travel = await Travel.findOne({
      _id: travelId,
      status: "Active",
    });

    if (!travel) {
      return res.status(404).json({
        success: false,
        message: "Active travel package not found.",
      });
    }

    const maxGuests = Math.min(
      Number(travel.travellers) || 20,
      20
    );

    if (guestCount > maxGuests) {
      return res.status(400).json({
        success: false,
        message: `Maximum guests allowed: ${maxGuests}`,
      });
    }

    if (
      String(travel.currency || "INR").toUpperCase() !== "INR"
    ) {
      return res.status(400).json({
        success: false,
        message: "This checkout currently accepts INR packages only.",
      });
    }

    const unitPrice = Number(travel.price);

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid package price.",
      });
    }

    const amountMinor = Math.round(
      unitPrice * guestCount * 100
    );

    if (
      !Number.isSafeInteger(amountMinor) ||
      amountMinor <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount.",
      });
    }

    // CREATE BOOKING
    const booking = await Booking.create({
      user: req.userId,
      travel: travel._id,
      packageTitle: travel.title,
      destination: travel.destination,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      travelDate,
      specialRequests: String(
        specialRequests || ""
      ).trim(),
      guests: guestCount,
      unitPrice,
      amountMinor,
      currency: "INR",
      bookingStatus: "Pending",
      paymentStatus: "Pending",
    });

    try {
      // CREATE RAZORPAY ORDER
      const order = await razorpay.orders.create({
        amount: amountMinor,
        currency: "INR",
        receipt: `booking_${booking._id}`,
        notes: {
          bookingId: booking._id.toString(),
          userId: req.userId.toString(),
        },
      });

      // SAVE PAYMENT DETAILS
      await Payment.create({
        booking: booking._id,
        orderId: order.id,
        amountMinor,
        currency: "INR",
        status: "Created",
      });

      return res.status(201).json({
        success: true,
        bookingId: booking._id,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      });

    } catch (orderError) {
      console.error("Razorpay order error:", orderError);

      booking.paymentStatus = "Failed";
      await booking.save();

      return res.status(502).json({
        success: false,
        message: "Booking was saved, but payment order creation failed.",
        bookingId: booking._id,
      });
    }

  } catch (error) {
    console.error("Create payment order:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create booking and payment order.",
    });
  }
};

// VERIFY RAZORPAY PAYMENT
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !/^[a-f0-9]{64}$/i.test(razorpay_signature || "")
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are invalid.",
      });
    }

    const payment = await Payment.findOne({
      orderId: razorpay_order_id,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment order not found.",
      });
    }

    const booking = await Booking.findOne({
      _id: payment.booking,
      user: req.userId,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    // VERIFY SIGNATURE
    const expectedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(
        `${payment.orderId}|${razorpay_payment_id}`
      )
      .digest("hex");

    const received = Buffer.from(
      razorpay_signature,
      "hex"
    );

    const expected = Buffer.from(
      expectedSignature,
      "hex"
    );

    if (
      received.length !== expected.length ||
      !crypto.timingSafeEqual(received, expected)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature.",
      });
    }

    // CHECK ACTUAL RAZORPAY PAYMENT STATUS
    const razorpayPayment = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    if (
      razorpayPayment.order_id !== payment.orderId ||
      razorpayPayment.amount !== payment.amountMinor ||
      razorpayPayment.currency !== payment.currency ||
      razorpayPayment.status !== "captured"
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment is not captured or payment details do not match.",
      });
    }

    // PREVENT DUPLICATE PAYMENT
    if (payment.status === "Paid") {
      if (payment.paymentId !== razorpay_payment_id) {
        return res.status(409).json({
          success: false,
          message: "This order was already paid using another payment.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Booking already confirmed.",
        booking,
      });
    }

    // UPDATE PAYMENT
    payment.paymentId = razorpay_payment_id;
    payment.status = "Paid";
    payment.failureReason = "";

    await payment.save();

    // CONFIRM BOOKING
    booking.paymentStatus = "Paid";
    booking.bookingStatus = "Confirmed";

    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Payment verified. Booking confirmed.",
      booking,
    });

  } catch (error) {
    console.error("Verify payment:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify payment.",
    });
  }
};

// RECORD PAYMENT FAILURE
exports.markPaymentFailed = async (req, res) => {
  try {
    const { orderId, reason } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required.",
      });
    }

    const payment = await Payment.findOne({
      orderId,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    const booking = await Booking.findOne({
      _id: payment.booking,
      user: req.userId,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    // NEVER CHANGE A SUCCESSFUL PAYMENT TO FAILED
    if (payment.status !== "Paid") {
      payment.status = "Failed";
      payment.failureReason = String(
        reason || "Payment failed"
      ).slice(0, 250);

      await payment.save();

      booking.paymentStatus = "Failed";
      await booking.save();
    }

    return res.status(200).json({
      success: true,
      message: "Payment status updated.",
    });

  } catch (error) {
    console.error("Payment failure:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update payment status.",
    });
  }
};
