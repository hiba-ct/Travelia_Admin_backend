
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const connectDB = require("./config/db");

const Payment = require("./models/Payment");
const Booking = require("./models/Booking");

const travelRoutes = require("./routes/travelRoutes");
const touristPlaceRoutes = require("./routes/touristPlaceRoutes");

const bookingRoutes = require("./routes/bookingRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

// ===================================
// CORS CONFIGURATION
// ===================================

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://travelia-admin-frontent-qpbm.vercel.app",
  "https://frontent-travelia.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow Postman and server-to-server requests
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("Blocked by CORS:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ===================================
// RAZORPAY WEBHOOK
// IMPORTANT: Must be BEFORE express.json()
// ===================================

app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error("Razorpay webhook secret is missing");
        return res.status(500).send("Webhook configuration error");
      }

      const signature = req.headers["x-razorpay-signature"];

      if (
        !signature ||
        typeof signature !== "string" ||
        !Buffer.isBuffer(req.body)
      ) {
        return res.status(400).send("Invalid webhook request");
      }

      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(req.body)
        .digest("hex");

      const receivedBuffer = Buffer.from(signature, "hex");
      const expectedBuffer = Buffer.from(expectedSignature, "hex");

      if (
        receivedBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
      ) {
        return res.status(400).send("Invalid webhook signature");
      }

      const event = JSON.parse(req.body.toString());

      console.log("Razorpay webhook event:", event.event);

      // ===================================
      // PAYMENT CAPTURED
      // ===================================

      if (event.event === "payment.captured") {
        const captured = event.payload?.payment?.entity;

        if (!captured) {
          return res.status(400).send("Payment details missing");
        }

        const payment = await Payment.findOne({
          orderId: captured.order_id,
          amountMinor: captured.amount,
          currency: captured.currency,
        });

        if (!payment) {
          console.error("Matching payment not found");
          return res.status(404).send("Payment not found");
        }

        if (payment.status !== "Paid") {
          payment.paymentId = captured.id;
          payment.status = "Paid";

          await payment.save();

          await Booking.updateOne(
            {
              _id: payment.booking,
              paymentStatus: { $ne: "Paid" },
            },
            {
              $set: {
                paymentStatus: "Paid",
                bookingStatus: "Confirmed",
              },
            }
          );
        }
      }

      // ===================================
      // PAYMENT FAILED
      // ===================================

      if (event.event === "payment.failed") {
        const failed = event.payload?.payment?.entity;

        if (!failed) {
          return res.status(400).send("Payment details missing");
        }

        const payment = await Payment.findOne({
          orderId: failed.order_id,
        });

        if (payment && payment.status !== "Paid") {
          payment.status = "Failed";
          await payment.save();

          await Booking.updateOne(
            {
              _id: payment.booking,
              paymentStatus: "Pending",
            },
            {
              $set: {
                paymentStatus: "Failed",
              },
            }
          );
        }
      }

      return res.status(200).json({
        success: true,
        received: true,
      });
    } catch (error) {
      console.error("Razorpay webhook error:", error);
      return res.status(500).send("Webhook processing error");
    }
  }
);

// ===================================
// GENERAL MIDDLEWARE
// ===================================

app.use(express.json({ limit: "1mb" }));

// ===================================
// API ROUTES
// ===================================

app.use("/api/travels", travelRoutes);

app.use("/api/tourist-places", touristPlaceRoutes);


app.use("/api/bookings", bookingRoutes);
app.use("/api/auth", authRoutes);

// ===================================
// BACKEND STATUS
// ===================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Travelia API is running successfully!",
  });
});

// ===================================
// 404 HANDLER
// ===================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found.",
  });
});

// ===================================
// ERROR HANDLER
// ===================================

app.use((error, req, res, next) => {
  console.error("Server error:", error);

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: Object.values(error.errors)
        .map((e) => e.message)
        .join(", "),
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid value supplied.",
    });
  }

  res.status(500).json({
    success: false,
    message: "Server error. Please try again.",
  });
});

// ===================================
// START SERVER
// ===================================

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Travelia API running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  });
