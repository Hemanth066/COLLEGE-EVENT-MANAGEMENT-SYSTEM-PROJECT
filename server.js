require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Email Service (optional - will work without it)


// Serve static files with proper UTF-8 encoding
app.use(express.static("public", {
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
  }
}));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/CEM";
mongoose.connect(MONGO_URI)
.then(() => console.log("MongoDB Connected ✅"))
.catch(err => console.log(err));

// Import Routes
const facultyRoutes = require("./routes/facultyRoutes");
const studentRoutes = require("./routes/studentRoutes");
const eventRoutes = require("./routes/eventroutes");
const registrationRoutes = require("./routes/registrationroutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const departmentHeadRoutes = require("./routes/departmentHeadRoutes");
const certificateRoutes = require("./routes/certificateRoutes");

console.log("Routes imported successfully");

// Use Routes
app.use("/api/faculty", facultyRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/department-head", departmentHeadRoutes);
app.use("/api/certificates", certificateRoutes);

console.log("Routes registered:");
console.log("  - /api/faculty");
console.log("  - /api/student");
console.log("  - /api/events");
console.log("  - /api/registrations");
console.log("  - /api/feedback");
console.log("  - /api/notifications");
console.log("  - /api/admin");
console.log("  - /api/department-head");
console.log("  - /api/certificates");

// Test Route
app.get("/test", (_req, res) => {
  res.send("Server Working 🚀");
});

// Start Server with port fallback if unavailable
const DEFAULT_PORT = 5000;
const configuredPort = Number(process.env.PORT) || DEFAULT_PORT;
const maxPortAttempts = 5;

function startServer(port, attemptsLeft) {
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      console.warn(`Port ${port} is already in use. Trying port ${port + 1}...`);
      startServer(port + 1, attemptsLeft - 1);
    } else {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  });
}

startServer(configuredPort, maxPortAttempts);
