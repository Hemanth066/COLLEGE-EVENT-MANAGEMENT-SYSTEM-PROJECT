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

// MongoDB Connection with Local Fallback
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/CEM";
const LOCAL_URI = "mongodb://127.0.0.1:27017/CEM";

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log("MongoDB Connected ✅ (Atlas/Primary)");
  } catch (err) {
    console.warn("Primary MongoDB Connection failed. Trying local fallback...");
    try {
      await mongoose.connect(LOCAL_URI, { serverSelectionTimeoutMS: 5000 });
      console.log("MongoDB Connected ✅ (Local Fallback)");
    } catch (localErr) {
      console.error("Failed to connect to MongoDB:", localErr.message);
    }
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
const certificateRoutes    = require("./routes/certificateRoutes");
const otherCertRoutes      = require("./routes/otherCertRoutes");
const pastEventRoutes      = require("./routes/pastEventRoutes");

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
app.use("/api/other-certs",  otherCertRoutes);
app.use("/api/past-events",  pastEventRoutes);

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
