const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Student = require("../models/Student");

// Student Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const student = await Student.findOne({ username });

  if (!student) {
    return res.status(401).json({ message: "Invalid Student Credentials ❌" });
  }

  const authResult = await student.comparePassword(password);
  if (!authResult.isValid) {
    return res.status(401).json({ message: "Invalid Student Credentials ❌" });
  }

  if (student.isLoggedIn) {
    return res.status(400).json({
      isAlreadyLoggedIn: true,
      message: "⚠️ Account is already logged in on another device or tab. Please log out from the last page first before logging in!"
    });
  }

  const newSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  student.isLoggedIn = true;
  student.sessionId = newSessionId;
  if (authResult.isLegacyPlaintext) student.password = password; // pre-save hook will hash it
  await student.save();

  res.json({
    message: "Student Login Successful ✅",
    student,
    sessionId: newSessionId
  });
});

// Student Logout
router.post("/logout", async (req, res) => {
  try {
    const { username, id, studentId } = req.body;
    const query = [];
    if (username) query.push({ username });
    if (studentId) query.push({ studentId });
    if (id && mongoose.Types.ObjectId.isValid(id)) query.push({ _id: id });

    if (query.length > 0) {
      await Student.updateMany({ $or: query }, { $set: { isLoggedIn: false, sessionId: null } });
    }
    res.json({ message: "Logged out successfully ✅" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: "Logout error" });
  }
});

// Force Logout (Clear Session)
router.post("/force-logout", async (req, res) => {
  try {
    const { username, password } = req.body;
    const student = await Student.findOne({ username });
    if (!student) {
      return res.status(401).json({ message: "Invalid credentials ❌" });
    }
    const authResult = await student.comparePassword(password);
    if (!authResult.isValid) {
      return res.status(401).json({ message: "Invalid credentials ❌" });
    }
    student.isLoggedIn = false;
    student.sessionId = null;
    if (authResult.isLegacyPlaintext) student.password = password;
    await student.save();
    res.json({ message: "Previous session cleared. You can now log in ✅" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// Verify Active Session
router.post("/verify-session", async (req, res) => {
  try {
    const { id, username, sessionId } = req.body;
    const query = [];
    if (username) query.push({ username });
    if (id) query.push({ _id: id });
    if (query.length === 0) return res.json({ valid: true });

    const student = await Student.findOne({ $or: query });
    if (!student || !student.isLoggedIn || student.sessionId !== sessionId) {
      return res.json({ valid: false, message: "Session expired or logged in on another device." });
    }
    res.json({ valid: true });
  } catch (e) {
    res.json({ valid: true });
  }
});

// Search student by PIN (for faculty "Add Past Data" feature)
router.get("/search/:pin", async (req, res) => {
  try {
    const pin = req.params.pin.trim();
    const student = await Student.findOne({ pinNumber: pin })
      || await Student.findOne({ studentId: pin });

    if (!student) {
      return res.status(404).json({ found: false, message: "No student found with that ID" });
    }

    res.json({
      found: true,
      student: {
        _id:      student._id,
        fullName: student.fullName || student.username,
        pinNumber: student.pinNumber || student.studentId,
        branch:   student.branch,
        year:     student.year,
        email:    student.email
      }
    });
  } catch (err) {
    console.error("Error searching student:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// Helper to safely find student by ObjectId, studentId, pinNumber, or username
async function resolveStudent(identifier) {
  if (!identifier) return null;
  const trimmed = decodeURIComponent(String(identifier)).trim();
  if (!trimmed) return null;

  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    const s = await Student.findById(trimmed);
    if (s) return s;
  }

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pinRegex = new RegExp('^' + escaped + '$', 'i');
  return await Student.findOne({
    $or: [
      { studentId: pinRegex },
      { pinNumber: pinRegex },
      { username: pinRegex }
    ]
  });
}

// Get Student Profile
router.get("/profile/:studentId", async (req, res) => {
  try {
    const student = await resolveStudent(req.params.studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json(student);
  } catch (err) {
    console.error("Error fetching student profile:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// Update Student Profile
router.put("/profile/:studentId", async (req, res) => {
  try {
    const student = await resolveStudent(req.params.studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    Object.assign(student, req.body);

    let hasAnySemScore = false;
    for (let s = 1; s <= 8; s++) {
      const k = 'sem' + s + 'Score';
      if (req.body[k] !== undefined && req.body[k] !== null && !isNaN(req.body[k])) {
        student[k] = Number(req.body[k]);
        hasAnySemScore = true;
      }
    }
    if (hasAnySemScore) {
      student.score = [1, 2, 3, 4, 5, 6, 7, 8].reduce((acc, s) => acc + (Number(student['sem' + s + 'Score']) || 0), 0);
    }

    await student.save();
    res.json({ message: "Profile Updated Successfully", student });
  } catch (err) {
    console.error("Error updating student profile:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// Change Student Password
router.put("/change-password/:studentId", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    let student = await Student.findOne({ studentId: req.params.studentId });
    if (!student && mongoose.Types.ObjectId.isValid(req.params.studentId)) {
      student = await Student.findById(req.params.studentId);
    }
    if (!student) return res.status(404).json({ message: "Student not found" });

    const authResult = await student.comparePassword(currentPassword);
    if (!authResult.isValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    student.password = newPassword;
    await student.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;