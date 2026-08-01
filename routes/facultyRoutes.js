const express = require("express");
const router = express.Router();
const Faculty = require("../models/Faculty");
const mongoose = require("mongoose");
const Student = require("../models/Student");
const Event = require("../models/Event");
const Registration = require("../models/Registration");


// Helper function to safely find faculty by string facultyId or ObjectId or username
async function findFacultyByIdentifier(id) {
  if (!id) return null;
  let faculty = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    try { faculty = await Faculty.findById(id); } catch(e) {}
  }
  if (!faculty) {
    try { faculty = await Faculty.findOne({ facultyId: id }); } catch(e) {}
  }
  if (!faculty) {
    try { faculty = await Faculty.findOne({ username: id }); } catch(e) {}
  }
  console.log(`findFacultyByIdentifier input: "${id}" -> found:`, faculty ? (faculty.fullName || faculty.username) : 'NONE');
  return faculty;
}



// Faculty Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const faculty = await Faculty.findOne({ username, password });

  if (!faculty) {
    return res.status(401).json({ message: "Invalid Faculty Credentials ❌" });
  }

  if (faculty.isLoggedIn) {
    return res.status(400).json({
      isAlreadyLoggedIn: true,
      message: "⚠️ Account is already logged in on another device or tab. Please log out from the last page first before logging in!"
    });
  }

  const newSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  faculty.isLoggedIn = true;
  faculty.sessionId = newSessionId;
  await faculty.save();

  res.json({
    message: "Faculty Login Successful ✅",
    faculty,
    sessionId: newSessionId
  });
});

// Faculty Logout
router.post("/logout", async (req, res) => {
  try {
    const { username, id, facultyId } = req.body;
    const query = [];
    if (username) query.push({ username });
    if (facultyId) query.push({ facultyId });
    if (id && mongoose.Types.ObjectId.isValid(id)) query.push({ _id: id });

    if (query.length > 0) {
      await Faculty.updateMany({ $or: query }, { $set: { isLoggedIn: false, sessionId: null } });
    }
    res.json({ message: "Logged out successfully ✅" });
  } catch (err) {
    console.error("Faculty logout error:", err);
    res.status(500).json({ message: "Logout error" });
  }
});

// Force Logout
router.post("/force-logout", async (req, res) => {
  try {
    const { username, password } = req.body;
    const faculty = await Faculty.findOne({ username, password });
    if (!faculty) {
      return res.status(401).json({ message: "Invalid credentials ❌" });
    }
    faculty.isLoggedIn = false;
    faculty.sessionId = null;
    await faculty.save();
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

    const faculty = await Faculty.findOne({ $or: query });
    if (!faculty || !faculty.isLoggedIn || faculty.sessionId !== sessionId) {
      return res.json({ valid: false, message: "Session expired or logged in on another device." });
    }
    res.json({ valid: true });
  } catch (e) {
    res.json({ valid: true });
  }
});

// Get Faculty Profile
router.get("/profile/:facultyId", async (req, res) => {
  try {
    const faculty = await findFacultyByIdentifier(req.params.facultyId);
    
    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }
    
    res.json(faculty);
  } catch (err) {
    console.error("Error fetching faculty profile:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// Update Faculty Profile
router.put("/profile/:facultyId", async (req, res) => {
  try {
    let faculty = await Faculty.findOneAndUpdate(
      { facultyId: req.params.facultyId },
      req.body,
      { new: true }
    );
    
    if (!faculty && mongoose.Types.ObjectId.isValid(req.params.facultyId)) {
      faculty = await Faculty.findByIdAndUpdate(
        req.params.facultyId,
        req.body,
        { new: true }
      );
    }
    
    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }
    
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

    const faculty = await findFacultyByIdentifier(req.params.facultyId);
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

    const faculty = await findFacultyByIdentifier(req.params.facultyId);
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

// ── GET STUDENTS FOR FACULTY BRANCH ─────────────────────────
router.get("/branch-students/:facultyId", async (req, res) => {
  try {
    const faculty = await findFacultyByIdentifier(req.params.facultyId);
    if (!faculty) return res.status(404).json({ message: "Faculty not found" });
    if (!faculty.isCoordinator) return res.status(403).json({ message: "Access denied. Only coordinators can view branch students." });

    const branch = (faculty.coordinatorBranch || faculty.department || "").trim();

    let query = {};
    if (branch && branch.toLowerCase() !== "all") {
      query = { branch: new RegExp(`^${branch}$`, 'i') };
    }

    let students = await Student.find(query)
      .select("-password")
      .sort({ fullName: 1 });

    const availableBranches = await Student.distinct('branch');

    res.json({
      department: branch,
      students,
      isFallbackAll: false,
      availableBranches
    });
  } catch (err) {
    console.error("Error fetching branch students:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// ── GET EVENTS FOR FACULTY BRANCH ───────────────────────────
router.get("/branch-events/:facultyId", async (req, res) => {
  try {
    const faculty = await findFacultyByIdentifier(req.params.facultyId);
    if (!faculty) return res.status(404).json({ message: "Faculty not found" });
    if (!faculty.isCoordinator) return res.status(403).json({ message: "Access denied. Only coordinators can view branch events." });

    const dept = (faculty.coordinatorBranch || faculty.department || "").trim();

    let query = {};
    if (dept && dept.toLowerCase() !== "all") {
      const deptFacultyList = await Faculty.find({
        $or: [
          { department: new RegExp(`^${dept}$`, 'i') },
          { coordinatorBranch: new RegExp(`^${dept}$`, 'i') }
        ]
      }, '_id');
      const deptFacultyIds = deptFacultyList.map(f => f._id);
      query = {
        $or: [
          { publishedByFacultyId: { $in: deptFacultyIds } },
          { department: new RegExp(`^${dept}$`, 'i') },
          { branch: new RegExp(`^${dept}$`, 'i') },
          { targetBranch: new RegExp(`^${dept}$`, 'i') }
        ]
      };
    }

    let events = await Event.find(query)
      .populate('publishedByFacultyId', 'fullName department coordinatorBranch')
      .sort({ eventDate: -1, date: -1 });

    const eventsWithStats = await Promise.all(events.map(async (ev) => {
      const regCount = await Registration.countDocuments({ eventId: ev._id });
      const attendedCount = await Registration.countDocuments({ eventId: ev._id, attended: true });
      return {
        ...ev.toObject(),
        totalRegistrations: regCount,
        totalAttended: attendedCount
      };
    }));

    res.json({ department: dept || '', events: eventsWithStats, isFallbackAll: false });
  } catch (err) {
    console.error("Error fetching branch events:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;


