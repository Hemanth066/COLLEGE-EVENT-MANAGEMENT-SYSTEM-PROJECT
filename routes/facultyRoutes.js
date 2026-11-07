const express = require("express");
const router = express.Router();
const Faculty = require("../models/Faculty");
const mongoose = require("mongoose");
const Student = require("../models/Student");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const SemesterSetting = require("../models/SemesterSetting");


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

  const faculty = await Faculty.findOne({ username });

  if (!faculty) {
    return res.status(401).json({ message: "Invalid Faculty Credentials ❌" });
  }

  const authResult = await faculty.comparePassword(password);
  if (!authResult.isValid) {
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
  if (authResult.isLegacyPlaintext) faculty.password = password; // pre-save hook will hash it
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
    const faculty = await Faculty.findOne({ username });
    if (!faculty) {
      return res.status(401).json({ message: "Invalid credentials ❌" });
    }
    const authResult = await faculty.comparePassword(password);
    if (!authResult.isValid) {
      return res.status(401).json({ message: "Invalid credentials ❌" });
    }
    faculty.isLoggedIn = false;
    faculty.sessionId = null;
    if (authResult.isLegacyPlaintext) faculty.password = password;
    await faculty.save();
    res.json({ message: "Previous session cleared. You can now log in ✅" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});
// ── COORDINATOR BULK UPLOAD MARKS (WITH ACTIVE SEMESTER ENFORCEMENT) ────
router.post("/coordinator-upload-marks", async (req, res) => {
  try {
    const { facultyId, mode, records } = req.body;
    if (!Array.isArray(records) || !records.length) {
      return res.status(400).json({ message: "No mark records provided in upload" });
    }

    const faculty = await findFacultyByIdentifier(facultyId);
    if (!faculty || !faculty.isCoordinator) {
      return res.status(403).json({ message: "Access denied. Only coordinators can upload branch marks." });
    }

    // Load all active semester settings across branches & years
    const allSettings = await SemesterSetting.find().lean();
    const semSettingMap = {};
    allSettings.forEach(s => {
      const b = String(s.branch || '').trim().toUpperCase();
      const match = String(s.year || '1').match(/\d+/);
      const yNum = match ? match[0] : '1';
      if (b && yNum && Array.isArray(s.activeSemesters)) {
        semSettingMap[b + '_' + yNum] = s.activeSemesters.map(Number);
      }
    });

    let updatedCount = 0;
    let skippedCount = 0;
    const skippedDetails = [];
    const updateMode = (mode === 'set') ? 'set' : 'add'; // default 'add' to current score

    for (const item of records) {
      const idKey = String(item.pinNumber || item.studentId || item.username || '').trim();
      const semNum = Number(item.sem || item.semester);
      const scoreVal = Number(item.score != null ? item.score : item.marks);

      if (!idKey || isNaN(semNum) || semNum < 1 || semNum > 8 || isNaN(scoreVal)) {
        skippedCount++;
        skippedDetails.push({ id: idKey || 'Unknown', sem: semNum, reason: 'Invalid PIN/ID, semester (must be 1-8), or score' });
        continue;
      }

      const safeId = idKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pinRegex = new RegExp('^' + safeId + '$', 'i');
      let student = null;
      if (mongoose.Types.ObjectId.isValid(idKey)) {
        student = await Student.findById(idKey);
      }
      if (!student) {
        student = await Student.findOne({
          $or: [
            { pinNumber: pinRegex },
            { studentId: pinRegex },
            { username: pinRegex }
          ]
        });
      }

      if (!student) {
        skippedCount++;
        skippedDetails.push({ id: idKey, sem: semNum, reason: 'Student not found in database' });
        continue;
      }

      // Check student's active semesters for their branch and academic year
      const sBranch = String(student.branch || '').trim().toUpperCase();
      const sYearNum = (String(student.year || '1').match(/\d+/) || ['1'])[0];
      const semKey = sBranch + '_' + sYearNum;
      const defaultSems = [ (Number(sYearNum) * 2) - 1, Number(sYearNum) * 2 ];
      const activeSemesters = (semSettingMap[semKey] && semSettingMap[semKey].length)
        ? semSettingMap[semKey]
        : defaultSems;

      // CRITICAL: Only whenever the semester is enabled/active, then only the marks are added!
      if (!activeSemesters.includes(semNum)) {
        skippedCount++;
        skippedDetails.push({
          id: idKey,
          name: student.fullName || student.username,
          sem: semNum,
          reason: 'Sem ' + semNum + ' is NOT enabled for ' + (sBranch || 'branch') + ' Year ' + sYearNum
        });
        continue;
      }

      // Apply marks to the specific enabled semester
      const semField = 'sem' + semNum + 'Score';
      if (updateMode === 'add') {
        student[semField] = (Number(student[semField]) || 0) + scoreVal;
      } else {
        student[semField] = scoreVal;
      }

      // Recalculate total base academic score
      student.score = [1, 2, 3, 4, 5, 6, 7, 8].reduce((sum, s) => sum + (Number(student['sem' + s + 'Score']) || 0), 0);
      await student.save();
      updatedCount++;
    }

    res.json({
      success: true,
      updatedCount,
      skippedCount,
      skippedDetails: skippedDetails.slice(0, 100),
      message: 'Marks uploaded successfully! Updated ' + updatedCount + ' student records.' + (skippedCount > 0 ? ' (' + skippedCount + ' rows skipped because semester is disabled)' : '')
    });
  } catch (err) {
    console.error("Error in coordinator-upload-marks:", err);
    res.status(500).json({ message: "Server error during marks upload: " + err.message });
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

    const authResult = await faculty.comparePassword(currentPassword);
    if (!authResult.isValid) {
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

    let branches = [];
    if (Array.isArray(faculty.coordinatorBranches) && faculty.coordinatorBranches.length) {
      branches = faculty.coordinatorBranches;
    } else if (faculty.coordinatorBranch) {
      branches = faculty.coordinatorBranch.split(',').map(b => b.trim()).filter(Boolean);
    }
    if (!branches.length && faculty.department) {
      branches = [faculty.department.trim()];
    }

    let query = {};
    if (req.query.branch && req.query.branch.toLowerCase() !== 'all') {
      query.branch = new RegExp(`^${req.query.branch.trim()}$`, 'i');
    } else if (branches.length && !branches.includes('ALL')) {
      query.branch = { $in: branches.map(b => new RegExp(`^${b}$`, 'i')) };
    }

    let students = await Student.find(query)
      .select("-password")
      .sort({ studentId: 1, pinNumber: 1, username: 1, fullName: 1 });

    // Aggregate event scores by PIN and semester so each student has exact per-semester event scores
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

    const regMap = new Map(); // key: "PIN_SEM" -> score
    const studentTotalEventMap = new Map(); // key: "PIN" -> score
    regScores.forEach(r => {
      if (r._id && r._id.pin) {
        const pinKey = String(r._id.pin).trim().toUpperCase();
        const sem = Number(r._id.semester) || 1;
        regMap.set(`${pinKey}_${sem}`, r.totalScore || 0);
        studentTotalEventMap.set(pinKey, (studentTotalEventMap.get(pinKey) || 0) + (r.totalScore || 0));
      }
    });

    const enrichedStudents = students.map(st => {
      const sObj = st.toObject();
      const p1 = String(st.pinNumber || '').trim().toUpperCase();
      const p2 = String(st.studentId || '').trim().toUpperCase();
      const p3 = String(st.username || '').trim().toUpperCase();

      for (let sem = 1; sem <= 8; sem++) {
        const evScore = regMap.get(`${p1}_${sem}`) || regMap.get(`${p2}_${sem}`) || regMap.get(`${p3}_${sem}`) || 0;
        const baseScore = Number(sObj[`sem${sem}Score`]) || 0;
        sObj[`sem${sem}EventScore`] = evScore;
        sObj[`sem${sem}TotalScore`] = baseScore + evScore;
      }
      const calcEventScore = studentTotalEventMap.get(p1) || studentTotalEventMap.get(p2) || studentTotalEventMap.get(p3) || 0;
      if (calcEventScore > 0 || !sObj.eventScore) {
        sObj.eventScore = calcEventScore;
      }
      return sObj;
    });

    const availableBranches = await Student.distinct('branch');

    res.json({
      department: branches.join(', '),
      coordinatorBranches: branches,
      coordinatorYears: faculty.coordinatorYears || [],
      students: enrichedStudents,
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

// ── STUDENT SCORE PROOF & BREAKDOWN FOR FACULTY / COORDINATOR ────
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

    // Calculate score details
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
        certificateId: oc._id || null,
        certificateName: u.certificateName || oc.certificateName || 'External Certificate',
        fileUrl: u.fileUrl || null,
        status: u.status || 'pending',
        marksAwarded: Number(u.marksAwarded) || 0,
        uploadedAt: u.uploadedAt || null,
        verifiedBy: u.verifiedBy || null
      };
    });

    return res.json({
      student: {
        _id: student._id,
        fullName: student.fullName || student.username,
        pinNumber: pin,
        branch: student.branch,
        year: student.year,
        score: baseScore,
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
        baseScore,
        totalEventScore,
        totalOtherCertsScore,
        grandTotalScore
      },
      events: eventList,
      otherCertificates: certList
    });
  } catch (err) {
    console.error("Error fetching student score proof:", err);
    return res.status(500).json({ message: "Error fetching student score proof", error: err.message });
  }
});

// ── UPDATE STUDENT SCORE (FOR FACULTY / COORDINATORS) ──────────────────
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

function parseYearDigit(yr) {
  if (yr === null || yr === undefined) return '1';
  const match = String(yr).match(/\d+/);
  return match ? match[0] : '1';
}

function getYearQueryVariants(yNum, rawYear) {
  const numStr = String(yNum);
  const variants = [numStr];
  if (rawYear && String(rawYear).trim() !== numStr) {
    variants.push(String(rawYear).trim());
  }
  variants.push(
    `${numStr}st Year`, `${numStr}nd Year`, `${numStr}rd Year`, `${numStr}th Year`,
    `${numStr}st`, `${numStr}nd`, `${numStr}rd`, `${numStr}th`,
    `Year ${numStr}`, `year ${numStr}`
  );
  return { $in: variants };
}

router.get("/coordinator-semesters", async (req, res) => {
  try {
    const branch = String(req.query.branch || '').trim().toUpperCase();
    const rawYear = String(req.query.year || '1').trim();
    if (!branch) return res.status(400).json({ message: "Branch is required" });

    const yNum = parseYearDigit(rawYear);
    const n = Number(yNum) || 1;
    const defaultSems = [ (n * 2) - 1, n * 2 ];

    const setting = await SemesterSetting.findOne({
      branch,
      year: getYearQueryVariants(yNum, rawYear)
    });

    res.json({
      branch,
      year: yNum,
      activeSemesters: (setting && Array.isArray(setting.activeSemesters) && setting.activeSemesters.length)
        ? setting.activeSemesters
        : defaultSems
    });
  } catch (err) {
    console.error("Error fetching coordinator semester settings:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/coordinator-semesters", async (req, res) => {
  try {
    const { branch, year, activeSemesters, facultyId } = req.body;
    if (!branch || !year) {
      return res.status(400).json({ message: "Branch and Year are required" });
    }

    const cleanBranch = String(branch).trim().toUpperCase();
    const rawYear = String(year).trim();
    const yNum = parseYearDigit(rawYear);

    const sems = Array.isArray(activeSemesters)
      ? activeSemesters.map(Number).filter(n => n >= 1 && n <= 8).sort((a,b) => a - b)
      : [];

    // Clean up any legacy non-numeric duplicates for this branch and year:
    try {
      await SemesterSetting.deleteMany({
        branch: cleanBranch,
        year: {
          $in: [
            `${yNum}st Year`, `${yNum}nd Year`, `${yNum}rd Year`, `${yNum}th Year`,
            `${yNum}st`, `${yNum}nd`, `${yNum}rd`, `${yNum}th`,
            `Year ${yNum}`, `year ${yNum}`
          ]
        }
      });
    } catch (e) {
      console.warn("Cleanup warning for legacy SemesterSetting:", e.message);
    }

    const setting = await SemesterSetting.findOneAndUpdate(
      { branch: cleanBranch, year: yNum },
      {
        branch: cleanBranch,
        year: yNum,
        activeSemesters: sems,
        updatedBy: facultyId || '',
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({
      message: `Semesters updated for ${cleanBranch} Year ${yNum} ✅`,
      setting
    });
  } catch (err) {
    console.error("Error saving coordinator semester settings:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Public / student lookup for active semesters
router.get("/active-semesters", async (req, res) => {
  try {
    const branch = String(req.query.branch || '').trim().toUpperCase();
    const rawYear = String(req.query.year || '1').trim();
    const yNum = parseYearDigit(rawYear);
    const n = Number(yNum) || 1;
    const defaultSems = [ (n * 2) - 1, n * 2 ];

    if (!branch) {
      return res.json({ activeSemesters: defaultSems });
    }

    const setting = await SemesterSetting.findOne({
      branch,
      year: getYearQueryVariants(yNum, rawYear)
    });

    if (setting && Array.isArray(setting.activeSemesters) && setting.activeSemesters.length > 0) {
      return res.json({ activeSemesters: setting.activeSemesters });
    }

    res.json({ activeSemesters: defaultSems });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Bulk lookup for all active semester settings across all branches and years
router.get("/all-active-semesters", async (_req, res) => {
  try {
    const list = await SemesterSetting.find().lean();
    const normalized = (list || []).map(item => {
      const yNum = parseYearDigit(item.year);
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
