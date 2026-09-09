const express    = require('express');
const router     = express.Router();
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const mongoose   = require('mongoose');
const OtherCertificate = require('../models/OtherCertificate');
const OtherCertUpload  = require('../models/OtherCertUpload');
const Student          = require('../models/Student');
const Notification     = require('../models/Notification');

// Base URL for serving files — set SERVER_BASE_URL in .env on Ubuntu server
// e.g.  SERVER_BASE_URL=http://65.21.44.100:5000
const BASE_URL = (process.env.SERVER_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

// Permanent storage directory for student-uploaded certificates
const OTHER_CERT_DIR = path.join(__dirname, '../uploads/other-certs');
if (!fs.existsSync(OTHER_CERT_DIR)) fs.mkdirSync(OTHER_CERT_DIR, { recursive: true });

// ── Multer: save directly to permanent uploads/other-certs directory ──
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, OTHER_CERT_DIR),
  filename:    (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, `oc_${Date.now()}_${Math.random().toString(36).slice(2,8)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, JPG, JPEG, PNG files are allowed'));
  }
});

// ── Date parser helper ──
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
      const tp = timeValue.trim().match(/^(\d{1,2}):(\d{2})/);
      if (tp) { hours = Number(tp[1]); minutes = Number(tp[2]); }
    }
    return new Date(y, m - 1, d, hours, minutes, 0);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isCertificateVisible(cert) {
  if (!cert || cert.status !== 'active') return false;
  return true;
}

// ──────────────────────────────────────────────────────────
//  FACULTY — CREATE certificate eligibility
// ──────────────────────────────────────────────────────────

router.post('/create', async (req, res) => {
  try {
    const { certificateName, branch, pinStart, pinEnd, marks, description,
            facultyId, facultyName, endDate, endTime } = req.body;
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

    // Notify eligible students
    try {
      const eligibleStudents = await Student.find({ branch: new RegExp(`^${branch}$`, 'i') });
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

      if (notifs.length > 0) await Notification.insertMany(notifs);
      else await Notification.create({
        type: 'certificate',
        title: '📜 New Certificate Opportunity Activated',
        message: `Faculty ${cert.facultyName || ''} activated "${cert.certificateName}" (+${cert.marks} marks) for ${branch} branch.`,
        pinNumber: null
      });
    } catch (notifErr) {
      console.error('Notification error:', notifErr);
    }

    res.json({ message: 'Certificate activated successfully ✅', certificate: cert });
  } catch (err) {
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

router.get('/all', async (req, res) => {
  try {
    res.json(await OtherCertificate.find().sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/faculty/:facultyId', async (req, res) => {
  try {
    const fId = (req.params.facultyId || '').trim();
    let query = {};
    if (fId && fId !== 'all' && fId !== 'undefined' && fId !== 'null') {
      query = { $or: [{ facultyId: fId }, { facultyId: new RegExp(`^${fId}$`, 'i') }] };
    }
    res.json(await OtherCertificate.find(query).sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

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

    try {
      const eligibleStudents = await Student.find({ branch: new RegExp(`^${cert.branch}$`, 'i') });
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
      if (notifs.length > 0) await Notification.insertMany(notifs);
    } catch (notifErr) {
      console.error('Extension notification error:', notifErr);
    }

    res.json({ message: 'Certificate visibility extended successfully ✅', certificate: cert });
  } catch (err) {
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

async function deleteCertHandler(req, res) {
  try {
    const { certId } = req.params;
    let cert = null;
    if (mongoose.Types.ObjectId.isValid(certId)) {
      cert = await OtherCertificate.findByIdAndDelete(certId);
    }
    if (!cert) cert = await OtherCertificate.findOneAndDelete({ _id: certId });
    if (!cert) return res.status(404).json({ message: 'Certificate not found' });

    // Delete associated uploaded files from disk
    const uploads = await OtherCertUpload.find({ certificateId: cert._id });
    for (const u of uploads) {
      if (u.fileName) {
        const filePath = path.join(OTHER_CERT_DIR, u.fileName);
        if (fs.existsSync(filePath)) { try { fs.unlinkSync(filePath); } catch(e) {} }
      }
    }
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

router.get('/uploads/:certId', async (req, res) => {
  try {
    let query = { certificateId: req.params.certId };
    if (['all', 'undefined', 'null'].includes(req.params.certId)) query = {};
    res.json(await OtherCertUpload.find(query).sort({ uploadedAt: -1 }));
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.post('/approve/:uploadId', async (req, res) => {
  try {
    const upload = await OtherCertUpload.findById(req.params.uploadId);
    if (!upload) return res.status(404).json({ message: 'Upload not found' });
    if (upload.status === 'approved') return res.status(400).json({ message: 'Already approved' });

    const cert = await OtherCertificate.findById(upload.certificateId);
    const marks = cert ? cert.marks : 0;

    upload.status       = 'approved';
    upload.marksAwarded = marks;
    upload.reviewedAt   = new Date();
    await upload.save();

    const student = await Student.findOne({ pinNumber: upload.studentPin });
    if (student) { student.eventScore = (student.eventScore || 0) + marks; await student.save(); }

    try {
      await Notification.create({
        type: 'certificate', title: '✅ Other Certificate Approved!',
        message: `Your uploaded certificate for "${upload.certificateName || (cert ? cert.certificateName : 'Certificate')}" has been approved! +${marks} marks added.`,
        pinNumber: upload.studentPin
      });
    } catch(e) {}

    res.json({ message: `Approved ✅ — ${marks} marks added to student's score` });
  } catch (err) {
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

router.post('/reject/:uploadId', async (req, res) => {
  try {
    const upload = await OtherCertUpload.findById(req.params.uploadId);
    if (!upload) return res.status(404).json({ message: 'Upload not found' });
    upload.status = 'rejected'; upload.reviewedAt = new Date(); await upload.save();
    try {
      await Notification.create({
        type: 'certificate', title: '❌ Other Certificate Rejected',
        message: `Your uploaded certificate for "${upload.certificateName || 'Certificate'}" was rejected by faculty.`,
        pinNumber: upload.studentPin
      });
    } catch(e) {}
    res.json({ message: 'Certificate rejected' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────
//  STUDENT — fetch eligible certificates
// ──────────────────────────────────────────────────────────

router.get('/student/:pin/:branch', async (req, res) => {
  try {
    const pin    = (req.params.pin    || '').trim();
    const branch = (req.params.branch || '').trim();

    const studentUploads = await OtherCertUpload.find({ studentPin: new RegExp(`^${pin}$`, 'i') });
    const uploadedCertIds = studentUploads.map(u => u.certificateId);

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
    const eligible = [];
    for (const cert of allCerts) {
      const existing = studentUploads.find(u => u.certificateId.toString() === cert._id.toString());
      if (existing) {
        eligible.push({ cert, existing });
      } else if (isCertificateVisible(cert)) {
        let pinMatch = true;
        if (cert.pinStart && cert.pinEnd && cert.pinStart.trim() && cert.pinEnd.trim()) {
          const s = pin.toUpperCase();
          pinMatch = s >= cert.pinStart.trim().toUpperCase() && s <= cert.pinEnd.trim().toUpperCase();
        }
        if (pinMatch) eligible.push({ cert, existing: null });
      }
    }

    const result = eligible.map(({ cert, existing }) => {
      const certObj = cert.toObject ? cert.toObject() : cert;
      return {
        ...certObj,
        uploadStatus:  existing ? existing.status           : null,
        uploadId:      existing ? existing._id              : null,
        fileUrl:       existing ? existing.fileUrl          : null,
        marksAwarded:  existing ? (existing.marksAwarded || certObj.marks || 0) : 0,
        isExpired:     certObj.endDate ? new Date(certObj.endDate) < now : false
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Error fetching student certificates:', err);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// ── STUDENT — Upload certificate (saved to server disk) ──
router.post('/upload/:certId', (req, res, next) => {
  upload.single('certificate')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE' || (err.message || '').includes('File too large')) {
        return res.status(400).json({ message: 'Please compress your file to under 2MB and upload' });
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

    if (req.file.size > 2 * 1024 * 1024) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Please compress your file to under 2MB and upload' });
    }

    const cert = await OtherCertificate.findById(req.params.certId);
    if (!cert) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Certificate not found' });
    }

    if (!isCertificateVisible(cert)) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'This certificate upload window is closed. Please contact the faculty to extend the date.' });
    }

    const existing = await OtherCertUpload.findOne({ certificateId: req.params.certId, studentPin });
    if (existing && existing.status === 'approved') {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Already approved — cannot re-upload' });
    }
    if (existing && existing.status === 'pending') {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Already uploaded — waiting for verification' });
    }

    // If re-uploading after rejection, delete old file
    if (existing && existing.fileName) {
      const oldPath = path.join(OTHER_CERT_DIR, existing.fileName);
      if (fs.existsSync(oldPath)) { try { fs.unlinkSync(oldPath); } catch(e) {} }
    }

    // File is already saved on disk by multer — build the public URL
    const savedFilename = path.basename(req.file.path);
    const fileUrl = `${BASE_URL}/uploads/other-certs/${savedFilename}`;

    if (existing) {
      existing.fileUrl    = fileUrl;
      existing.fileName   = savedFilename;
      existing.status     = 'pending';
      existing.uploadedAt = new Date();
      existing.reviewedAt = null;
      await existing.save();
    } else {
      await OtherCertUpload.create({
        certificateId:   cert._id,
        certificateName: cert.certificateName,
        studentPin,
        studentName:     studentName || '',
        branch:          branch || cert.branch,
        fileUrl,
        fileName:        savedFilename
      });
    }

    // Notify faculty
    try {
      if (cert.facultyId) {
        await Notification.create({
          type: 'certificate', title: '📥 New Certificate Uploaded',
          message: `Student ${studentName || 'Student'} (${studentPin}) uploaded "${cert.certificateName}" for verification.`,
          facultyId: String(cert.facultyId), pinNumber: null
        });
      }
    } catch(e) {}

    res.json({ message: 'Certificate uploaded successfully. Waiting for faculty verification.' });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Upload failed: ' + err.message });
  }
});

// ── VIEW certificate — return the URL (file is served as static) ──
router.get('/view/:uploadId', async (req, res) => {
  try {
    const upload = await OtherCertUpload.findById(req.params.uploadId);
    if (!upload) return res.status(404).json({ message: 'Certificate upload record not found' });

    const SystemSetting = require('../models/SystemSetting');
    let setting = await SystemSetting.findOne({ key: 'otherCertRetentionDays' });
    let retentionDays = (setting && setting.value != null) ? Number(setting.value) : 30;
    if (isNaN(retentionDays) || retentionDays < 0) retentionDays = 30;

    // Check if file still exists on disk
    const fileOnDisk = upload.fileName
      ? fs.existsSync(path.join(OTHER_CERT_DIR, upload.fileName))
      : false;

    // Check expiry (only for approved certs with reviewedAt set)
    let isExpired = false;
    if (upload.status === 'approved' && upload.reviewedAt) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retentionDays);
      if (upload.reviewedAt < cutoff) isExpired = true;
    }

    if (upload.fileUrl && fileOnDisk && !isExpired) {
      return res.json({ fileUrl: upload.fileUrl, restored: false });
    }

    // File expired or missing
    if (upload.fileUrl && !fileOnDisk) {
      // URL in DB but file deleted — clear it
      upload.fileUrl = null;
      await upload.save();
    }

    return res.status(404).json({ message: 'Certificate file has expired or is no longer available. Please re-upload if needed.' });
  } catch (err) {
    console.error('OtherCert view error:', err);
    res.status(500).json({ message: 'Failed to access certificate: ' + err.message });
  }
});

module.exports = router;
