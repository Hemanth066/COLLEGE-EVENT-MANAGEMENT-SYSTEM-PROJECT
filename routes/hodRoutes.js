const express = require("express");
const router = express.Router();
const Hod = require("../models/Hod");
const Faculty = require("../models/Faculty");
const Student = require("../models/Student");
const Event = require("../models/Event");

// ── HOD LOGIN ──────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const hod = await Hod.findOne({ username, password });
  if (!hod) return res.status(401).json({ message: "Invalid HOD credentials ❌" });
  res.json({ message: "HOD login successful ✅", hod });
});

// ── HOD DASHBOARD STATS ────────────────────────────────
router.get("/stats/:hodId", async (req, res) => {
  try {
    const hod = await Hod.findById(req.params.hodId);
    if (!hod) return res.status(404).json({ message: "HOD not found" });

    const dept = hod.department;
    const year = hod.year;

    // Total faculty in department
    const totalFaculty = await Faculty.countDocuments({ department: dept });

    // Total students in department/year
    const totalStudents = await Student.countDocuments({ 
      branch: dept, 
      year: year 
    });

    // Total events by faculty in department
    const deptEvents = await Event.find({ 
      publishedByFacultyId: { $in: await Faculty.find({ department: dept }, '_id') } 
    }).populate('publishedByFacultyId', 'fullName department');

    const totalEvents = deptEvents.length;

    // Students count per branch (grouped)
    const studentsByBranch = await Student.aggregate([
      { $match: { branch: dept, year: year } },
      { $group: { _id: { branch: "$branch", section: "$section" }, count: { $sum: 1 } } },
      { $sort: { "_id.branch": 1, "_id.section": 1 } }
    ]);

    res.json({ 
      totalFaculty, 
      totalStudents, 
      totalEvents,
      studentsByBranch,
      department: dept,
      year 
    });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── DEPARTMENT FACULTY ─────────────────────────────────
router.get("/faculty/:hodId", async (req, res) => {
  try {
    const hod = await Hod.findById(req.params.hodId);
    if (!hod) return res.status(404).json({ message: "HOD not found" });

    const faculty = await Faculty.find({ department: hod.department }).select("-password");
    res.json(faculty);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── SINGLE FACULTY (for edit) ─────────────────────────
router.get("/faculty/:hodId/:facultyId", async (req, res) => {
  try {
    const hod = await Hod.findById(req.params.hodId);
    if (!hod) return res.status(404).json({ message: "HOD not found" });

    const faculty = await Faculty.findById(req.params.facultyId).select("-password");
    if (!faculty || faculty.department !== hod.department) {
      return res.status(403).json({ message: "Faculty not in your department" });
    }
    res.json(faculty);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/faculty/:hodId/:facultyId", async (req, res) => {
  try {
    const hod = await Hod.findById(req.params.hodId);
    if (!hod) return res.status(404).json({ message: "HOD not found" });

    const faculty = await Faculty.findByIdAndUpdate(
      req.params.facultyId, 
      req.body, 
      { new: true }
    ).select("-password");

    if (!faculty || faculty.department !== hod.department) {
      return res.status(403).json({ message: "Faculty not in your department" });
    }

    res.json({ message: "Faculty updated ✅", faculty });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// ── DEPARTMENT STUDENTS (individual list with scores) ──
router.get("/students/:hodId", async (req, res) => {
  try {
    const hod = await Hod.findById(req.params.hodId);
    if (!hod) return res.status(404).json({ message: "HOD not found" });

    const students = await Student.find({ branch: hod.department, year: hod.year })
      .select("-password")
      .sort({ section: 1, fullName: 1 });

    res.json(students);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── DEPARTMENT EVENTS ─────────────────────────────────
router.get("/events/:hodId", async (req, res) => {
  try {
    const hod = await Hod.findById(req.params.hodId);
    if (!hod) return res.status(404).json({ message: "HOD not found" });

    // Get faculty IDs in HOD department
    const deptFacultyIds = await Faculty.find({ department: hod.department }, '_id');

    const events = await Event.find({ 
      publishedByFacultyId: { $in: deptFacultyIds } 
    }).populate('publishedByFacultyId', 'fullName department').sort({ date: -1 });

    res.json(events);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── HOD PROFILE GET ───────────────────────────────────
router.get("/profile/:hodId", async (req, res) => {
  try {
    const hod = await Hod.findById(req.params.hodId).select("-password");
    if (!hod) return res.status(404).json({ message: "HOD not found" });
    res.json(hod);
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// ── HOD PROFILE UPDATE ─────────────────────────────────
router.put("/profile/:hodId", async (req, res) => {
  try {
    const { fullName, email, phone } = req.body;
    const hod = await Hod.findByIdAndUpdate(
      req.params.hodId,
      { fullName, email, phone },
      { new: true }
    ).select("-password");
    if (!hod) return res.status(404).json({ message: "HOD not found" });
    res.json({ message: "Profile updated ✅", hod });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// ── HOD CHANGE PASSWORD ────────────────────────────────
router.put("/change-password/:hodId", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const hod = await Hod.findById(req.params.hodId);
    if (!hod) return res.status(404).json({ message: "HOD not found" });
    if (hod.password !== currentPassword) return res.status(400).json({ message: "Current password is incorrect" });
    if (newPassword.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
    hod.password = newPassword;
    await hod.save();
    res.json({ message: "Password changed successfully ✅" });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// ── HOD SIGNATURE UPLOAD ───────────────────────────────
router.put("/signature/:hodId", async (req, res) => {
  try {
    const { signatureBase64 } = req.body;
    if (!signatureBase64) return res.status(400).json({ message: "No signature data" });
    const path = require("path");
    const fs   = require("fs");
    const sigDir = path.join(__dirname, "../public/signatures");
    if (!fs.existsSync(sigDir)) fs.mkdirSync(sigDir, { recursive: true });
    const hod = await Hod.findById(req.params.hodId);
    if (!hod) return res.status(404).json({ message: "HOD not found" });
    if (hod.signatureUrl) {
      const old = path.join(__dirname, "../public", hod.signatureUrl);
      if (fs.existsSync(old)) try { fs.unlinkSync(old); } catch(e) {}
    }
    const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, "");
    const filename   = `sig_hod_${hod._id}_${Date.now()}.png`;
    fs.writeFileSync(path.join(sigDir, filename), Buffer.from(base64Data, "base64"));
    hod.signatureUrl = `/signatures/${filename}`;
    await hod.save();
    res.json({ message: "Signature saved ✅", signatureUrl: hod.signatureUrl });
  } catch (e) { res.status(500).json({ message: "Server error: " + e.message }); }
});

module.exports = router;
