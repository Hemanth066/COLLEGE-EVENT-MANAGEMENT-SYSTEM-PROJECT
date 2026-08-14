require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Email Service (optional - will work without it)


// Serve static files with proper UTF-8 encoding & no-cache headers for HTML
app.use(express.static("public", {
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
  }
}));

// MongoDB Connection
const ATLAS_URI = "mongodb+srv://cemuser:Cem12345@cem.c5r0uv0.mongodb.net/CEM?retryWrites=true&w=majority&appName=CEM";
const MONGO_URI = process.env.MONGO_URI;

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000
    });

    console.log("MongoDB Connected ✅");
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err.message);
  }
}

connectDB();


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
const otherCertRoutes = require("./routes/otherCertRoutes");
const pastEventRoutes = require("./routes/pastEventRoutes");

console.log("Routes imported successfully");

// Use Routes
app.use("/api/faculty", facultyRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

// Public GET /api/branches endpoint for dynamic branch dropdowns across all portals
app.get("/api/branches", async (_req, res) => {
  try {
    const Branch = require("./models/Branch");
    const count = await Branch.countDocuments();
    if (count === 0) {
      const defaults = [
        { name: "CSE", code: "11", description: "Computer Science and Engineering" },
        { name: "AIML", code: "66", description: "Artificial Intelligence and Machine Learning" },
        { name: "DS", code: "67", description: "Data Science" },
        { name: "IT", code: "12", description: "Information Technology" },
        { name: "ECE", code: "04", description: "Electronics and Communication Engineering" },
        { name: "EEE", code: "02", description: "Electrical and Electronics Engineering" },
        { name: "MECH", code: "03", description: "Mechanical Engineering" },
        { name: "CIVIL", code: "01", description: "Civil Engineering" }
      ];
      await Branch.insertMany(defaults);
    }
    const branches = await Branch.find().sort({ name: 1 });
    res.json(branches);
  } catch (e) {
    res.status(500).json({ message: "Error fetching branches: " + e.message });
  }
});
app.use("/api/department-head", departmentHeadRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/other-certs", otherCertRoutes);
app.use("/api/past-events", pastEventRoutes);

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

    // Schedule Certificate Cleanup (runs once on startup, then every 6 hours)
    try {
      const { cleanupExpiredCertificates, cleanupExpiredOtherCertificates } = require('./utils/certificateCleanup');
      cleanupExpiredCertificates().catch(err => console.error('[Event Cleanup Init Error]:', err.message));
      cleanupExpiredOtherCertificates().catch(err => console.error('[OtherCert Cleanup Init Error]:', err.message));
      setInterval(() => {
        cleanupExpiredCertificates().catch(err => console.error('[Event Cleanup Interval Error]:', err.message));
        cleanupExpiredOtherCertificates().catch(err => console.error('[OtherCert Cleanup Interval Error]:', err.message));
      }, 6 * 60 * 60 * 1000); // 6 hours
    } catch (e) {
      console.error('Failed to initialize certificate cleanup task:', e.message);
    }
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
