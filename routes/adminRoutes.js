const express = require("express");
const router  = express.Router();
const Admin    = require("../models/Admin");
const Faculty  = require("../models/Faculty");
const Student  = require("../models/Student");
const Event    = require("../models/Event");
const Registration = require("../models/Registration");
const Hod      = require("../models/DepartmentHead");  // reuse existing DepartmentHead model
const Dean     = require("../models/Dean");
// ── LOGIN ──────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username, password });
  if (!admin) return res.status(401).json({ message: "Invalid admin credentials ❌" });
  res.json({ message: "Admin login successful ✅", admin });
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

module.exports = router;
