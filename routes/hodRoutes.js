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

module.exports = router;

