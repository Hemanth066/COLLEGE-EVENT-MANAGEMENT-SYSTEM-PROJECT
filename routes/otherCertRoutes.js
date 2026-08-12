const express    = require('express');
const router     = express.Router();
const multer     = require('multer');
const cloudinary = require('../config/cloudinary');
const path       = require('path');
const fs         = require('fs');
const OtherCertificate = require('../models/OtherCertificate');
const OtherCertUpload  = require('../models/OtherCertUpload');
const Student          = require('../models/Student');
const Notification     = require('../models/Notification');

function parseDateInput(value, timeValue = null) {
  if (!value) return null;
  const str = String(value).trim();
  const dateMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const y = Number(dateMatch[1]);
    const m = Number(dateMatch[2]);
    const d = Number(dateMatch[3]);

    let hours = 23, minutes = 59;
    if (timeValue && typeof timeValue === 'string') {
      const timeParts = timeValue.trim().match(/^(\d{1,2}):(\d{2})/);
      if (timeParts) {
        hours = Number(timeParts[1]);
        minutes = Number(timeParts[2]);
      }
    }

    return new Date(y, m - 1, d, hours, minutes, 0);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isCertificateVisible(cert, now = new Date()) {
  if (!cert || cert.status !== 'active') return false;
  if (cert.endDate) {
    const endDate = new Date(cert.endDate);
    if (now > endDate) return false;
  }
  return true;
}

// ── Multer: save to local /tmp, then upload to Cloudinary ──
const uploadDir = path.join(__dirname, '../tmp_uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename:    (_req, file, cb) => cb(null, `oc_${Date.now()}_${file.originalname}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB Limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, JPG, JPEG, PNG files are allowed'));
  }
});

// ──────────────────────────────────────────────────────────
//  FACULTY — CREATE certificate eligibility
// ──────────────────────────────────────────────────────────

// POST /api/other-certs/create
router.post('/create', async (req, res) => {
  try {
    const { certificateName, branch, pinStart, pinEnd, marks, description, facultyId, facultyName, startDate, endDate, endTime } = req.body;
    if (!certificateName || !branch || !pinStart || !pinEnd || marks === undefined || !facultyId) {
      return res.status(400).json({ message: 'All required fields must be filled' });
    }
    const finalEndDate = parseDateInput(endDate, endTime);
    const cert = await OtherCertificate.create({
      certificateName, branch, pinStart, pinEnd,
      marks: Number(marks), description: description || '',
      facultyId, facultyName: facultyName || '',
      startDate: new Date(),
      endDate: finalEndDate,
      extendDate: finalEndDate
    });

    // Notify eligible students in this branch & PIN range
    try {
      const eligibleStudents = await Student.find({
        branch: new RegExp(`^${branch}$`, 'i')
      });

      const notifs = eligibleStudents
        .filter(s => {
          const pin = s.pinNumber || s.studentId || s.username || '';
          if (!pinStart || !pinEnd) return true;
          return pin >= pinStart && pin <= pinEnd;
        })
        .map(s => ({
          type: 'certificate',
          title: '📜 New Certificate Opportunity Activated',
          message: `Faculty ${cert.facultyName || ''} activated "${cert.certificateName}" (+${cert.marks} marks). Upload your certificate for verification!`,
          pinNumber: s.pinNumber || s.studentId || s.username
        }));

      if (notifs.length > 0) {
        await Notification.insertMany(notifs);
      } else {
        await Notification.create({
          type: 'certificate',
          title: '📜 New Certificate Opportunity Activated',
          message: `Faculty ${cert.facultyName || ''} activated "${cert.certificateName}" (+${cert.marks} marks) for ${branch} branch. Upload your certificate for verification!`,
          pinNumber: null
        });
      }
    } catch (notifErr) {
      console.error('Error creating certificate activation notifications:', notifErr);
    }

    res.json({ message: 'Certificate activated successfully ✅', certificate: cert });
  } catch (err) {
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// GET /api/other-certs/faculty/:facultyId — all certificates created by this faculty
router.get('/faculty/:facultyId', async (req, res) => {
  try {
    const certs = await OtherCertificate.find({ facultyId: req.params.facultyId })
      .sort({ createdAt: -1 });
    res.json(certs);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// POST /api/other-certs/extend/:certId
router.post('/extend/:certId', async (req, res) => {
  try {
    const cert = await OtherCertificate.findById(req.params.certId);
    if (!cert) return res.status(404).json({ message: 'Certificate not found' });

    const newEndDate = parseDateInput(req.body.endDate, req.body.endTime);
    if (!newEndDate) return res.status(400).json({ message: 'A valid end date is required' });

    const currentEndDate = cert.endDate ? new Date(cert.endDate) : null;
    if (currentEndDate && newEndDate <= currentEndDate) {
      return res.status(400).json({ message: 'The new end date & time must be later than the current one' });
    }

    cert.endDate = newEndDate;
    cert.extendDate = newEndDate;
    await cert.save();

    // Notify eligible students about date extension
    try {
      const eligibleStudents = await Student.find({
        branch: new RegExp(`^${cert.branch}$`, 'i')
      });

      const notifs = eligibleStudents
        .filter(s => {
          const pin = s.pinNumber || s.studentId || s.username || '';
          return pin >= cert.pinStart && pin <= cert.pinEnd;
        })
        .map(s => ({
          type: 'certificate',
          title: '⏰ Certificate Deadline Extended',
          message: `Upload deadline for "${cert.certificateName}" has been extended.`,
          pinNumber: s.pinNumber || s.studentId || s.username
        }));

      if (notifs.length > 0) {
        await Notification.insertMany(notifs);
      }
    } catch (notifErr) {
      console.error('Error creating certificate extension notifications:', notifErr);
    }

    res.json({ message: 'Certificate visibility extended successfully ✅', certificate: cert });
  } catch (err) {
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

const mongoose   = require('mongoose');

// DELETE /api/other-certs/:certId or POST /api/other-certs/delete/:certId
async function deleteCertHandler(req, res) {
  try {
    const { certId } = req.params;
    let cert = null;
    if (mongoose.Types.ObjectId.isValid(certId)) {
      cert = await OtherCertificate.findByIdAndDelete(certId);
    }
    if (!cert) {
      cert = await OtherCertificate.findOneAndDelete({ _id: certId });
    }
    if (!cert) return res.status(404).json({ message: 'Certificate not found' });

    // Remove any student uploads associated with this certificate
    await OtherCertUpload.deleteMany({ certificateId: cert._id });

    res.json({ message: 'Certificate deleted successfully 🗑️' });
  } catch (err) {
    console.error('Delete cert error:', err);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
}

router.delete('/:certId', deleteCertHandler);
router.post('/delete/:certId', deleteCertHandler);

// ──────────────────────────────────────────────────────────
//  FACULTY — VERIFICATION: list uploads for a certificate
// ──────────────────────────────────────────────────────────

// GET /api/other-certs/uploads/:certId
router.get('/uploads/:certId', async (req, res) => {
  try {
    const uploads = await OtherCertUpload.find({ certificateId: req.params.certId })
      .sort({ uploadedAt: -1 });
    res.json(uploads);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// POST /api/other-certs/approve/:uploadId
router.post('/approve/:uploadId', async (req, res) => {
  try {
    const upload = await OtherCertUpload.findById(req.params.uploadId);
    if (!upload) return res.status(404).json({ message: 'Upload not found' });
    if (upload.status === 'approved') return res.status(400).json({ message: 'Already approved' });

    // Fetch certificate to get marks
    const cert = await OtherCertificate.findById(upload.certificateId);
    const marks = cert ? cert.marks : 0;

    // Update upload status
    upload.status      = 'approved';
    upload.marksAwarded = marks;
    upload.reviewedAt  = new Date();
    await upload.save();

    // Add marks to student's score (use eventScore field to keep separate from base score)
    const student = await Student.findOne({ pinNumber: upload.studentPin });
    if (student) {
      student.eventScore = (student.eventScore || 0) + marks;
      await student.save();
    }

    // Push in-app notification to student
    try {
      await Notification.create({
        type: 'certificate',
        title: '✅ Other Certificate Approved!',
        message: `Your uploaded certificate for "${upload.certificateName || (cert ? cert.certificateName : 'Certificate')}" has been approved! +${marks} marks added to your total score.`,
        pinNumber: upload.studentPin
      });
    } catch (notifErr) {
      console.error('Error creating approval notification:', notifErr);
    }

    res.json({ message: `Approved ✅ — ${marks} marks added to student's score` });
  } catch (err) {
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// POST /api/other-certs/reject/:uploadId
router.post('/reject/:uploadId', async (req, res) => {
  try {
    const upload = await OtherCertUpload.findById(req.params.uploadId);
    if (!upload) return res.status(404).json({ message: 'Upload not found' });

    upload.status     = 'rejected';
    upload.reviewedAt = new Date();
    await upload.save();

    // Push in-app notification to student
    try {
      await Notification.create({
        type: 'certificate',
        title: '❌ Other Certificate Rejected',
        message: `Your uploaded certificate for "${upload.certificateName || 'Certificate'}" was rejected by faculty.`,
        pinNumber: upload.studentPin
      });
    } catch (notifErr) {
      console.error('Error creating rejection notification:', notifErr);
    }

    res.json({ message: 'Certificate rejected' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────
//  STUDENT — fetch eligible certificates
// ──────────────────────────────────────────────────────────

// GET /api/other-certs/student/:pin/:branch
router.get('/student/:pin/:branch', async (req, res) => {
  try {
    const pin = (req.params.pin || '').trim();
    const branch = (req.params.branch || '').trim();

    // 1. Find all uploads for this student (case-insensitive PIN)
    const studentUploads = await OtherCertUpload.find({
      studentPin: new RegExp(`^${pin}$`, 'i')
    });
    const uploadedCertIds = studentUploads.map(u => u.certificateId);

    // 2. Find all active certificates matching branch or certificates student uploaded
    const allCerts = await OtherCertificate.find({
      $or: [
        { _id: { $in: uploadedCertIds } },
        {
          status: 'active',
          $or: [
            { branch: new RegExp(`^${branch}$`, 'i') },
            { branch: /^all$/i },
            { branch: '' },
            { branch: { $exists: false } }
          ]
        }
      ]
    }).sort({ createdAt: -1 });

    const now = new Date();

    // 3. Filter certificates:
    // If student HAS uploaded (existing upload record), ALWAYS keep it!
    // If student has NOT uploaded, only include if deadline not passed (isCertificateVisible(cert, now)).
    const eligible = [];
    for (const cert of allCerts) {
      const existing = studentUploads.find(u => u.certificateId.toString() === cert._id.toString());
      if (existing) {
        eligible.push({ cert, existing });
      } else {
        if (isCertificateVisible(cert, now)) {
          let pinMatch = true;
          if (cert.pinStart && cert.pinEnd && cert.pinStart.trim() && cert.pinEnd.trim()) {
            const studentPinNorm = pin.toUpperCase();
            const startNorm = cert.pinStart.trim().toUpperCase();
            const endNorm = cert.pinEnd.trim().toUpperCase();
            pinMatch = (studentPinNorm >= startNorm && studentPinNorm <= endNorm);
          }
          if (pinMatch) {
            eligible.push({ cert, existing: null });
          }
        }
      }
    }

    const result = eligible.map(({ cert, existing }) => {
      const certObj = cert.toObject ? cert.toObject() : cert;
      const isExpired = certObj.endDate ? new Date(certObj.endDate) < now : false;
      return {
        ...certObj,
        uploadStatus: existing ? existing.status : null,
        uploadId: existing ? existing._id : null,
        fileUrl: existing ? existing.fileUrl : null,
        marksAwarded: existing ? (existing.marksAwarded || certObj.marks || 0) : 0,
        isExpired
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Error fetching student certificates:', err);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// POST /api/other-certs/upload/:certId — student uploads their certificate
router.post('/upload/:certId', (req, res, next) => {
  upload.single('certificate')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE' || (err.message && err.message.includes('File too large'))) {
        return res.status(400).json({ message: 'Please compress your PDF to under 2MB and upload' });
      }
      return res.status(400).json({ message: err.message || 'File upload error' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { studentPin, studentName, branch } = req.body;
    if (!studentPin || !req.file) {
      return res.status(400).json({ message: 'Student PIN and certificate file are required' });
    }

    // 2 MB Size check limit safeguard
    if (req.file.size > 2 * 1024 * 1024) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Please compress your PDF to under 2MB and upload' });
    }

    const cert = await OtherCertificate.findById(req.params.certId);
    if (!cert) return res.status(404).json({ message: 'Certificate not found' });

    if (!isCertificateVisible(cert, new Date())) {
      return res.status(403).json({ message: 'This certificate upload window is closed. Please contact the faculty to extend the date.' });
    }

    // Check if already uploaded
    const existing = await OtherCertUpload.findOne({
      certificateId: req.params.certId,
      studentPin
    });
    if (existing && existing.status === 'approved') {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Already approved — cannot re-upload' });
    }
    if (existing && existing.status === 'pending') {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Already uploaded — waiting for verification' });
    }

    // Upload to Cloudinary
    const isPdf = req.file.mimetype === 'application/pdf';
    const uploadOpts = {
      folder: 'CEM_OtherCerts',
      resource_type: isPdf ? 'raw' : 'image',
      public_id: `oc_${studentPin}_${Date.now()}`
    };
    const result = await cloudinary.uploader.upload(req.file.path, uploadOpts);
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    // Save or update upload record
    const record = existing
      ? Object.assign(existing, {
          fileUrl: result.secure_url,
          fileName: req.file.originalname,
          status: 'pending',
          uploadedAt: new Date(),
          reviewedAt: null
        })
      : new OtherCertUpload({
          certificateId:   cert._id,
          certificateName: cert.certificateName,
          studentPin,
          studentName:     studentName || '',
          branch:          branch || cert.branch,
          fileUrl:         result.secure_url,
          fileName:        req.file.originalname
        });

    await record.save();

    // Create notification for Faculty who created this certificate
    try {
      if (cert && cert.facultyId) {
        await Notification.create({
          type: 'certificate',
          title: '📥 New Certificate Uploaded',
          message: `Student ${studentName || 'Student'} (${studentPin}) uploaded certificate "${cert.certificateName}" for verification.`,
          facultyId: String(cert.facultyId),
          pinNumber: null
        });
      }
    } catch (notifErr) {
      console.error('Error creating faculty notification for certificate upload:', notifErr);
    }

    res.json({ message: 'Certificate uploaded successfully. Waiting for faculty verification.' });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Upload failed: ' + err.message });
  }
});

module.exports = router;
