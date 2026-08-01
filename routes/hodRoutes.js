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

  if (hod.isLoggedIn) {
    return res.status(400).json({
      isAlreadyLoggedIn: true,
      message: "⚠️ Account is already logged in on another device or tab. Please log out from the last page first before logging in!"
    });
  }

  hod.isLoggedIn = true;
  await hod.save();

  res.json({ message: "HOD login successful ✅", hod });
});

// HOD Logout
router.post("/logout", async (req, res) => {
  try {
    const { username, id } = req.body;
    const query = [];
    if (username) query.push({ username });
    if (id) query.push({ _id: id });

    if (query.length > 0) {
      const h = await Hod.findOne({ $or: query });
      if (h) {
        h.isLoggedIn = false;
        await h.save();
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
    const h = await Hod.findOne({ username, password });
    if (!h) return res.status(401).json({ message: "Invalid credentials ❌" });
    h.isLoggedIn = false;
    await h.save();
    res.json({ message: "Previous session cleared. You can now log in ✅" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

function buildYearQuery(yearGroup) {
  if (!yearGroup || yearGroup === '2-3-4' || yearGroup === 'all' || yearGroup === '2,3,4') {
    return { $in: ['1', '2', '3', '4', '1st', '2nd', '3rd', '4th', '1st Year', '2nd Year', '3rd Year', '4th Year', 1, 2, 3, 4] };
  }
  const clean = String(yearGroup).replace(/[^0-9]/g, '');
  if (clean === '1') return { $in: ['1', '1st', '1st Year', 1] };
  if (clean === '2') return { $in: ['2', '2nd', '2nd Year', 2] };
  if (clean === '3') return { $in: ['3', '3rd', '3rd Year', 3] };
  if (clean === '4') return { $in: ['4', '4th', '4th Year', 4] };
  return yearGroup;
}

// ── HOD DASHBOARD STATS ────────────────────────────────
router.get("/stats/:hodId", async (req, res) => {
  try {
    const hod = await Hod.findById(req.params.hodId);
    if (!hod) return res.status(404).json({ message: "HOD not found" });

    const dept = (hod.department || '').trim();
    const year = hod.year;
    const yearQuery = buildYearQuery(year);

    // Total faculty in department
    const totalFaculty = await Faculty.countDocuments({ department: new RegExp('^' + dept + '$', 'i') });

    // Total students in department/year
    const totalStudents = await Student.countDocuments({ 
      branch: new RegExp('^' + dept + '$', 'i'), 
      year: yearQuery 
    });

    // Total events by faculty in department
    const deptFacultyIds = await Faculty.find({ department: new RegExp('^' + dept + '$', 'i') }, '_id');
    const deptEvents = await Event.find({ 
      publishedByFacultyId: { $in: deptFacultyIds } 
    }).populate('publishedByFacultyId', 'fullName department');

    const totalEvents = deptEvents.length;

    // Students count per branch (grouped)
    const studentsByBranch = await Student.aggregate([
      { $match: { branch: new RegExp('^' + dept + '$', 'i'), year: yearQuery } },
      { $group: { _id: { branch: "$branch" }, count: { $sum: 1 } } },
      { $sort: { "_id.branch": 1 } }
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

    const dept = (hod.department || '').trim();
    const yearQuery = buildYearQuery(hod.year);

    const students = await Student.find({ 
      branch: new RegExp('^' + dept + '$', 'i'), 
      year: yearQuery 
    })
      .select("-password")
      .sort({ fullName: 1 });

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

// ── NAAC / NBA ACCREDITATION REPORT DATA FOR DEAN / HOD ─────────────────
router.get("/naac-report/:hodId", async (req, res) => {
  try {
    const hod = await Hod.findById(req.params.hodId);
    if (!hod) return res.status(404).json({ message: "HOD not found" });

    const dept = hod.department;
    const yearGroup = hod.year;

    const facultyList = await Faculty.find({ department: dept }).select("-password");
    const facultyIds = facultyList.map(f => f._id.toString());
    const facultyMap = {};
    facultyList.forEach(f => { facultyMap[f._id.toString()] = f.fullName; });

    const allEvents = await Event.find();
    const deptEvents = allEvents.filter(e => e.publishedByFacultyId && facultyIds.includes(e.publishedByFacultyId.toString()));

    const Registration = require('../models/Registration');
    const Feedback = require('../models/Feedback');
    const OtherCertUpload = require('../models/OtherCertUpload');

    let totalRegistrations = 0;
    let totalAttended = 0;
    let totalFeedbackCount = 0;
    let totalRatingSum = 0;

    const eventDetails = await Promise.all(deptEvents.map(async (e) => {
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
        facultyName: facultyMap[e.publishedByFacultyId?.toString()] || e.facultyName || 'Faculty',
        registered: regCount,
        attended: attCount,
        attendanceRate: regCount > 0 ? ((attCount / regCount) * 100).toFixed(1) + '%' : '0%',
        avgRating
      };
    }));

    const otherCertsCount = await OtherCertUpload.countDocuments({ branch: new RegExp('^' + dept + '$', 'i'), status: 'approved' });
    const overallAttendanceRate = totalRegistrations > 0 ? ((totalAttended / totalRegistrations) * 100).toFixed(1) : '0.0';
    const overallAvgRating = totalFeedbackCount > 0 ? (totalRatingSum / totalFeedbackCount).toFixed(1) : 'N/A';

    res.json({
      department: dept,
      academicYearGroup: yearGroup,
      generatedAt: new Date().toISOString(),
      summary: {
        totalFaculty: facultyList.length,
        totalEvents: deptEvents.length,
        totalRegistrations,
        totalAttended,
        overallAttendanceRate: overallAttendanceRate + '%',
        totalFeedbackCount,
        overallAvgRating,
        otherCertificatesVerified: otherCertsCount
      },
      events: eventDetails,
      faculty: facultyList.map(f => ({ name: f.fullName, email: f.email, designation: f.designation || 'Faculty' }))
    });
  } catch (e) {
    console.error('Error generating HOD NAAC report:', e);
    res.status(500).json({ message: "Server error: " + e.message });
  }
});

// ── EXPORT EXCEL NAAC / NBA REPORT FOR HOD / DEAN ──────────────────────
router.get("/export-excel/:hodId", async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const hod = await Hod.findById(req.params.hodId);
    if (!hod) return res.status(404).json({ message: "Not found" });

    const dept = hod.department;
    const facultyList = await Faculty.find({ department: dept });
    const facultyIds = facultyList.map(f => f._id.toString());
    const allEvents = await Event.find();
    const deptEvents = allEvents.filter(e => e.publishedByFacultyId && facultyIds.includes(e.publishedByFacultyId.toString()));

    const Registration = require('../models/Registration');
    const Feedback = require('../models/Feedback');

    const eventRows = await Promise.all(deptEvents.map(async (e, idx) => {
      const regs = await Registration.find({ eventId: e._id });
      const attCount = regs.filter(r => r.attended).length;
      const fbs = await Feedback.find({ eventId: e._id });
      const avgRating = fbs.length > 0 ? (fbs.reduce((acc, curr) => acc + (curr.rating || 0), 0) / fbs.length).toFixed(1) : 'N/A';

      return {
        "S.No": idx + 1,
        "Event Title": e.title,
        "Category": e.category || 'General',
        "Event Date": e.date ? new Date(e.date).toLocaleDateString('en-IN') : 'N/A',
        "Registered": regs.length,
        "Attended": attCount,
        "Attendance Rate": regs.length > 0 ? ((attCount / regs.length) * 100).toFixed(1) + "%" : "0%",
        "Avg Rating": avgRating
      };
    }));

    const wb = XLSX.utils.book_new();
    const wsEvents = XLSX.utils.json_to_sheet(eventRows);
    XLSX.utils.book_append_sheet(wb, wsEvents, "NAAC_Accreditation_Summary");

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="NAAC_Accreditation_Report_${dept}.xlsx"`);
    res.send(buf);
  } catch (e) {
    console.error('Error exporting HOD Excel:', e);
    res.status(500).json({ message: "Export failed: " + e.message });
  }
});

module.exports = router;
