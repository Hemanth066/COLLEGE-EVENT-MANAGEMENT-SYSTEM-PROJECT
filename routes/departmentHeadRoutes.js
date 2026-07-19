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

// ── DEPARTMENT STUDENTS (individual list with scores) ──
router.get("/students/:departmentHeadId", async (req, res) => {
  try {
    const dh = await DepartmentHead.findById(req.params.departmentHeadId);
    if (!dh) return res.status(404).json({ message: "Department Head not found" });

    const yearGroup = dh.year;
    const years = yearGroup === '2-3-4' ? ['2','3','4'] : [yearGroup];

    const students = await Student.find({ branch: dh.department, year: { $in: years } })
      .select("-password")
      .sort({ year: 1, section: 1, fullName: 1 });

    res.json(students);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
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
// ── PROFILE GET ────────────────────────────────────────
router.get("/profile/:id", async (req, res) => {
  try {
    const dh = await DepartmentHead.findById(req.params.id).select("-password");
    if (!dh) return res.status(404).json({ message: "Not found" });
    res.json(dh);
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// ── PROFILE UPDATE ─────────────────────────────────────
router.put("/profile/:id", async (req, res) => {
  try {
    const { fullName, email, phone } = req.body;
    const dh = await DepartmentHead.findByIdAndUpdate(req.params.id, { fullName, email, phone }, { new: true }).select("-password");
    if (!dh) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Profile updated ✅", dh });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// ── CHANGE PASSWORD ────────────────────────────────────
router.put("/change-password/:id", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const dh = await DepartmentHead.findById(req.params.id);
    if (!dh) return res.status(404).json({ message: "Not found" });
    if (dh.password !== currentPassword) return res.status(400).json({ message: "Current password is incorrect" });
    if (newPassword.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
    dh.password = newPassword;
    await dh.save();
    res.json({ message: "Password changed ✅" });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// ── SIGNATURE UPLOAD ───────────────────────────────────
router.put("/signature/:id", async (req, res) => {
  try {
    const { signatureBase64 } = req.body;
    if (!signatureBase64) return res.status(400).json({ message: "No signature data" });
    const path = require("path");
    const fs   = require("fs");
    const sigDir = path.join(__dirname, "../public/signatures");
    if (!fs.existsSync(sigDir)) fs.mkdirSync(sigDir, { recursive: true });
    const dh = await DepartmentHead.findById(req.params.id);
    if (!dh) return res.status(404).json({ message: "Not found" });
    if (dh.signatureUrl) {
      const old = path.join(__dirname, "../public", dh.signatureUrl);
      if (fs.existsSync(old)) try { fs.unlinkSync(old); } catch(e) {}
    }
    const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, "");
    const filename   = `sig_dh_${dh._id}_${Date.now()}.png`;
    fs.writeFileSync(path.join(sigDir, filename), Buffer.from(base64Data, "base64"));
    dh.signatureUrl = `/signatures/${filename}`;
    await dh.save();
    res.json({ message: "Signature saved ✅", signatureUrl: dh.signatureUrl });
  } catch (e) { res.status(500).json({ message: "Server error: " + e.message }); }
});

module.exports = router;
