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

// Upload / update faculty signature (base64 PNG)
router.put("/signature/:facultyId", async (req, res) => {
  try {
    const { signatureBase64 } = req.body;
    if (!signatureBase64) return res.status(400).json({ message: 'No signature data provided' });

    const path = require('path');
    const fs   = require('fs');
    const sigDir = path.join(__dirname, '../public/signatures');
    if (!fs.existsSync(sigDir)) fs.mkdirSync(sigDir, { recursive: true });

    let faculty = await Faculty.findOne({ facultyId: req.params.facultyId });
    if (!faculty) faculty = await Faculty.findById(req.params.facultyId);
    if (!faculty) return res.status(404).json({ message: 'Faculty not found' });

    // Delete old signature file if exists
    if (faculty.signatureUrl) {
      const old = path.join(__dirname, '../public', faculty.signatureUrl);
      if (fs.existsSync(old)) try { fs.unlinkSync(old); } catch(e) {}
    }

    const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, '');
    const filename   = `sig_${faculty._id}_${Date.now()}.png`;
    const filepath   = path.join(sigDir, filename);
    fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));

    faculty.signatureUrl = `/signatures/${filename}`;
    await faculty.save();

    res.json({ message: 'Signature saved ✅', signatureUrl: faculty.signatureUrl });
  } catch (err) {
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

module.exports = router;
