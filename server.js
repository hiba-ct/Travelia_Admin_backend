
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const travelRoutes = require("./routes/travelRoutes");
const touristPlaceRoutes = require("./routes/touristPlaceRoutes");

const app = express();

// Both frontend domains
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",

  // Admin frontend
  "https://travelia-admin-frontent-qpbm.vercel.app",

  // Travelia user frontend
  "https://frontent-travelia.vercel.app"
];

// CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow Postman and requests without origin
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("Blocked by CORS:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// Middleware
app.use(express.json({ limit: "1mb" }));

// API routes shared by both frontends
app.use("/api/travels", travelRoutes);
app.use("/api/tourist-places", touristPlaceRoutes);

// Backend status
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Travelia API is running successfully!"
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: "API route not found."
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error(error);

  if (error.name === "ValidationError") {
    return res.status(400).json({
      message: Object.values(error.errors)
        .map(e => e.message)
        .join(", ")
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      message: "Invalid value supplied."
    });
  }

  res.status(500).json({
    message: "Server error. Please try again."
  });
});

// Start server
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Travelia API running on port ${PORT}`);
    });
  })
  .catch(error => {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  });
    