const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const Student = require('../models/Student');
const Notification = require('../models/Notification');
const { sendRegistrationEmail, sendAttendanceEmail, sendScoreEmail } = require('../emailService');

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

// Register for Event
router.post('/', async (req, res) => {
  try {
    const { studentName, pinNumber, branch, section, year, eventId } = req.body;
    
    console.log('Registration request:', { studentName, pinNumber, branch, section, year, eventId });
    
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
      section,
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

    // Send email notification
    try {
      const student = await Student.findOne({ pinNumber: pinNumber });
      if (student && student.email) {
        await sendRegistrationEmail(
          student.email,
          studentName,
          event.title,
          event.date,
          event.time,
          event.venue
        );
      }
    } catch (emailError) {
      console.log('Email notification failed:', emailError.message);
      // Don't fail the registration if email fails
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

// Update Attendance
router.put('/attendance/:id', async (req, res) => {
  try {
    const { attended } = req.body;
    const registration = await Registration.findByIdAndUpdate(
      req.params.id,
      { attended },
      { new: true }
    );
    
    // Send email notification
    try {
      const student = await Student.findOne({ pinNumber: registration.pinNumber });
      const event = await Event.findById(registration.eventId);
      
      if (student && student.email && event) {
        await sendAttendanceEmail(
          student.email,
          registration.studentName,
          event.title,
          attended
        );
      }

      // Push in-app notification to this student
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
    } catch (emailError) {
      console.log('Email notification failed:', emailError.message);
    }
    
    res.json({ message: 'Attendance Updated', registration });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server Error' });
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
    
    // Send email notification
    try {
      const student = await Student.findOne({ pinNumber: registration.pinNumber });
      const event = await Event.findById(registration.eventId);
      
      if (student && student.email && event) {
        await sendScoreEmail(
          student.email,
          registration.studentName,
          event.title,
          score
        );
      }

      // Push in-app notification
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
    } catch (emailError) {
      console.log('Email notification failed:', emailError.message);
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
