const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const DepartmentHead = require("../models/DepartmentHead");
const Faculty = require("../models/Faculty");
const Student = require("../models/Student");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const OtherCertUpload = require("../models/OtherCertUpload");
const OtherCertificate = require("../models/OtherCertificate");

// ── DEPARTMENT HEAD LOGIN ──────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const departmentHead = await DepartmentHead.findOne({ username });
  if (!departmentHead) return res.status(401).json({ message: "Invalid Department Head credentials ❌" });

  const authResult = await departmentHead.comparePassword(password);
  if (!authResult.isValid) return res.status(401).json({ message: "Invalid Department Head credentials ❌" });

  if (departmentHead.isLoggedIn) {
    return res.status(400).json({
      isAlreadyLoggedIn: true,
      message: "⚠️ Account is already logged in on another device or tab. Please log out from the last page first before logging in!"
    });
  }

  const newSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  departmentHead.isLoggedIn = true;
  departmentHead.sessionId = newSessionId;
  if (authResult.isLegacyPlaintext) departmentHead.password = password; // pre-save hook will hash it
  await departmentHead.save();

  res.json({ message: "Department Head login successful ✅", departmentHead, sessionId: newSessionId });
});

// Department Head Logout
router.post("/logout", async (req, res) => {
  try {
    const { username, id } = req.body;
    const query = [];
    if (username) query.push({ username });
    if (id && mongoose.Types.ObjectId.isValid(id)) query.push({ _id: id });

    if (query.length > 0) {
      await DepartmentHead.updateMany({ $or: query }, { $set: { isLoggedIn: false, sessionId: null } });
    }
    res.json({ message: "Logged out successfully ✅" });
  } catch (err) {
    console.error("DH logout error:", err);
    res.status(500).json({ message: "Logout error" });
  }
});

// Force Logout
router.post("/force-logout", async (req, res) => {
  try {
    const { username, password } = req.body;
    const dh = await DepartmentHead.findOne({ username });
    if (!dh) return res.status(401).json({ message: "Invalid credentials ❌" });
    const authResult = await dh.comparePassword(password);
    if (!authResult.isValid) return res.status(401).json({ message: "Invalid credentials ❌" });
    dh.isLoggedIn = false;
    dh.sessionId = null;
    if (authResult.isLegacyPlaintext) dh.password = password;
    await dh.save();
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

    const dh = await DepartmentHead.findOne({ $or: query });
    if (!dh || !dh.isLoggedIn || dh.sessionId !== sessionId) {
      return res.json({ valid: false, message: "Session expired or logged in on another device." });
    }
    res.json({ valid: true });
  } catch (e) {
    res.json({ valid: true });
  }
});

function buildYearQuery(yearGroup) {
  if (!yearGroup || yearGroup === '2-3-4' || yearGroup === 'all' || yearGroup === '2,3,4' || yearGroup === 'ALL' || yearGroup === '1-2-3-4' || yearGroup === '1,2,3,4') {
    return { $in: ['1', '2', '3', '4', '1st', '2nd', '3rd', '4th', '1st Year', '2nd Year', '3rd Year', '4th Year', '1st year', '2nd year', '3rd year', '4th year', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'year 1', 'year 2', 'year 3', 'year 4', 1, 2, 3, 4] };
  }
  const clean = String(yearGroup).replace(/[^0-9]/g, '');
  if (clean === '1') return { $in: ['1', '1st', '1st Year', '1st year', 'Year 1', 'year 1', 1] };
  if (clean === '2') return { $in: ['2', '2nd', '2nd Year', '2nd year', 'Year 2', 'year 2', 2] };
  if (clean === '3') return { $in: ['3', '3rd', '3rd Year', '3rd year', 'Year 3', 'year 3', 3] };
  if (clean === '4') return { $in: ['4', '4th', '4th Year', '4th year', 'Year 4', 'year 4', 4] };
  return yearGroup;
}

// ── DEPARTMENT HEAD DASHBOARD STATS ────────────────────────────────
router.get("/stats/:departmentHeadId", async (req, res) => {
  try {
    const departmentHead = await DepartmentHead.findById(req.params.departmentHeadId);
    if (!departmentHead) return res.status(404).json({ message: "Department Head not found" });

    const dept = (departmentHead.department || '').trim();
    const yearGroup = departmentHead.year;
    const yearQuery = buildYearQuery(yearGroup);

    // Total faculty in department
    const totalFaculty = await Faculty.countDocuments({ department: new RegExp('^' + dept + '$', 'i') });

    // Total students in department/year group
    const totalStudents = await Student.countDocuments({ 
      branch: new RegExp('^' + dept + '$', 'i'), 
      year: yearQuery
    });

    // Total events by faculty in department
    const deptFaculty = await Faculty.find({ department: new RegExp('^' + dept + '$', 'i') });
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
      year: yearGroup,
      years: yearGroup === '2-3-4' ? ['2','3','4'] : [yearGroup]
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

    const dept = (dh.department || '').trim();
    const yearQuery = buildYearQuery(dh.year);

    const students = await Student.find({ 
      branch: new RegExp('^' + dept + '$', 'i'), 
      year: yearQuery 
    })
      .select("-password")
      .sort({ pinNumber: 1, studentId: 1, username: 1, fullName: 1 });

    // Aggregate event scores by PIN and semester so each student has exact per-semester event scores
    const Registration = require('../models/Registration');
    const regScores = await Registration.aggregate([
      {
        $match: {
          $or: [{ attended: true }, { score: { $gt: 0 } }]
        }
      },
      {
        $group: {
          _id: { pin: { $toUpper: { $trim: { input: "$pinNumber" } } }, semester: "$semester" },
          totalScore: { $sum: "$score" }
        }
      }
    ]);

    const regMap = new Map();
    const studentTotalEventMap = new Map();
    regScores.forEach(r => {
      if (r._id && r._id.pin) {
        const pinKey = String(r._id.pin).trim().toUpperCase();
        const sem = Number(r._id.semester) || 1;
        regMap.set(pinKey + '_' + sem, r.totalScore || 0);
        studentTotalEventMap.set(pinKey, (studentTotalEventMap.get(pinKey) || 0) + (r.totalScore || 0));
      }
    });

    const enrichedStudents = students.map(st => {
      const sObj = st.toObject();
      const p1 = String(st.pinNumber || '').trim().toUpperCase();
      const p2 = String(st.studentId || '').trim().toUpperCase();
      const p3 = String(st.username || '').trim().toUpperCase();

      for (let sem = 1; sem <= 8; sem++) {
        const evScore = regMap.get(p1 + '_' + sem) || regMap.get(p2 + '_' + sem) || regMap.get(p3 + '_' + sem) || 0;
        const baseScore = Number(sObj['sem' + sem + 'Score']) || 0;
        sObj['sem' + sem + 'EventScore'] = evScore;
        sObj['sem' + sem + 'TotalScore'] = baseScore + evScore;
      }
      const calcEventScore = studentTotalEventMap.get(p1) || studentTotalEventMap.get(p2) || studentTotalEventMap.get(p3) || 0;
      if (calcEventScore > 0 || !sObj.eventScore) {
        sObj.eventScore = calcEventScore;
      }
      return sObj;
    });

    res.json(enrichedStudents);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── UPDATE STUDENT SCORE ──────────────────────────────────────────
router.put("/student-score/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { score } = req.body;

    const trimmed = decodeURIComponent(studentId).trim();
    let student = null;

    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      student = await Student.findById(trimmed);
    }
    if (!student) {
      const pinRegex = new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
      student = await Student.findOne({
        $or: [
          { pinNumber: pinRegex },
          { studentId: pinRegex },
          { username: pinRegex }
        ]
      });
    }

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    let hasAnySemScore = false;
    for (let s = 1; s <= 8; s++) {
      const k = `sem${s}Score`;
      if (req.body[k] !== undefined && req.body[k] !== null && !isNaN(req.body[k])) {
        student[k] = Number(req.body[k]);
        hasAnySemScore = true;
      }
    }

    if (hasAnySemScore) {
      student.score = [1, 2, 3, 4, 5, 6, 7, 8].reduce((acc, s) => acc + (Number(student[`sem${s}Score`]) || 0), 0);
    } else if (score !== undefined && score !== null && !isNaN(score)) {
      student.score = Number(score);
    }

    await student.save();

    res.json({
      message: "Student score updated successfully ✅",
      student: {
        _id: student._id,
        fullName: student.fullName || student.username,
        pinNumber: student.pinNumber || student.studentId,
        score: student.score,
        sem1Score: student.sem1Score,
        sem2Score: student.sem2Score,
        sem3Score: student.sem3Score,
        sem4Score: student.sem4Score,
        sem5Score: student.sem5Score,
        sem6Score: student.sem6Score,
        sem7Score: student.sem7Score,
        sem8Score: student.sem8Score,
        eventScore: student.eventScore,
        totalScore: (student.score || 0) + (student.eventScore || 0)
      }
    });
  } catch (err) {
    console.error("Error updating student score:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/student-score-proof/:pinOrId", async (req, res) => {
  try {
    const { pinOrId } = req.params;
    if (!pinOrId) return res.status(400).json({ message: "Student PIN or ID is required" });

    const trimmed = decodeURIComponent(pinOrId).trim();
    let student = null;

    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      student = await Student.findById(trimmed).select("-password");
    }
    if (!student) {
      const pinRegex = new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      student = await Student.findOne({
        $or: [
          { pinNumber: pinRegex },
          { studentId: pinRegex },
          { username: pinRegex }
        ]
      }).select("-password");
    }

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const pin = student.pinNumber || student.studentId || student.username;
    const pinRegex = new RegExp(`^${pin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

    const Registration = require("../models/Registration");
    const OtherCertUpload = require("../models/OtherCertUpload");

    const pinConditions = [
      { pinNumber: pinRegex },
      { pinNumber: student.pinNumber },
      { pinNumber: student.studentId },
      { studentId: pinRegex }
    ].filter(Boolean);

    // 1. Attended / scored college event registrations
    const registrations = await Registration.find({
      $and: [
        { $or: pinConditions },
        { $or: [{ attended: true }, { score: { $gt: 0 } }] }
      ]
    })
      .populate("eventId")
      .sort({ _id: -1 });

    // 2. External / other certificates uploaded
    const otherUploads = await OtherCertUpload.find({
      $or: [
        { studentPin: pinRegex },
        { studentPin: student.pinNumber },
        { studentPin: student.studentId }
      ].filter(Boolean)
    })
      .populate("certificateId")
      .sort({ uploadedAt: -1 });

    // Calculate score details for all 8 semesters
    const sem1Score = Number(student.sem1Score) || 0;
    const sem2Score = Number(student.sem2Score) || 0;
    const sem3Score = Number(student.sem3Score) || 0;
    const sem4Score = Number(student.sem4Score) || 0;
    const sem5Score = Number(student.sem5Score) || 0;
    const sem6Score = Number(student.sem6Score) || 0;
    const sem7Score = Number(student.sem7Score) || 0;
    const sem8Score = Number(student.sem8Score) || 0;
    const baseScore = Number(student.score) || 0;
    const semSum = sem1Score + sem2Score + sem3Score + sem4Score + sem5Score + sem6Score + sem7Score + sem8Score;
    const baseAcademicScore = semSum > 0 ? semSum : baseScore;

    const totalEventScore = registrations.reduce((sum, r) => sum + (Number(r.score) || 0), 0);

    // Calculate per-semester event scores
    const semEventScores = {};
    for (let s = 1; s <= 8; s++) {
      semEventScores[s] = registrations
        .filter(r => (Number(r.semester) || 1) === s)
        .reduce((sum, r) => sum + (Number(r.score) || 0), 0);
    }

    const approvedOtherCerts = otherUploads.filter(u => u.status === 'approved');
    const totalOtherCertsScore = approvedOtherCerts.reduce((sum, u) => sum + (Number(u.marksAwarded) || 0), 0);

    const grandTotalScore = (student.score || 0) + (student.eventScore || 0);

    const eventList = registrations.map(r => {
      const ev = r.eventId || {};
      return {
        registrationId: r._id,
        eventId: ev._id || null,
        title: ev.title || 'Event Record',
        category: ev.category || 'General',
        date: ev.date || null,
        time: ev.time || null,
        venue: ev.venue || 'Campus',
        semester: Number(r.semester) || 1,
        score: Number(r.score) || 0,
        attended: r.attended,
        certificateUrl: r.certificateUrl || null,
        hasCertificate: !!(r.certificateUrl || r.hasCertificate)
      };
    });

    const certList = otherUploads.map(u => {
      const oc = u.certificateId || {};
      return {
        uploadId: u._id,
        certificateName: u.certificateName || oc.certificateName || 'External Certificate',
        status: u.status || 'pending',
        marksAwarded: Number(u.marksAwarded) || 0,
        fileUrl: u.fileUrl || null,
        fileName: u.fileName || '',
        hasBackup: !!u.fileBackupId,
        uploadedAt: u.uploadedAt,
        reviewedAt: u.reviewedAt
      };
    });

    res.json({
      student: {
        _id: student._id,
        fullName: student.fullName || student.username,
        pinNumber: student.pinNumber || student.studentId,
        studentId: student.studentId,
        branch: student.branch,
        year: student.year,
        profileImage: student.profileImage,
        score: student.score || 0,
        sem1Score,
        sem2Score,
        sem3Score,
        sem4Score,
        sem5Score,
        sem6Score,
        sem7Score,
        sem8Score,
        semEventScores,
        sem1EventScore: semEventScores[1] || 0,
        sem2EventScore: semEventScores[2] || 0,
        sem3EventScore: semEventScores[3] || 0,
        sem4EventScore: semEventScores[4] || 0,
        sem5EventScore: semEventScores[5] || 0,
        sem6EventScore: semEventScores[6] || 0,
        sem7EventScore: semEventScores[7] || 0,
        sem8EventScore: semEventScores[8] || 0,
        sem1TotalScore: sem1Score + (semEventScores[1] || 0),
        sem2TotalScore: sem2Score + (semEventScores[2] || 0),
        sem3TotalScore: sem3Score + (semEventScores[3] || 0),
        sem4TotalScore: sem4Score + (semEventScores[4] || 0),
        sem5TotalScore: sem5Score + (semEventScores[5] || 0),
        sem6TotalScore: sem6Score + (semEventScores[6] || 0),
        sem7TotalScore: sem7Score + (semEventScores[7] || 0),
        sem8TotalScore: sem8Score + (semEventScores[8] || 0),
        baseAcademicScore,
        eventScore: student.eventScore || totalEventScore || 0,
        grandTotalScore
      },
      summary: {
        baseScore,
        sem1Score,
        sem2Score,
        sem3Score,
        sem4Score,
        sem5Score,
        sem6Score,
        sem7Score,
        sem8Score,
        semEventScores,
        sem1EventScore: semEventScores[1] || 0,
        sem2EventScore: semEventScores[2] || 0,
        sem3EventScore: semEventScores[3] || 0,
        sem4EventScore: semEventScores[4] || 0,
        sem5EventScore: semEventScores[5] || 0,
        sem6EventScore: semEventScores[6] || 0,
        sem7EventScore: semEventScores[7] || 0,
        sem8EventScore: semEventScores[8] || 0,
        sem1TotalScore: sem1Score + (semEventScores[1] || 0),
        sem2TotalScore: sem2Score + (semEventScores[2] || 0),
        sem3TotalScore: sem3Score + (semEventScores[3] || 0),
        sem4TotalScore: sem4Score + (semEventScores[4] || 0),
        sem5TotalScore: sem5Score + (semEventScores[5] || 0),
        sem6TotalScore: sem6Score + (semEventScores[6] || 0),
        sem7TotalScore: sem7Score + (semEventScores[7] || 0),
        sem8TotalScore: sem8Score + (semEventScores[8] || 0),
        baseAcademicScore,
        totalEventScore,
        totalOtherCertsScore,
        grandTotalScore
      },
      events: eventList,
      otherCertificates: certList
    });
  } catch (err) {
    console.error("Student score proof error:", err);
    res.status(500).json({ message: "Error fetching student score proof: " + err.message });
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

// ── NAAC / NBA ACCREDITATION REPORT DATA ────────────────────────────────
router.get("/naac-report/:departmentHeadId", async (req, res) => {
  try {
    const dh = await DepartmentHead.findById(req.params.departmentHeadId);
    if (!dh) return res.status(404).json({ message: "Department Head not found" });

    const dept = dh.department;
    const yearGroup = dh.year;

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
    console.error('Error generating NAAC report:', e);
    res.status(500).json({ message: "Server error: " + e.message });
  }
});

// ── EXPORT EXCEL NAAC / NBA REPORT ─────────────────────────────────────
router.get("/export-excel/:departmentHeadId", async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const dh = await DepartmentHead.findById(req.params.departmentHeadId);
    if (!dh) return res.status(404).json({ message: "Not found" });

    const dept = dh.department;
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
    XLSX.utils.book_append_sheet(wb, wsEvents, "NAAC_Event_Summary");

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="NAAC_Accreditation_Report_${dept}.xlsx"`);
    res.send(buf);
  } catch (e) {
    console.error('Error exporting Excel:', e);
    res.status(500).json({ message: "Export failed: " + e.message });
  }
});

// Bulk lookup for all active semester settings across all branches and years
router.get("/all-active-semesters", async (_req, res) => {
  try {
    const SemesterSetting = require("../models/SemesterSetting");
    const list = await SemesterSetting.find().lean();
    const normalized = (list || []).map(item => {
      const match = String(item.year || '1').match(/\d+/);
      const yNum = match ? match[0] : '1';
      return {
        ...item,
        year: yNum,
        rawYear: item.year
      };
    });
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
