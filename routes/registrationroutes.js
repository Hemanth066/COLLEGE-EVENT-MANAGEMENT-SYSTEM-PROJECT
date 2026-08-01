const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const Student = require('../models/Student');
const Notification = require('../models/Notification');


// Multer storage for certificates
const certStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../public/certificates');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `cert_${req.params.id}_${Date.now()}${ext}`);
  }
});
const uploadCert = multer({
  storage: certStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only PDF and image files are allowed'));
  }
});

// Manual registration — faculty adds past attendance + score for a student
// Works for any event (past or present); creates the registration if not exists
router.post('/manual', async (req, res) => {
  try {
    const { pinNumber, eventId, score, attended } = req.body;

    if (!pinNumber || !eventId) {
      return res.status(400).json({ message: 'pinNumber and eventId are required' });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const student = await Student.findOne({ pinNumber })
      || await Student.findOne({ studentId: pinNumber });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Upsert: update if exists, create if not
    let registration = await Registration.findOne({ pinNumber, eventId });

    if (registration) {
      // Update existing
      if (attended !== undefined) registration.attended = attended;
      if (score    !== undefined) registration.score    = Number(score);
      await registration.save();
    } else {
      // Create new
      registration = await Registration.create({
        studentName:  student.fullName || student.username,
        pinNumber:    student.pinNumber || student.studentId,
        branch:       student.branch   || '',
        year:         student.year     || '',
        eventId,
        eventVersion: event.version || 1,
        attended:     attended !== undefined ? attended : true,
        score:        score    !== undefined ? Number(score) : 0
      });
    }

    // Push notification to student
    try {
      await Notification.create({
        type: 'score',
        title: 'Score Updated',
        message: `Your score for "${event.title}" has been set to ${registration.score} points.`,
        eventId: event._id,
        eventTitle: event.title,
        pinNumber: registration.pinNumber
      });
    } catch (e) { /* non-fatal */ }

    // ── Sync event score back to Student document (eventScore only, base score untouched) ──
    try {
      const allRegs = await Registration.find({ pinNumber: registration.pinNumber });
      const eventScore = allRegs.reduce((sum, r) => sum + (r.score || 0), 0);
      await Student.findOneAndUpdate(
        { $or: [{ pinNumber: registration.pinNumber }, { studentId: registration.pinNumber }] },
        { eventScore }
      );
    } catch (syncErr) {
      console.log('Score sync to student failed:', syncErr.message);
    }

    res.json({ message: 'Data saved successfully', registration });
  } catch (err) {
    console.error('Manual registration error:', err);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// Register for Event
router.post('/', async (req, res) => {
  try {
    const { studentName, pinNumber, branch, year, eventId } = req.body;
    
    console.log('Registration request:', { studentName, pinNumber, branch, year, eventId });
    
    // Get event to check version
    const event = await Event.findById(eventId);
    if (!event) {
      console.log('Event not found:', eventId);
      return res.status(404).json({ message: 'Event not found' });
    }
    
    console.log('Event found:', event.title);
    
    // Check if student already registered for this event
    const existingRegistration = await Registration.findOne({
      pinNumber: pinNumber,
      eventId: eventId
    });
    
    if (existingRegistration) {
      console.log('Student already registered');
      return res.status(400).json({ 
        message: 'You are already registered for this event!',
        alreadyRegistered: true
      });
    }

    // Check participant limit
    if (event.maxParticipants) {
      const currentCount = await Registration.countDocuments({ eventId: eventId });
      if (currentCount >= event.maxParticipants) {
        return res.status(400).json({
          message: `Sorry, this event is full! Maximum ${event.maxParticipants} participants allowed.`,
          eventFull: true
        });
      }
    }
    
    // Create new registration
    const newRegistration = new Registration({
      studentName,
      pinNumber,
      branch,
      year,
      eventId,
      eventVersion: event.version || 1,
      attended: false,
      score: 0
    });
    
    await newRegistration.save();
    console.log('Registration successful for:', studentName);

    // Notify the registering student — confirmation (only this student sees it)
    try {
      await Notification.create({
        type: 'registration_confirmed',
        title: 'Registration Confirmed',
        message: `You have successfully registered for "${event.title}". See you there!`,
        eventId: event._id,
        eventTitle: event.title,
        pinNumber: pinNumber,  // only this student's PIN
        facultyId: null
      });
    } catch (notifErr) {
      console.log('Student notification failed:', notifErr.message);
    }

    // Notify the faculty who published this event
    try {
      if (event.publishedByFacultyId) {
        await Notification.create({
          type: 'new_registration',
          title: 'New Registration',
          message: `${studentName} (${pinNumber}) registered for "${event.title}".`,
          eventId: event._id,
          eventTitle: event.title,
          pinNumber: null,
          facultyId: event.publishedByFacultyId
        });
      }
    } catch (notifErr) {
      console.log('Faculty notification failed:', notifErr.message);
    }
    
    res.json({ message: 'Registration Successful' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// Get All Registrations
router.get('/all', async (req, res) => {
  try {
    const registrations = await Registration.find().populate('eventId');
    res.json(registrations);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get Registrations by Student PIN
router.get('/student/:pinNumber', async (req, res) => {
  try {
    console.log('Fetching registrations for PIN:', req.params.pinNumber);
    const registrations = await Registration.find({ 
      pinNumber: req.params.pinNumber 
    });
    console.log('Found registrations:', registrations.length);
    res.json(registrations);
  } catch (err) {
    console.log('Error fetching student registrations:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get all registrations for a student WITH fully populated event data
// (includes past events so scores/attendance history is never lost)
router.get('/student/:pinNumber/with-events', async (req, res) => {
  try {
    const pin = req.params.pinNumber;
    // Match by pinNumber OR studentId field in case they differ
    const registrations = await Registration.find({
      $or: [{ pinNumber: pin }, { studentId: pin }]
    }).populate('eventId');

    const result = registrations.map(reg => reg.toObject());
    res.json(result);
  } catch (err) {
    console.log('Error fetching student registrations with events:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Update Attendance
router.put('/attendance/:id', async (req, res) => {
  try {
    const { attended } = req.body;
    const registration = await Registration.findByIdAndUpdate(
      req.params.id,
      { attended },
      { new: true }
    );

    // Push in-app notification to this student
    try {
      const event = await Event.findById(registration.eventId);
      if (event) {
        await Notification.create({
          type: 'attendance',
          title: attended ? 'Attendance Marked' : 'Attendance Removed',
          message: attended
            ? `Your attendance for "${event.title}" has been marked as Present.`
            : `Your attendance for "${event.title}" has been marked as Absent.`,
          eventId: event._id,
          eventTitle: event.title,
          pinNumber: registration.pinNumber
        });
      }
    } catch (notifErr) {
      console.log('Notification failed:', notifErr.message);
    }
    
    res.json({ message: 'Attendance Updated', registration });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Bulk Update Attendance
router.put('/attendance-bulk', async (req, res) => {
  try {
    const { updates } = req.body; // Array of { id, attended }
    if (!Array.isArray(updates) || !updates.length) {
      return res.status(400).json({ message: 'No attendance updates provided' });
    }

    const bulkOps = updates.map(item => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { attended: Boolean(item.attended) } }
      }
    }));

    await Registration.bulkWrite(bulkOps);

    // Create notifications asynchronously for students whose status changed to Present
    try {
      const presentItemIds = updates.filter(u => u.attended).map(u => u.id);
      if (presentItemIds.length) {
        const updatedRegs = await Registration.find({ _id: { $in: presentItemIds } });
        for (const reg of updatedRegs) {
          const event = await Event.findById(reg.eventId);
          if (event) {
            await Notification.create({
              type: 'attendance',
              title: '✅ Attendance Marked',
              message: `Your attendance for "${event.title}" has been marked as Present.`,
              eventId: event._id,
              eventTitle: event.title,
              pinNumber: reg.pinNumber
            });
          }
        }
      }
    } catch (notifErr) {
      console.log('Bulk notification failed:', notifErr.message);
    }

    res.json({ message: 'Attendance updated successfully for all students ✅' });
  } catch (err) {
    console.error('Bulk attendance error:', err);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// Update Score
router.put('/score/:id', async (req, res) => {
  try {
    const { score } = req.body;
    const registration = await Registration.findByIdAndUpdate(
      req.params.id,
      { score },
      { new: true }
    );

    // ── Sync event score back to Student document (eventScore only, base score untouched) ──
    try {
      const allRegs = await Registration.find({ pinNumber: registration.pinNumber });
      const eventScore = allRegs.reduce((sum, r) => sum + (r.score || 0), 0);
      await Student.findOneAndUpdate(
        { $or: [{ pinNumber: registration.pinNumber }, { studentId: registration.pinNumber }] },
        { eventScore }
      );
    } catch (syncErr) {
      console.log('Score sync to student failed:', syncErr.message);
    }

    // Push in-app notification
    try {
      const event = await Event.findById(registration.eventId);
      if (event) {
        await Notification.create({
          type: 'score',
          title: 'Score Assigned',
          message: `You scored ${score} points in "${event.title}".`,
          eventId: event._id,
          eventTitle: event.title,
          pinNumber: registration.pinNumber
        });
      }
    } catch (notifErr) {
      console.log('Notification failed:', notifErr.message);
    }
    
    res.json({ message: 'Score Updated', registration });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Upload Certificate for a registration (attended students only)
router.post('/certificate/:id', uploadCert.single('certificate'), async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id);
    if (!registration) return res.status(404).json({ message: 'Registration not found' });
    if (!registration.attended) return res.status(400).json({ message: 'Student did not attend this event' });

    // Remove old certificate file if exists
    if (registration.certificateUrl) {
      const oldPath = path.join(__dirname, '../public', registration.certificateUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const certUrl = `/certificates/${req.file.filename}`;
    registration.certificateUrl = certUrl;
    await registration.save();

    // Push in-app notification to the student
    try {
      const event = await Event.findById(registration.eventId);
      if (event) {
        await Notification.create({
          type: 'certificate',
          title: 'Certificate Issued',
          message: `Your certificate for "${event.title}" is ready. Go to My Certificates to download it.`,
          eventId: event._id,
          eventTitle: event.title,
          pinNumber: registration.pinNumber
        });
      }
    } catch (notifErr) {
      console.log('Certificate notification failed:', notifErr.message);
    }

    res.json({ message: 'Certificate uploaded', certificateUrl: certUrl });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// Delete Certificate for a registration
router.delete('/certificate/:id', async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id);
    if (!registration) return res.status(404).json({ message: 'Registration not found' });

    if (registration.certificateUrl) {
      const filePath = path.join(__dirname, '../public', registration.certificateUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      registration.certificateUrl = null;
      await registration.save();
    }

    res.json({ message: 'Certificate removed' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;