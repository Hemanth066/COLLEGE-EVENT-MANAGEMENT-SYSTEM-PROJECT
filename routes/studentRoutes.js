const express = require("express");
const router = express.Router();
const Student = require("../models/Student");

// Student Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const student = await Student.findOne({ username, password });

  if (!student) {
    return res.status(401).json({ message: "Invalid Student Credentials ❌" });
  }

  res.json({
    message: "Student Login Successful ✅",
    student
  });
});

// Get Student Profile
router.get("/profile/:studentId", async (req, res) => {
  try {
    console.log('Looking for student with ID:', req.params.studentId);
    
    // Try to find by studentId first, then by _id
    let student = await Student.findOne({ studentId: req.params.studentId });
    
    if (!student) {
      student = await Student.findById(req.params.studentId);
    }
    
    if (!student) {
      console.log('Student not found');
      return res.status(404).json({ message: "Student not found" });
    }
    
    console.log('Student found:', student.username);
    res.json(student);
  } catch (err) {
    console.error("Error fetching student profile:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// Update Student Profile
router.put("/profile/:studentId", async (req, res) => {
  try {
    console.log('Updating student with ID:', req.params.studentId);
    
    // Try to find and update by studentId first, then by _id
    let student = await Student.findOneAndUpdate(
      { studentId: req.params.studentId },
      req.body,
      { new: true }
    );
    
    if (!student) {
      student = await Student.findByIdAndUpdate(
        req.params.studentId,
        req.body,
        { new: true }
      );
    }
    
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    
    console.log('Student updated:', student.username);
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
    if (!student) student = await Student.findById(req.params.studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    if (student.password !== currentPassword) {
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
