const express = require("express");
const router  = express.Router();
const mongoose = require("mongoose");
const Admin    = require("../models/Admin");
const Faculty  = require("../models/Faculty");
const Student  = require("../models/Student");
const Event    = require("../models/Event");
const Registration = require("../models/Registration");
const Hod      = require("../models/DepartmentHead");  // reuse existing DepartmentHead model
const Dean     = require("../models/Dean");
const Branch   = require("../models/Branch");
const Notification = require("../models/Notification");
const Feedback     = require("../models/Feedback");
const { resyncStudentScores } = require("../utils/scoreSync");
const { hashPasswordSync, isHashed } = require("../utils/passwordUtils");
// ── LOGIN ──────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username });
  if (!admin) return res.status(401).json({ message: "Invalid admin credentials ❌" });

  const authResult = await admin.comparePassword(password);
  if (!authResult.isValid) return res.status(401).json({ message: "Invalid admin credentials ❌" });

  if (admin.isLoggedIn) {
    return res.status(400).json({
      isAlreadyLoggedIn: true,
      message: "⚠️ Account is already logged in on another device or tab. Please log out from the last page first before logging in!"
    });
  }

  const newSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  admin.isLoggedIn = true;
  admin.sessionId = newSessionId;
  if (authResult.isLegacyPlaintext) admin.password = password; // pre-save hook will hash it
  await admin.save();

  res.json({ message: "Admin login successful ✅", admin, sessionId: newSessionId });
});

// Admin Logout
router.post("/logout", async (req, res) => {
  try {
    const { username, id } = req.body;
    const query = [];
    if (username) query.push({ username });
    if (id && mongoose.Types.ObjectId.isValid(id)) query.push({ _id: id });

    if (query.length > 0) {
      await Admin.updateMany({ $or: query }, { $set: { isLoggedIn: false, sessionId: null } });
      await Dean.updateMany({ $or: query }, { $set: { isLoggedIn: false, sessionId: null } });
    }
    res.json({ message: "Logged out successfully ✅" });
  } catch (err) {
    console.error("Admin/Dean logout error:", err);
    res.status(500).json({ message: "Logout error" });
  }
});

// Force Logout
router.post("/force-logout", async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ message: "Invalid credentials ❌" });
    const authResult = await admin.comparePassword(password);
    if (!authResult.isValid) return res.status(401).json({ message: "Invalid credentials ❌" });
    admin.isLoggedIn = false;
    admin.sessionId = null;
    if (authResult.isLegacyPlaintext) admin.password = password;
    await admin.save();
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

    let account = await Admin.findOne({ $or: query });
    if (!account) {
      account = await Dean.findOne({ $or: query });
    }

    if (!account) {
      return res.json({ valid: true });
    }

    if (account.isLoggedIn && account.sessionId && sessionId && account.sessionId !== sessionId) {
      return res.json({ valid: false, message: "Session expired or logged in on another device." });
    }
    res.json({ valid: true });
  } catch (e) {
    res.json({ valid: true });
  }
});

// ── ADMIN CHANGE PASSWORD ──────────────────────────────
router.put("/change-password/:adminId", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required ❌" });
    }
    const admin = await Admin.findById(req.params.adminId);
    if (!admin) return res.status(404).json({ message: "Admin account not found ❌" });

    const authResult = await admin.comparePassword(currentPassword);
    if (!authResult.isValid) return res.status(400).json({ message: "Current password is incorrect ❌" });

    if (newPassword.length < 6) return res.status(400).json({ message: "New password must be at least 6 characters long ❌" });

    admin.password = newPassword;
    await admin.save();
    res.json({ message: "Admin password changed successfully! ✅" });
  } catch (e) {
    console.error("Admin change password error:", e);
    res.status(500).json({ message: "Server error: " + e.message });
  }
});

// ── ADMIN PROFILE GET ──────────────────────────────────
router.get("/profile/:adminId", async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.adminId).select("-password");
    if (!admin) return res.status(404).json({ message: "Admin not found ❌" });
    res.json(admin);
  } catch (e) {
    res.status(500).json({ message: "Server error: " + e.message });
  }
});

// ── ADMIN PROFILE UPDATE (Username, Full Name, Email) ──
router.put("/profile/:adminId", async (req, res) => {
  try {
    const { username, fullName, email } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ message: "Username cannot be empty ❌" });
    }

    const trimmedUsername = username.trim();

    const existing = await Admin.findOne({
      username: trimmedUsername,
      _id: { $ne: req.params.adminId }
    });
    if (existing) {
      return res.status(400).json({ message: "Username is already in use by another admin ❌" });
    }

    const admin = await Admin.findById(req.params.adminId);
    if (!admin) return res.status(404).json({ message: "Admin account not found ❌" });

    admin.username = trimmedUsername;
    if (fullName !== undefined) admin.fullName = fullName.trim();
    if (email !== undefined) admin.email = email.trim();

    await admin.save();

    const safeAdmin = admin.toObject();
    delete safeAdmin.password;

    res.json({ message: "Admin username and profile updated successfully! ✅", admin: safeAdmin });
  } catch (e) {
    console.error("Admin profile update error:", e);
    res.status(500).json({ message: "Server error: " + e.message });
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
  const list = await Student.find()
    .select("-password")
    .sort({ studentId: 1, pinNumber: 1, username: 1, fullName: 1 });
  res.json(list);
});

router.post("/students/bulk-import", async (req, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || !students.length) {
      return res.status(400).json({ message: "No student records provided" });
    }

    const operations = [];
    for (const item of students) {
      const studentId = (item.studentId || item.pinNumber || item.username || '').trim().toUpperCase();
      if (!studentId) continue;

      const sem1Val = !isNaN(Number(item.sem1Score)) ? Number(item.sem1Score) : 0;
      const sem2Val = !isNaN(Number(item.sem2Score)) ? Number(item.sem2Score) : 0;
      const sem3Val = !isNaN(Number(item.sem3Score)) ? Number(item.sem3Score) : 0;
      const sem4Val = !isNaN(Number(item.sem4Score)) ? Number(item.sem4Score) : 0;

      const rawScore = item.score;
      const parsedScore = Number(rawScore);
      let scoreVal = 0;
      if (rawScore !== undefined && rawScore !== null && String(rawScore).trim() !== '' && !isNaN(parsedScore)) {
        scoreVal = parsedScore;
      } else {
        scoreVal = sem1Val + sem2Val + sem3Val + sem4Val;
      }

      const pass = item.password || studentId || 'student123';
      const hashedPass = isHashed(pass) ? pass : hashPasswordSync(pass);

      const updateObj = {
        studentId,
        username: item.username || studentId,
        pinNumber: item.pinNumber || studentId,
        fullName: item.fullName || item.name || studentId,
        branch: (item.branch || 'CSE').trim().toUpperCase(),
        year: item.year || '1',
        section: item.section || '1',
        score: scoreVal,
        sem1Score: sem1Val,
        sem2Score: sem2Val,
        sem3Score: sem3Val,
        sem4Score: sem4Val,
        password: hashedPass
      };

      const setOnInsert = {};
      if (item.email) updateObj.email = item.email;
      else setOnInsert.email = '';

      if (item.phone) updateObj.phone = item.phone;
      else setOnInsert.phone = '';

      operations.push({
        updateOne: {
          filter: { studentId },
          update: {
            $set: updateObj,
            $setOnInsert: setOnInsert
          },
          upsert: true
        }
      });
    }

    if (operations.length === 0) {
      return res.status(400).json({ message: "No valid student operations created" });
    }

    const result = await Student.bulkWrite(operations, { ordered: false });

    const inserted = result.upsertedCount || 0;
    const updated = result.modifiedCount || 0;

    res.json({
      message: `Excel import complete! ${inserted} new students added, ${updated} existing updated ✅`,
      inserted,
      updated
    });
  } catch (e) {
    console.error('Bulk import error:', e);
    res.status(500).json({ message: "Error importing student data: " + e.message });
  }
});

// ── BULK IMPORT MARKS ONLY ──────────────────────────────
router.post("/students/import-marks", async (req, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || !students.length) {
      return res.status(400).json({ message: "No student mark records provided" });
    }

    const operations = [];
    let processed = 0;

    for (const item of students) {
      const idKey = (item.studentId || item.pinNumber || item.username || '').trim().toUpperCase();
      if (!idKey) continue;

      const setObj = {};
      if (item.sem1Score !== undefined && item.sem1Score !== null && item.sem1Score !== '') {
        const val = Number(item.sem1Score);
        if (!isNaN(val)) setObj.sem1Score = val;
      }
      if (item.sem2Score !== undefined && item.sem2Score !== null && item.sem2Score !== '') {
        const val = Number(item.sem2Score);
        if (!isNaN(val)) setObj.sem2Score = val;
      }
      if (item.sem3Score !== undefined && item.sem3Score !== null && item.sem3Score !== '') {
        const val = Number(item.sem3Score);
        if (!isNaN(val)) setObj.sem3Score = val;
      }
      if (item.sem4Score !== undefined && item.sem4Score !== null && item.sem4Score !== '') {
        const val = Number(item.sem4Score);
        if (!isNaN(val)) setObj.sem4Score = val;
      }

      if (item.score !== undefined && item.score !== null && item.score !== '') {
        const val = Number(item.score);
        if (!isNaN(val)) setObj.score = val;
      } else if (setObj.sem1Score !== undefined || setObj.sem2Score !== undefined || setObj.sem3Score !== undefined || setObj.sem4Score !== undefined) {
        setObj.score = (setObj.sem1Score || 0) + (setObj.sem2Score || 0) + (setObj.sem3Score || 0) + (setObj.sem4Score || 0);
      }

      if (Object.keys(setObj).length === 0) continue;

      operations.push({
        updateOne: {
          filter: {
            $or: [
              { studentId: idKey },
              { pinNumber: idKey },
              { username: idKey }
            ]
          },
          update: { $set: setObj }
        }
      });
      processed++;
    }

    if (operations.length === 0) {
      return res.status(400).json({ message: "No valid marks data found to update" });
    }

    const result = await Student.bulkWrite(operations, { ordered: false });
    const updatedCount = result.matchedCount || result.modifiedCount || 0;

    res.json({
      message: `Marks import complete! Updated marks for ${updatedCount} student(s) out of ${processed} rows processed ✅`,
      updated: updatedCount,
      processed
    });
  } catch (e) {
    console.error('Marks import error:', e);
    res.status(500).json({ message: "Error importing student marks: " + e.message });
  }
});

// Helper to build query filter for branch & year
function buildPromotionQuery(branch, currentYear) {
  const query = {};
  if (branch && branch.toUpperCase() !== 'ALL') {
    query.branch = new RegExp(`^${branch.trim()}$`, 'i');
  }
  if (currentYear && currentYear.toUpperCase() !== 'ALL') {
    const yrStr = String(currentYear).trim().replace(/[^0-9]/g, '');
    if (yrStr) {
      query.year = { $in: [yrStr, `${yrStr}st Year`, `${yrStr}nd Year`, `${yrStr}rd Year`, `${yrStr}th Year`, `${yrStr}st`, `${yrStr}nd`, `${yrStr}rd`, `${yrStr}th`] };
    } else {
      query.year = currentYear;
    }
  }
  return query;
}

// ── GET COUNT FOR PROMOTION PREVIEW ─────────────────────
router.post("/students/promote-count", async (req, res) => {
  try {
    const { branch = 'ALL', currentYear = 'ALL' } = req.body;
    const query = buildPromotionQuery(branch, currentYear);
    const count = await Student.countDocuments(query);
    res.json({ count });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── BULK ACADEMIC YEAR PROMOTION ──────────────────────────
router.post("/students/promote-years", async (req, res) => {
  try {
    const { branch = 'ALL', currentYear = 'ALL', targetYear = 'NEXT' } = req.body;
    const baseBranchQuery = (branch && branch.toUpperCase() !== 'ALL') ? { branch: new RegExp(`^${branch.trim()}$`, 'i') } : {};

    if (targetYear === 'NEXT') {
      // Automatic +1 Promotion: 4 -> Graduated, 3 -> 4, 2 -> 3, 1 -> 2
      let q4 = { ...baseBranchQuery, year: { $in: ['4', '4th Year', '4th', '4th year'] } };
      let q3 = { ...baseBranchQuery, year: { $in: ['3', '3rd Year', '3rd', '3rd year'] } };
      let q2 = { ...baseBranchQuery, year: { $in: ['2', '2nd Year', '2nd', '2nd year'] } };
      let q1 = { ...baseBranchQuery, year: { $in: ['1', '1st Year', '1st', '1st year'] } };

      if (currentYear && currentYear.toUpperCase() !== 'ALL') {
        const yNum = String(currentYear).replace(/[^0-9]/g, '');
        if (yNum === '1') { q2 = { _id: null }; q3 = { _id: null }; q4 = { _id: null }; }
        else if (yNum === '2') { q1 = { _id: null }; q3 = { _id: null }; q4 = { _id: null }; }
        else if (yNum === '3') { q1 = { _id: null }; q2 = { _id: null }; q4 = { _id: null }; }
        else if (yNum === '4') { q1 = { _id: null }; q2 = { _id: null }; q3 = { _id: null }; }
      }

      const r4 = await Student.updateMany(q4, { $set: { year: 'Graduated' } });
      const r3 = await Student.updateMany(q3, { $set: { year: '4' } });
      const r2 = await Student.updateMany(q2, { $set: { year: '3' } });
      const r1 = await Student.updateMany(q1, { $set: { year: '2' } });

      const total = (r1.modifiedCount || 0) + (r2.modifiedCount || 0) + (r3.modifiedCount || 0) + (r4.modifiedCount || 0);

      return res.json({
        message: `Academic Year Promotion Complete! ${total} student(s) updated. ✅`,
        promoted: {
          year1to2: r1.modifiedCount || 0,
          year2to3: r2.modifiedCount || 0,
          year3to4: r3.modifiedCount || 0,
          year4toGraduated: r4.modifiedCount || 0
        }
      });
    } else if (targetYear === 'PREVIOUS') {
      // Automatic -1 Demotion / Reverse: 2 -> 1, 3 -> 2, 4 -> 3, Graduated -> 4
      let q2 = { ...baseBranchQuery, year: { $in: ['2', '2nd Year', '2nd', '2nd year'] } };
      let q3 = { ...baseBranchQuery, year: { $in: ['3', '3rd Year', '3rd', '3rd year'] } };
      let q4 = { ...baseBranchQuery, year: { $in: ['4', '4th Year', '4th', '4th year'] } };
      let qGrad = { ...baseBranchQuery, year: { $in: ['Graduated', 'graduated', 'Alum'] } };

      if (currentYear && currentYear.toUpperCase() !== 'ALL') {
        const yNum = String(currentYear).replace(/[^0-9]/g, '');
        if (yNum === '2') { q3 = { _id: null }; q4 = { _id: null }; qGrad = { _id: null }; }
        else if (yNum === '3') { q2 = { _id: null }; q4 = { _id: null }; qGrad = { _id: null }; }
        else if (yNum === '4') { q2 = { _id: null }; q3 = { _id: null }; qGrad = { _id: null }; }
        else if (currentYear.toLowerCase().includes('grad')) { q2 = { _id: null }; q3 = { _id: null }; q4 = { _id: null }; }
      }

      const r2 = await Student.updateMany(q2, { $set: { year: '1' } });
      const r3 = await Student.updateMany(q3, { $set: { year: '2' } });
      const r4 = await Student.updateMany(q4, { $set: { year: '3' } });
      const rGrad = await Student.updateMany(qGrad, { $set: { year: '4' } });

      const total = (r2.modifiedCount || 0) + (r3.modifiedCount || 0) + (r4.modifiedCount || 0) + (rGrad.modifiedCount || 0);

      return res.json({
        message: `Academic Year Reversal Complete! ${total} student(s) reversed. ⏪`,
        promoted: {
          year2to1: r2.modifiedCount || 0,
          year3to2: r3.modifiedCount || 0,
          year4to3: r4.modifiedCount || 0,
          graduatedTo4: rGrad.modifiedCount || 0
        }
      });
    } else {
      // Set to specific target year (e.g. '1', '2', '3', '4', 'Graduated')
      const targetQuery = buildPromotionQuery(branch, currentYear);
      const result = await Student.updateMany(targetQuery, { $set: { year: targetYear } });
      const count = result.modifiedCount || result.matchedCount || 0;

      return res.json({
        message: `Successfully set academic year to "${targetYear}" for ${count} student(s). ✅`,
        promoted: { specificTarget: count }
      });
    }
  } catch (e) {
    console.error('Academic year promotion error:', e);
    res.status(500).json({ message: "Error promoting academic years: " + e.message });
  }
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
    const eventId = req.params.id;
    const affectedRegs = await Registration.find({ eventId }, 'pinNumber');
    const affectedPins = Array.from(new Set(affectedRegs.map(r => r.pinNumber).filter(Boolean)));

    await Event.findByIdAndDelete(eventId);
    await Registration.deleteMany({ eventId });
    await Notification.deleteMany({ eventId });
    await Feedback.deleteMany({ eventId });

    await resyncStudentScores(affectedPins);

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
    const dean = await Dean.findOne({ username });
    if (!dean) return res.status(401).json({ message: "Invalid Dean credentials ❌" });
    const authResult = await dean.comparePassword(password);
    if (!authResult.isValid) return res.status(401).json({ message: "Invalid Dean credentials ❌" });
    if (authResult.isLegacyPlaintext) {
      dean.password = password;
      await dean.save();
    }
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

function parseBranchArray(branches, singleBranch) {
  let list = [];
  if (Array.isArray(branches) && branches.length) {
    list = branches.map(b => String(b).trim().toUpperCase()).filter(Boolean);
  } else if (typeof branches === 'string' && branches.trim()) {
    list = branches.split(',').map(b => b.trim().toUpperCase()).filter(Boolean);
  } else if (singleBranch) {
    list = [String(singleBranch).trim().toUpperCase()];
  }
  return list;
}

router.post("/coordinators", async (req, res) => {
  try {
    const { facultyId, branch, branches, years } = req.body;
    if (!facultyId) {
      return res.status(400).json({ message: "Please select a Faculty member" });
    }

    const assignedBranches = parseBranchArray(branches, branch);
    if (!assignedBranches.length) {
      return res.status(400).json({ message: "Please select at least one assigned branch" });
    }

    const assignedYears = Array.isArray(years) && years.length ? years.map(String) : ['1', '2', '3', '4'];
    const branchString = assignedBranches.join(', ');

    const updated = await Faculty.findByIdAndUpdate(
      facultyId,
      {
        isCoordinator: true,
        coordinatorBranch: branchString,
        coordinatorBranches: assignedBranches,
        coordinatorYears: assignedYears
      },
      { new: true }
    ).select("-password");

    if (!updated) return res.status(404).json({ message: "Faculty member not found" });

    res.json({ message: `Assigned as Coordinator for ${branchString} ✅`, coordinator: updated });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

router.put("/coordinators/:id", async (req, res) => {
  try {
    const { facultyId, branch, branches, years } = req.body;
    const targetId = facultyId || req.params.id;
    const assignedBranches = parseBranchArray(branches, branch);
    const assignedYears = Array.isArray(years) && years.length ? years.map(String) : ['1', '2', '3', '4'];

    if (!assignedBranches.length) {
      return res.status(400).json({ message: "Please select at least one assigned branch" });
    }

    const branchString = assignedBranches.join(', ');

    const updated = await Faculty.findByIdAndUpdate(
      targetId,
      {
        isCoordinator: true,
        coordinatorBranch: branchString,
        coordinatorBranches: assignedBranches,
        coordinatorYears: assignedYears
      },
      { new: true }
    ).select("-password");

    if (!updated) return res.status(404).json({ message: "Coordinator not found" });

    res.json({ message: `Coordinator details updated for ${branchString} ✅`, coordinator: updated });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

router.delete("/coordinators/:id", async (req, res) => {
  try {
    await Faculty.findByIdAndUpdate(req.params.id, {
      isCoordinator: false,
      coordinatorBranch: '',
      coordinatorBranches: [],
      coordinatorYears: []
    });
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
    const authResult = await dean.comparePassword(currentPassword);
    if (!authResult.isValid) return res.status(400).json({ message: "Current password is incorrect" });
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

// ── SYSTEM SETTINGS & CERTIFICATE RETENTION ──────────────
const SystemSetting = require('../models/SystemSetting');
const { cleanupExpiredCertificates, cleanupExpiredOtherCertificates } = require('../utils/certificateCleanup');

router.get("/settings", async (req, res) => {
  try {
    let retentionSetting = await SystemSetting.findOne({ key: 'certificateRetentionDays' });
    if (!retentionSetting) {
      retentionSetting = await SystemSetting.create({
        key: 'certificateRetentionDays',
        value: 30,
        description: 'Days before generated event certificate PDF files are deleted from storage (lazy auto-regenerates on student view)'
      });
    }

    let otherCertSetting = await SystemSetting.findOne({ key: 'otherCertRetentionDays' });
    if (!otherCertSetting) {
      otherCertSetting = await SystemSetting.create({
        key: 'otherCertRetentionDays',
        value: 30,
        description: 'Days after faculty approval before uploaded Other Certificate files are deleted from storage (restores on demand from backup)'
      });
    }

    res.json({
      certificateRetentionDays: Number(retentionSetting.value) || 30,
      otherCertRetentionDays: Number(otherCertSetting.value) || 30
    });
  } catch (e) {
    res.status(500).json({ message: "Error fetching system settings: " + e.message });
  }
});

router.post("/settings", async (req, res) => {
  try {
    const { certificateRetentionDays, otherCertRetentionDays } = req.body;

    let eventDays = Number(certificateRetentionDays);
    if (isNaN(eventDays) || eventDays < 0) {
      return res.status(400).json({ message: "Invalid event certificate retention days value. Must be 0 or a positive number." });
    }

    let otherDays = Number(otherCertRetentionDays);
    if (isNaN(otherDays) || otherDays < 0) {
      return res.status(400).json({ message: "Invalid other certificate retention days value. Must be 0 or a positive number." });
    }

    let setting1 = await SystemSetting.findOneAndUpdate(
      { key: 'certificateRetentionDays' },
      { value: eventDays },
      { new: true, upsert: true }
    );

    let setting2 = await SystemSetting.findOneAndUpdate(
      { key: 'otherCertRetentionDays' },
      { value: otherDays },
      { new: true, upsert: true }
    );

    res.json({
      message: "System settings updated successfully ✅",
      certificateRetentionDays: setting1.value,
      otherCertRetentionDays: setting2.value
    });
  } catch (e) {
    res.status(500).json({ message: "Error updating system settings: " + e.message });
  }
});

router.post("/cleanup-certificates", async (req, res) => {
  try {
    const resEvent = await cleanupExpiredCertificates();
    const resOther = await cleanupExpiredOtherCertificates();

    const totalCleaned = resEvent.cleanedCount + resOther.cleanedCount;
    res.json({
      message: `Certificate cleanup completed ✅ Processed ${totalCleaned} expired file(s) (${resEvent.cleanedCount} Event, ${resOther.cleanedCount} Other).`,
      eventCleanedCount: resEvent.cleanedCount,
      otherCleanedCount: resOther.cleanedCount,
      totalCleaned
    });
  } catch (e) {
    res.status(500).json({ message: "Error running certificate cleanup: " + e.message });
  }
});

module.exports = router;
