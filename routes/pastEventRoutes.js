const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const PastEvent = require('../models/PastEvent');
const PastEventParticipant = require('../models/PastEventParticipant');
const Student = require('../models/Student');
const Notification = require('../models/Notification');

// Configure Multer for PDF uploads
const uploadDir = path.join(__dirname, '../public/uploads/pdf');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'pastevent-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max file size
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
});

// Helper validation for 10-digit phone number
function isValidPhone(phone) {
  if (!phone) return false;
  const digits = String(phone).replace(/[^0-9]/g, '');
  return digits.length === 10;
}

// Universal Failsafe PDF Text Extractor Helper
async function parsePdfText(dataBuffer) {
  try {
    const pdfModule = require('pdf-parse');
    if (typeof pdfModule === 'function') {
      const data = await pdfModule(dataBuffer);
      return data.text || '';
    } else if (pdfModule && pdfModule.PDFParse) {
      const parser = new pdfModule.PDFParse(new Uint8Array(dataBuffer));
      await parser.load();
      const result = await parser.getText();
      if (typeof result === 'string') return result;
      if (result && result.text) return result.text;
      if (result && Array.isArray(result.pages)) {
        return result.pages.map(p => (typeof p === 'string' ? p : p.text || '')).join('\n');
      }
      return String(result || '');
    } else if (pdfModule && typeof pdfModule.default === 'function') {
      const data = await pdfModule.default(dataBuffer);
      return data.text || '';
    }
  } catch (err) {
    console.error('parsePdfText error:', err);
  }
  return '';
}

// Helper: Extract Roll No and Name ONLY from PDF text (Filtering out header lines, depts, years & serial numbers)
function extractRollNoAndNameOnly(extractedText, allStudents = []) {
  const lines = extractedText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const participants = [];

  const ignoreKeywords = ['PARTICIPANT', 'S. NUMBER', 'S.NO', 'SL.NO', 'STUDENT NAME', 'ROLL NO', 'ROLL NUMBER', 'DEPARTMENT', 'BRANCH', 'YEAR', 'SIGNATURE', 'ATTENDANCE', 'NOROLL', 'S. NUMBERSTUDENT'];

  lines.forEach(line => {
    const upperLine = line.toUpperCase();
    if (ignoreKeywords.some(kw => upperLine.includes(kw))) {
      return; // skip table headers and title lines
    }

    // Match exact 10-char college Roll No / PIN (e.g. 24B11CS485, 25B21CS071, 25B21DS005)
    // pattern: 2 digits + 1 letter + 2 digits + 2 letters + 3 alphanumeric
    let rollMatch = line.match(/([0-9]{2}[A-Z][0-9]{2}[A-Z]{2}[0-9A-Z]{3})/i);
    if (!rollMatch) {
      rollMatch = line.match(/\b([0-9]{2}[A-Z0-9]{8})\b/i) || line.match(/\b([A-Z0-9]{8,10})\b/i);
    }

    if (rollMatch) {
      let rollNo = (rollMatch[1] || rollMatch[0]).toUpperCase();
      if (rollNo.length === 11 && /^\d\d{2}[A-Z0-9]/.test(rollNo)) {
        rollNo = rollNo.substring(1);
      }

      // Check DB student for clean full name
      const matchedStudent = allStudents.find(s =>
        (s.pinNumber && s.pinNumber.trim().toUpperCase() === rollNo) ||
        (s.studentId && s.studentId.trim().toUpperCase() === rollNo)
      );

      let name = '';
      if (matchedStudent && (matchedStudent.fullName || matchedStudent.username)) {
        name = matchedStudent.fullName || matchedStudent.username;
      } else {
        name = line.replace(rollMatch[0], '');
        // Split by department keywords (even if attached without space e.g. BrundaCSE)
        name = name.split(/CSE|DS|ECE|EEE|MECH|CIVIL|IT|AIML|MCA|MBA|CSM|CSD|ENGINEERING|TECH/i)[0];
        // Strip year indicators
        name = name.replace(/\b(1st|2nd|3rd|4th|st|nd|rd|th|year\s*[1-4])\b/gi, '');
        // Strip leading digits/bullets (e.g. '1.', '2 ', '. ')
        name = name.replace(/^[0-9\.\s]+/, '');
        // Clean up whitespace and non-name characters
        name = name.replace(/[^a-zA-Z\s.]/g, ' ').replace(/\s+/g, ' ').trim();
      }

      if (rollNo) {
        participants.push({
          rollNumber: rollNo,
          studentName: name || 'Student'
        });
      }
    }
  });

  return participants;
}

// 1. Create Past Event & Extract Roll No + Name from PDF
router.post('/create-with-pdf', upload.single('pdfFile'), async (req, res) => {
  try {
    const {
      title,
      venue,
      date,
      time,
      facultyCoordinator,
      facultyPhone,
      studentCoordinator,
      studentPhone,
      createdBy
    } = req.body;

    // Field Validations
    if (!title || !title.trim()) return res.status(400).json({ message: 'Event Title is required.' });
    if (!venue || !venue.trim()) return res.status(400).json({ message: 'Venue is required.' });
    if (!date) return res.status(400).json({ message: 'Event Date is required.' });
    if (!time) return res.status(400).json({ message: 'Event Time is required.' });
    if (!facultyCoordinator || !facultyCoordinator.trim()) return res.status(400).json({ message: 'Faculty Coordinator Name is required.' });
    if (!isValidPhone(facultyPhone)) return res.status(400).json({ message: 'Faculty Coordinator Phone must be a valid 10-digit number.' });
    if (!studentCoordinator || !studentCoordinator.trim()) return res.status(400).json({ message: 'Student Coordinator Name is required.' });
    if (!isValidPhone(studentPhone)) return res.status(400).json({ message: 'Student Coordinator Phone must be a valid 10-digit number.' });

    // Check duplicate event creation
    const existing = await PastEvent.findOne({
      title: { $regex: new RegExp('^' + title.trim() + '$', 'i') },
      date: String(date).trim()
    });
    if (existing) {
      return res.status(400).json({ message: `A completed past event with title "${title}" on date ${date} already exists.` });
    }

    // Fetch all student accounts for fast matching & clean name lookup
    const allStudents = await Student.find({});

    let pdfUrl = '';
    let extractedRows = [];

    if (req.file) {
      pdfUrl = '/uploads/pdf/' + req.file.filename;
      const dataBuffer = fs.readFileSync(req.file.path);
      const rawText = await parsePdfText(dataBuffer);
      extractedRows = extractRollNoAndNameOnly(rawText, allStudents);
    }

    // Save Event Document
    const pastEvent = new PastEvent({
      title: title.trim(),
      venue: venue.trim(),
      date: String(date).trim(),
      time: String(time).trim(),
      facultyCoordinator: facultyCoordinator.trim(),
      facultyPhone: String(facultyPhone).replace(/[^0-9]/g, ''),
      studentCoordinator: studentCoordinator.trim(),
      studentPhone: String(studentPhone).replace(/[^0-9]/g, ''),
      uploadedPdf: pdfUrl,
      createdBy: createdBy || 'Faculty',
      status: 'Completed'
    });

    const savedEvent = await pastEvent.save();

    const participantDocs = [];

    for (const item of extractedRows) {
      const roll = (item.rollNumber || '').trim().toUpperCase();
      if (!roll) continue;

      const matchedStudent = allStudents.find(s =>
        (s.pinNumber && s.pinNumber.trim().toUpperCase() === roll) ||
        (s.studentId && s.studentId.trim().toUpperCase() === roll)
      );

      const isMatched = !!matchedStudent;

      const participant = new PastEventParticipant({
        eventId: savedEvent._id,
        studentId: isMatched ? matchedStudent._id : null,
        rollNumber: roll,
        studentName: (matchedStudent && (matchedStudent.fullName || matchedStudent.username)) ? (matchedStudent.fullName || matchedStudent.username) : ((item.studentName || '').trim() || 'Student'),
        department: matchedStudent ? matchedStudent.branch : 'CSE',
        year: matchedStudent ? matchedStudent.year : '1',
        email: matchedStudent ? matchedStudent.email : '',
        attendanceStatus: 'Completed',
        matched: isMatched
      });

      const savedP = await participant.save();
      participantDocs.push(savedP);
    }

    res.status(201).json({
      message: `Past Event "${savedEvent.title}" created successfully!`,
      event: savedEvent,
      extractedCount: participantDocs.length
    });

  } catch (error) {
    console.error('Create Past Event error:', error);
    res.status(500).json({ message: 'Error creating past event: ' + error.message });
  }
});

// 2. Save Final Participant List & Notify Students
router.post('/:id/save-participants', async (req, res) => {
  try {
    const { id } = req.params;
    const { participants = [] } = req.body;

    const event = await PastEvent.findById(id);
    if (!event) return res.status(404).json({ message: 'Past Event not found' });

    // Clear existing participants for this event
    await PastEventParticipant.deleteMany({ eventId: id });

    const allStudents = await Student.find({});
    let matchedCount = 0;
    const notificationPromises = [];
    const savedParticipants = [];

    for (const p of participants) {
      const roll = (p.rollNumber || '').trim().toUpperCase();
      const pName = (p.studentName || '').trim();

      if (!roll) continue;

      let matchedStudent = allStudents.find(s =>
        (s.pinNumber && s.pinNumber.trim().toUpperCase() === roll) ||
        (s.studentId && s.studentId.trim().toUpperCase() === roll)
      );

      if (!matchedStudent && p.email) {
        matchedStudent = allStudents.find(s => s.email && s.email.trim().toLowerCase() === p.email.trim().toLowerCase());
      }

      const isMatched = !!matchedStudent;
      if (isMatched) matchedCount++;

      const participant = new PastEventParticipant({
        eventId: id,
        studentId: isMatched ? matchedStudent._id : null,
        rollNumber: roll,
        studentName: pName || (matchedStudent ? matchedStudent.fullName : 'Student'),
        department: matchedStudent ? matchedStudent.branch : 'CSE',
        year: matchedStudent ? matchedStudent.year : '1',
        email: matchedStudent ? matchedStudent.email : '',
        attendanceStatus: 'Completed',
        matched: isMatched
      });

      const savedP = await participant.save();
      savedParticipants.push(savedP);

      // Create notification for matched student
      if (isMatched && matchedStudent.pinNumber) {
        notificationPromises.push(
          Notification.create({
            type: 'past_event',
            title: 'Completed Event Participation',
            message: `You have been added as a participant of the completed event '${event.title}'. You can now view the event in your All Registrations section.`,
            eventId: event._id,
            eventTitle: event.title,
            pinNumber: matchedStudent.pinNumber
          }).catch(err => console.error('Notification error:', err))
        );
      }
    }

    await Promise.all(notificationPromises);

    res.json({
      message: `Participant roster saved successfully! ${matchedCount} matched students notified.`,
      totalParticipants: savedParticipants.length,
      matchedParticipants: matchedCount
    });

  } catch (error) {
    console.error('Save Participants error:', error);
    res.status(500).json({ message: 'Error saving participants: ' + error.message });
  }
});

// 3. Get Past Events for Faculty
router.get('/faculty/:facultyId', async (req, res) => {
  try {
    const { facultyId } = req.params;
    const events = await PastEvent.find({
      $or: [{ createdBy: facultyId }, { facultyCoordinator: new RegExp(facultyId, 'i') }]
    }).sort({ createdAt: -1 });

    const eventsWithCounts = await Promise.all(events.map(async (evt) => {
      const pCount = await PastEventParticipant.countDocuments({ eventId: evt._id });
      return {
        ...evt.toObject(),
        participantCount: pCount
      };
    }));

    res.json(eventsWithCounts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching past events: ' + error.message });
  }
});

// 4. Get Student Past Events
router.get('/student/:pinNumber', async (req, res) => {
  try {
    const { pinNumber } = req.params;
    const cleanPin = String(pinNumber).trim().toUpperCase();

    const student = await Student.findOne({
      $or: [
        { pinNumber: new RegExp('^' + cleanPin + '$', 'i') },
        { studentId: new RegExp('^' + cleanPin + '$', 'i') },
        { username: new RegExp('^' + cleanPin + '$', 'i') }
      ]
    });

    const searchCriteria = [{ rollNumber: new RegExp('^' + cleanPin + '$', 'i') }];
    if (student) {
      if (student._id) searchCriteria.push({ studentId: student._id });
      if (student.pinNumber) searchCriteria.push({ rollNumber: new RegExp('^' + student.pinNumber.trim() + '$', 'i') });
      if (student.studentId) searchCriteria.push({ rollNumber: new RegExp('^' + student.studentId.trim() + '$', 'i') });
      if (student.email) searchCriteria.push({ email: new RegExp('^' + student.email.trim() + '$', 'i') });
    }

    const participations = await PastEventParticipant.find({ $or: searchCriteria });
    if (!participations.length) {
      return res.json([]);
    }

    const eventIds = participations.map(p => p.eventId);
    const pastEvents = await PastEvent.find({ _id: { $in: eventIds } }).sort({ date: -1 });

    const studentEvents = pastEvents.map(evt => {
      const myParticipantData = participations.find(p => String(p.eventId) === String(evt._id));
      return {
        ...evt.toObject(),
        participantInfo: myParticipantData
      };
    });

    res.json(studentEvents);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching student past events: ' + error.message });
  }
});

// 5. Get Past Event Details & Participants
router.get('/:id', async (req, res) => {
  try {
    const event = await PastEvent.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Past Event not found' });

    const participants = await PastEventParticipant.find({ eventId: event._id });

    res.json({
      event,
      participants
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching past event details: ' + error.message });
  }
});

// 6. Delete Past Event
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedEvent = await PastEvent.findByIdAndDelete(id);
    if (!deletedEvent) return res.status(404).json({ message: 'Past Event not found' });

    await PastEventParticipant.deleteMany({ eventId: id });

    res.json({ message: 'Past Event and participant list deleted successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting past event: ' + error.message });
  }
});

module.exports = router;
