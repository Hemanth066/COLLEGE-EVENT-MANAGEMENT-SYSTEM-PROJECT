const express = require("express");
const router  = express.Router();
const Admin    = require("../models/Admin");
const Faculty  = require("../models/Faculty");
const Student  = require("../models/Student");
const Event    = require("../models/Event");
const Registration = require("../models/Registration");
const Hod      = require("../models/DepartmentHead");  // reuse existing DepartmentHead model
const Dean     = require("../models/Dean");
const Branch   = require("../models/Branch");
// ── LOGIN ──────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username, password });
  if (!admin) return res.status(401).json({ message: "Invalid admin credentials ❌" });

  if (admin.isLoggedIn) {
    return res.status(400).json({
      isAlreadyLoggedIn: true,
      message: "⚠️ Account is already logged in on another device or tab. Please log out from the last page first before logging in!"
    });
  }

  admin.isLoggedIn = true;
  await admin.save();

  res.json({ message: "Admin login successful ✅", admin });
});

// Admin Logout
router.post("/logout", async (req, res) => {
  try {
    const { username, id } = req.body;
    const query = [];
    if (username) query.push({ username });
    if (id) query.push({ _id: id });

    if (query.length > 0) {
      const admin = await Admin.findOne({ $or: query });
      if (admin) {
        admin.isLoggedIn = false;
        await admin.save();
      }
    }
    res.json({ message: "Logged out successfully ✅" });
  } catch (err) {
    res.status(500).json({ message: "Logout error" });
  }
});

// Force Logout
router.post("/force-logout", async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username, password });
    if (!admin) return res.status(401).json({ message: "Invalid credentials ❌" });
    admin.isLoggedIn = false;
    await admin.save();
    res.json({ message: "Previous session cleared. You can now log in ✅" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// ── DASHBOARD STATS ────────────────────────────────────
router.get("/stats", async (_req, res) => {
  try {
    const [students, faculty, events, registrations] = await Promise.all([
      Student.countDocuments(),
      Faculty.countDocuments(),
      Event.countDocuments(),
      Registration.countDocuments()
    ]);
    res.json({ students, faculty, events, registrations });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// ── FACULTY CRUD ───────────────────────────────────────
router.get("/faculty", async (_req, res) => {
  const list = await Faculty.find().select("-password");
  res.json(list);
});

router.post("/faculty", async (req, res) => {
  try {
    const f = new Faculty(req.body);
    await f.save();
    res.json({ message: "Faculty added ✅", faculty: f });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

router.put("/faculty/:id", async (req, res) => {
  try {
    const f = await Faculty.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!f) return res.status(404).json({ message: "Faculty not found" });
    res.json({ message: "Faculty updated ✅", faculty: f });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

router.delete("/faculty/:id", async (req, res) => {
  try {
    await Faculty.findByIdAndDelete(req.params.id);
    res.json({ message: "Faculty removed ✅" });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// ── STUDENT CRUD ───────────────────────────────────────
router.get("/students", async (_req, res) => {
  const list = await Student.find().select("-password");
  res.json(list);
});

router.post("/students", async (req, res) => {
  try {
    const s = new Student(req.body);
    await s.save();
    res.json({ message: "Student added ✅", student: s });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

router.put("/students/:id", async (req, res) => {
  try {
    const s = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!s) return res.status(404).json({ message: "Student not found" });
    res.json({ message: "Student updated ✅", student: s });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

router.delete("/students/:id", async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: "Student removed ✅" });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// ── EVENTS ─────────────────────────────────────────────
router.get("/events", async (_req, res) => {
  const list = await Event.find().sort({ date: -1 });
  res.json(list);
});

router.delete("/events/:id", async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    await Registration.deleteMany({ eventId: req.params.id });
    res.json({ message: "Event removed ✅" });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// ── REGISTRATIONS ──────────────────────────────────────
router.get("/registrations", async (_req, res) => {
  const list = await Registration.find().populate("eventId").limit(500);
  res.json(list);
});

// ── HOD CRUD ───────────────────────────────────────────
router.get("/hods", async (_req, res) => {
  const list = await Hod.find().select("-password");
  res.json(list);
});
router.post("/hods", async (req, res) => {
  try {
    const h = new Hod(req.body); await h.save();
    res.json({ message: "HOD added ✅", hod: h });
  } catch (e) { res.status(400).json({ message: e.message }); }
});
router.put("/hods/:id", async (req, res) => {
  try {
    const h = await Hod.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!h) return res.status(404).json({ message: "HOD not found" });
    res.json({ message: "HOD updated ✅", hod: h });
  } catch (e) { res.status(400).json({ message: e.message }); }
});
router.delete("/hods/:id", async (req, res) => {
  try {
    await Hod.findByIdAndDelete(req.params.id);
    res.json({ message: "HOD removed ✅" });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// ── DEAN CRUD ──────────────────────────────────────────
router.get("/deans", async (_req, res) => {
  const list = await Dean.find().select("-password");
  res.json(list);
});
router.post("/deans", async (req, res) => {
  try {
    const d = new Dean(req.body); await d.save();
    res.json({ message: "Dean added ✅", dean: d });
  } catch (e) { res.status(400).json({ message: e.message }); }
});
router.put("/deans/:id", async (req, res) => {
  try {
    const d = await Dean.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!d) return res.status(404).json({ message: "Dean not found" });
    res.json({ message: "Dean updated ✅", dean: d });
  } catch (e) { res.status(400).json({ message: e.message }); }
});
router.delete("/deans/:id", async (req, res) => {
  try {
    await Dean.findByIdAndDelete(req.params.id);
    res.json({ message: "Dean removed ✅" });
  } catch (e) { res.status(400).json({ message: e.message }); }
});



// ── HOD LOGIN ──────────────────────────────────────────
router.post("/hod/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const hod = await Hod.findOne({ username, password });
    if (!hod) return res.status(401).json({ message: "Invalid HOD credentials ❌" });
    res.json({ message: "HOD login successful ✅", hod });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// ── DEAN LOGIN ─────────────────────────────────────────
router.post("/dean/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const dean = await Dean.findOne({ username, password });
    if (!dean) return res.status(401).json({ message: "Invalid Dean credentials ❌" });
    res.json({ message: "Dean login successful ✅", dean });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// ── COORDINATOR CRUD ───────────────────────────────────
router.get("/coordinators", async (_req, res) => {
  try {
    const list = await Faculty.find({ isCoordinator: true }).select("-password");
    res.json(list);
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

router.post("/coordinators", async (req, res) => {
  try {
    const { facultyId, branch } = req.body;
    if (!facultyId || !branch) {
      return res.status(400).json({ message: "Please select both a Faculty member and a Branch" });
    }

    // Unassign existing coordinator for this branch
    await Faculty.updateMany({ coordinatorBranch: branch }, { $set: { isCoordinator: false, coordinatorBranch: '' } });

    // Assign new coordinator
    const updated = await Faculty.findByIdAndUpdate(
      facultyId,
      { isCoordinator: true, coordinatorBranch: branch },
      { new: true }
    ).select("-password");

    if (!updated) return res.status(404).json({ message: "Faculty member not found" });

    res.json({ message: `Assigned as Coordinator for ${branch} ✅`, coordinator: updated });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

router.delete("/coordinators/:id", async (req, res) => {
  try {
    await Faculty.findByIdAndUpdate(req.params.id, { isCoordinator: false, coordinatorBranch: '' });
    res.json({ message: "Coordinator role removed ✅" });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// ── DEAN PROFILE GET ───────────────────────────────────
router.get("/dean/profile/:id", async (req, res) => {
  try {
    const dean = await Dean.findById(req.params.id).select("-password");
    if (!dean) return res.status(404).json({ message: "Dean not found" });
    res.json(dean);
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// ── DEAN PROFILE UPDATE ─────────────────────────────────
router.put("/dean/profile/:id", async (req, res) => {
  try {
    const { fullName, email, phone, faculty, year } = req.body;
    const dean = await Dean.findByIdAndUpdate(
      req.params.id,
      { fullName, email, phone, faculty, year },
      { new: true }
    ).select("-password");
    if (!dean) return res.status(404).json({ message: "Dean not found" });
    res.json({ message: "Profile updated ✅", dean });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// ── DEAN CHANGE PASSWORD ────────────────────────────────
router.put("/dean/change-password/:id", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const dean = await Dean.findById(req.params.id);
    if (!dean) return res.status(404).json({ message: "Dean not found" });
    if (dean.password !== currentPassword) return res.status(400).json({ message: "Current password is incorrect" });
    if (newPassword.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
    dean.password = newPassword;
    await dean.save();
    res.json({ message: "Password changed successfully ✅" });
  } catch (e) { res.status(500).json({ message: "Server error" }); }
});

// ── DEAN SIGNATURE UPLOAD ───────────────────────────────
router.put("/dean/signature/:id", async (req, res) => {
  try {
    const { signatureBase64 } = req.body;
    if (!signatureBase64) return res.status(400).json({ message: "No signature data" });
    const path = require("path");
    const fs   = require("fs");
    const sigDir = path.join(__dirname, "../public/signatures");
    if (!fs.existsSync(sigDir)) fs.mkdirSync(sigDir, { recursive: true });
    const dean = await Dean.findById(req.params.id);
    if (!dean) return res.status(404).json({ message: "Dean not found" });
    if (dean.signatureUrl) {
      const old = path.join(__dirname, "../public", dean.signatureUrl);
      if (fs.existsSync(old)) try { fs.unlinkSync(old); } catch(e) {}
    }
    const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, "");
    const filename   = `sig_dean_${dean._id}_${Date.now()}.png`;
    fs.writeFileSync(path.join(sigDir, filename), Buffer.from(base64Data, "base64"));
    dean.signatureUrl = `/signatures/${filename}`;
    await dean.save();
    res.json({ message: "Signature saved ✅", signatureUrl: dean.signatureUrl });
  } catch (e) { res.status(500).json({ message: "Server error: " + e.message }); }
});

// ── DEAN NAAC REPORT DATA ──────────────────────────────
router.get("/dean/naac-report/:deanId", async (req, res) => {
  try {
    const dean = await Dean.findById(req.params.deanId);
    if (!dean) return res.status(404).json({ message: "Dean not found" });

    const facultyList = await Faculty.find().select("-password");
    const allEvents   = await Event.find();

    const Registration    = require('../models/Registration');
    const Feedback        = require('../models/Feedback');
    const OtherCertUpload = require('../models/OtherCertUpload');

    let totalRegistrations = 0;
    let totalAttended = 0;
    let totalFeedbackCount = 0;
    let totalRatingSum = 0;

    const eventDetails = await Promise.all(allEvents.map(async (e) => {
      const regs = await Registration.find({ eventId: e._id });
      const regCount = regs.length;
      const attCount = regs.filter(r => r.attended).length;

      const fbs = await Feedback.find({ eventId: e._id });
      const avgRating = fbs.length > 0 ? (fbs.reduce((acc, curr) => acc + (curr.rating || 0), 0) / fbs.length).toFixed(1) : 'N/A';

      totalRegistrations += regCount;
      totalAttended += attCount;
      if (fbs.length > 0) {
        totalFeedbackCount += fbs.length;
        totalRatingSum += fbs.reduce((acc, curr) => acc + (curr.rating || 0), 0);
      }

      return {
        eventId: e._id,
        title: e.title,
        category: e.category || 'General',
        date: e.date ? new Date(e.date).toLocaleDateString('en-IN') : 'N/A',
        facultyName: e.faculty || 'Faculty',
        registered: regCount,
        attended: attCount,
        attendanceRate: regCount > 0 ? ((attCount / regCount) * 100).toFixed(1) + '%' : '0%',
        avgRating
      };
    }));

    const otherCertsCount = await OtherCertUpload.countDocuments({ status: 'approved' });
    const overallAttendanceRate = totalRegistrations > 0 ? ((totalAttended / totalRegistrations) * 100).toFixed(1) : '0.0';
    const overallAvgRating = totalFeedbackCount > 0 ? (totalRatingSum / totalFeedbackCount).toFixed(1) : 'N/A';

    res.json({
      department: dean.faculty || 'School of Engineering (All Departments)',
      academicYearGroup: dean.year || '2025-2026',
      generatedAt: new Date().toISOString(),
      summary: {
        totalFaculty: facultyList.length,
        totalEvents: allEvents.length,
        totalRegistrations,
        totalAttended,
        overallAttendanceRate: overallAttendanceRate + '%',
        totalFeedbackCount,
        overallAvgRating,
        otherCertificatesVerified: otherCertsCount
      },
      events: eventDetails
    });
  } catch (e) {
    console.error('Error generating Dean NAAC report:', e);
    res.status(500).json({ message: "Server error: " + e.message });
  }
});

// ── DEAN EXPORT EXCEL REPORT ───────────────────────────
router.get("/dean/export-excel/:deanId", async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const dean = await Dean.findById(req.params.deanId);
    if (!dean) return res.status(404).json({ message: "Dean not found" });

    const allEvents    = await Event.find();
    const Registration = require('../models/Registration');
    const Feedback     = require('../models/Feedback');

    const eventRows = await Promise.all(allEvents.map(async (e, idx) => {
      const regs = await Registration.find({ eventId: e._id });
      const attCount = regs.filter(r => r.attended).length;
      const fbs = await Feedback.find({ eventId: e._id });
      const avgRating = fbs.length > 0 ? (fbs.reduce((acc, curr) => acc + (curr.rating || 0), 0) / fbs.length).toFixed(1) : 'N/A';

      return {
        "S.No": idx + 1,
        "Event Title": e.title,
        "Faculty Host": e.faculty || 'N/A',
        "Category": e.category || 'General',
        "Event Date": e.date ? new Date(e.date).toLocaleDateString('en-IN') : 'N/A',
        "Registered Students": regs.length,
        "Attended Students": attCount,
        "Attendance Rate": regs.length > 0 ? ((attCount / regs.length) * 100).toFixed(1) + "%" : "0%",
        "Avg Feedback Rating": avgRating
      };
    }));

    const wb = XLSX.utils.book_new();
    const wsEvents = XLSX.utils.json_to_sheet(eventRows);
    XLSX.utils.book_append_sheet(wb, wsEvents, "Executive_NAAC_Summary");

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (e) {
    console.error('Error exporting Dean Excel report:', e);
    res.status(500).json({ message: "Server error: " + e.message });
  }
});

// ── BRANCH SEEDING HELPER ─────────────────────────────
async function seedDefaultBranches() {
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
}

// ── BRANCH CRUD ───────────────────────────────────────
router.get("/branches", async (_req, res) => {
  try {
    await seedDefaultBranches();
    const branches = await Branch.find().sort({ name: 1 });
    res.json(branches);
  } catch (e) {
    res.status(500).json({ message: "Error fetching branches: " + e.message });
  }
});

router.post("/branches", async (req, res) => {
  try {
    const name = String(req.body.name || '').trim().toUpperCase();
    if (!name) return res.status(400).json({ message: "Branch name is required ⚠️" });

    const existing = await Branch.findOne({ name });
    if (existing) return res.status(400).json({ message: `Branch '${name}' already exists ⚠️` });

    const branch = new Branch({
      name,
      code: String(req.body.code || '').trim().toUpperCase(),
      description: String(req.body.description || '').trim()
    });

    await branch.save();
    res.json({ message: "Branch created successfully ✅", branch });
  } catch (e) {
    res.status(400).json({ message: "Error creating branch: " + e.message });
  }
});

router.put("/branches/:id", async (req, res) => {
  try {
    const { name, code, description } = req.body;
    const updateData = {};
    if (name) updateData.name = String(name).trim().toUpperCase();
    if (code !== undefined) updateData.code = String(code).trim().toUpperCase();
    if (description !== undefined) updateData.description = String(description).trim();

    const branch = await Branch.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!branch) return res.status(404).json({ message: "Branch not found" });

    res.json({ message: "Branch updated successfully ✅", branch });
  } catch (e) {
    res.status(400).json({ message: "Error updating branch: " + e.message });
  }
});

router.delete("/branches/:id", async (req, res) => {
  try {
    const deleted = await Branch.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Branch not found" });

    res.json({ message: "Branch deleted successfully ✅" });
  } catch (e) {
    res.status(400).json({ message: "Error deleting branch: " + e.message });
  }
});

module.exports = router;
