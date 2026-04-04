const express = require("express");
const router = express.Router();
const Faculty = require("../models/Faculty");

// Faculty Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const faculty = await Faculty.findOne({ username, password });

  if (!faculty) {
    return res.status(401).json({ message: "Invalid Faculty Credentials ❌" });
  }

  res.json({
    message: "Faculty Login Successful ✅",
    faculty
  });
});

// Get Faculty Profile
router.get("/profile/:facultyId", async (req, res) => {
  try {
    console.log('Looking for faculty with ID:', req.params.facultyId);
    
    // Try to find by facultyId first, then by _id
    let faculty = await Faculty.findOne({ facultyId: req.params.facultyId });
    
    if (!faculty) {
      faculty = await Faculty.findById(req.params.facultyId);
    }
    
    if (!faculty) {
      console.log('Faculty not found');
      return res.status(404).json({ message: "Faculty not found" });
    }
    
    console.log('Faculty found:', faculty.username);
    res.json(faculty);
  } catch (err) {
    console.error("Error fetching faculty profile:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// Update Faculty Profile
router.put("/profile/:facultyId", async (req, res) => {
  try {
    console.log('Updating faculty with ID:', req.params.facultyId);
    
    // Try to find and update by facultyId first, then by _id
    let faculty = await Faculty.findOneAndUpdate(
      { facultyId: req.params.facultyId },
      req.body,
      { new: true }
    );
    
    if (!faculty) {
      faculty = await Faculty.findByIdAndUpdate(
        req.params.facultyId,
        req.body,
        { new: true }
      );
    }
    
    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }
    
    console.log('Faculty updated:', faculty.username);
    res.json({ message: "Profile Updated Successfully", faculty });
  } catch (err) {
    console.error("Error updating faculty profile:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// Change Faculty Password
router.put("/change-password/:facultyId", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    let faculty = await Faculty.findOne({ facultyId: req.params.facultyId });
    if (!faculty) faculty = await Faculty.findById(req.params.facultyId);
    if (!faculty) return res.status(404).json({ message: "Faculty not found" });

    if (faculty.password !== currentPassword) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    faculty.password = newPassword;
    await faculty.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
