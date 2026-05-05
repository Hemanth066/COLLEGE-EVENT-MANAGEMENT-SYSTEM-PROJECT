const express = require("express");
const router = express.Router();
const DepartmentHead = require("../models/DepartmentHead");
const Faculty = require("../models/Faculty");
const Student = require("../models/Student");
const Event = require("../models/Event");

// ── DEPARTMENT HEAD LOGIN ──────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const departmentHead = await DepartmentHead.findOne({ username, password });
  if (!departmentHead) return res.status(401).json({ message: "Invalid Department Head credentials ❌" });
  res.json({ message: "Department Head login successful ✅", departmentHead });
});

// ── DEPARTMENT HEAD DASHBOARD STATS ────────────────────────────────
router.get("/stats/:departmentHeadId", async (req, res) => {
  try {
    const departmentHead = await DepartmentHead.findById(req.params.departmentHeadId);
    if (!departmentHead) return res.status(404).json({ message: "Department Head not found" });

    const dept = departmentHead.department;
    const yearGroup = departmentHead.year;

    // Resolve which years this HOD covers
    const years = yearGroup === '2-3-4' ? ['2','3','4'] : [yearGroup];

    // Total faculty in department
    const totalFaculty = await Faculty.countDocuments({ department: dept });

    // Total students in department/year group
    const totalStudents = await Student.countDocuments({ 
      branch: dept, 
      year: { $in: years }
    });

    // Total events by faculty in department
    const deptFaculty = await Faculty.find({ department: dept });
    const facultyIds = new Set();
    deptFaculty.forEach(f => {
      if (f._id)       facultyIds.add(f._id.toString());
      if (f.facultyId) facultyIds.add(f.facultyId.toString());
    });
    const allEvts = await Event.find();
    const totalEvents = allEvts.filter(e =>
      (e.publishedByFacultyId && facultyIds.has(e.publishedByFacultyId.toString())) ||
      (e.publishedBy && facultyIds.has(e.publishedBy.toString()))
    ).length;

    // Students count per branch (grouped)
    const studentsByBranch = await Student.aggregate([
      { $match: { branch: dept, year: { $in: years } } },
      { $group: { _id: { branch: "$branch", section: "$section" }, count: { $sum: 1 } } },
      { $sort: { "_id.branch": 1, "_id.section": 1 } }
    ]);

    res.json({ 
      totalFaculty, 
      totalStudents, 
      totalEvents,
      studentsByBranch,
      department: dept,
      year: yearGroup,
      years
    });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── DEPARTMENT FACULTY ─────────────────────────────────
router.get("/faculty/:departmentHeadId", async (req, res) => {
  try {
    const departmentHead = await DepartmentHead.findById(req.params.departmentHeadId);
    if (!departmentHead) return res.status(404).json({ message: "Department Head not found" });

    const faculty = await Faculty.find({ department: departmentHead.department }).select("-password");
    res.json(faculty);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── SINGLE FACULTY (for edit) ─────────────────────────
router.get("/faculty/:departmentHeadId/:facultyId", async (req, res) => {
  try {
    const departmentHead = await DepartmentHead.findById(req.params.departmentHeadId);
    if (!departmentHead) return res.status(404).json({ message: "Department Head not found" });

    const faculty = await Faculty.findById(req.params.facultyId).select("-password");
    if (!faculty || faculty.department !== departmentHead.department) {
      return res.status(403).json({ message: "Faculty not in your department" });
    }
    res.json(faculty);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/faculty/:departmentHeadId/:facultyId", async (req, res) => {
  try {
    const departmentHead = await DepartmentHead.findById(req.params.departmentHeadId);
    if (!departmentHead) return res.status(404).json({ message: "Department Head not found" });

    const faculty = await Faculty.findByIdAndUpdate(
      req.params.facultyId, 
      req.body, 
      { new: true }
    ).select("-password");

    if (!faculty || faculty.department !== departmentHead.department) {
      return res.status(403).json({ message: "Faculty not in your department" });
    }

    res.json({ message: "Faculty updated ✅", faculty });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// ── DEPARTMENT EVENTS ─────────────────────────────────
router.get("/events/:departmentHeadId", async (req, res) => {
  try {
    const departmentHead = await DepartmentHead.findById(req.params.departmentHeadId);
    if (!departmentHead) return res.status(404).json({ message: "Department Head not found" });

    // Get all faculty in this department
    const deptFaculty = await Faculty.find({ department: departmentHead.department });

    // Build a set of all possible faculty identifiers (both _id and facultyId)
    const facultyIds = new Set();
    deptFaculty.forEach(f => {
      if (f._id)       facultyIds.add(f._id.toString());
      if (f.facultyId) facultyIds.add(f.facultyId.toString());
      if (f.username)  facultyIds.add(f.username);
    });

    // Get all events and filter by any matching faculty identifier
    const allEvents = await Event.find().sort({ date: -1 });
    const Registration = require('../models/Registration');

    const events = await Promise.all(
      allEvents
        .filter(e =>
          (e.publishedByFacultyId && facultyIds.has(e.publishedByFacultyId.toString())) ||
          (e.publishedBy && facultyIds.has(e.publishedBy.toString()))
        )
        .map(async e => {
          const obj = e.toObject();
          // Registration count
          obj.registrationCount = await Registration.countDocuments({ eventId: e._id });
          // Resolve faculty name
          const fac = deptFaculty.find(f =>
            f._id.toString() === (e.publishedByFacultyId||'') ||
            (f.facultyId && f.facultyId === e.publishedByFacultyId) ||
            f.username === e.publishedBy
          );
          obj.publishedByName = fac ? (fac.fullName || fac.username) : (e.faculty || e.publishedBy || '—');
          return obj;
        })
    );

    res.json(events);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

// ── REGISTRATIONS FOR AN EVENT ─────────────────────────
router.get("/event-registrations/:eventId", async (req, res) => {
  try {
    const Registration = require('../models/Registration');
    const regs = await Registration.find({ eventId: req.params.eventId });
    res.json(regs);
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// ── FEEDBACK FOR AN EVENT ──────────────────────────────
router.get("/event-feedback/:eventId", async (req, res) => {
  try {
    const Feedback = require('../models/Feedback');
    const fb = await Feedback.find({ eventId: req.params.eventId }).sort({ submittedAt: -1 });
    res.json(fb);
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});
