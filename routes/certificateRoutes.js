const express  = require('express');
const router   = express.Router();
const PDFDoc   = require('pdfkit');
const path     = require('path');
const fs       = require('fs');
const Registration = require('../models/Registration');
const Event    = require('../models/Event');
const Notification = require('../models/Notification');

// Base URL for serving files — set SERVER_BASE_URL in .env on your Ubuntu server
// e.g. SERVER_BASE_URL=http://65.21.44.100:5000
const BASE_URL = (process.env.SERVER_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

// Upload directory on server disk
const CERT_DIR = path.join(__dirname, '../uploads/certificates');
if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR, { recursive: true });

function buildCertPDF(doc, reg, event, signaturePath, hodSignaturePath, extraInfo = {}) {
  const W = doc.page.width;
  const H = doc.page.height;
  const CX = W / 2;

  const BLUE      = '#0A4B94';
  const DARK_BLUE = '#0F4C81';
  const ORANGE    = '#E65100';
  const GREEN     = '#1E7E34';
  const M         = 40;

  doc.rect(0, 0, W, H).fill('#ffffff');

  doc.polygon([0, 0], [105, 0], [0, 105]).fill(BLUE);
  doc.polygon([0, 0], [70, 0], [0, 70]).fill('#003366');
  doc.polygon([W, 0], [W - 105, 0], [W, 105]).fill(BLUE);
  doc.polygon([W, 0], [W - 70, 0], [W, 70]).fill('#003366');
  doc.polygon([0, H], [105, H], [0, H - 105]).fill(BLUE);
  doc.polygon([0, H], [70, H], [0, H - 70]).fill('#003366');
  doc.polygon([W, H], [W - 105, H], [W, H - 105]).fill(BLUE);
  doc.polygon([W, H], [W - 70, H], [W, H - 70]).fill('#003366');

  doc.rect(20, 20, W - 40, H - 40).lineWidth(1.5).strokeColor(BLUE).stroke();

  const logoPath   = path.join(__dirname, '../public/images/aditya_logo.jpg');
  const badgesPath = path.join(__dirname, '../public/images/accreditation_badges.png');
  let headerY = 18;

  if (fs.existsSync(logoPath)) {
    try { doc.image(logoPath, 65, headerY, { height: 75 }); } catch(e) {}
  }

  doc.fontSize(42).font('Helvetica-Bold');
  const tA = 'ADITYA ', tU = 'UNIVERSITY';
  const wA = doc.widthOfString(tA);
  const wU = doc.widthOfString(tU);
  const titleX = CX - (wA + wU) / 2 + 35;
  doc.fillColor(ORANGE).text(tA, titleX, headerY + 6, { continued: true, lineBreak: false });
  doc.fillColor(BLUE).text(tU, { lineBreak: false });

  if (fs.existsSync(badgesPath)) {
    try { doc.image(badgesPath, CX - 145, headerY + 62, { height: 44 }); } catch(e) {}
  }

  doc.fontSize(9.5).font('Helvetica').fillColor('#333333')
     .text('Aditya Nagar, ADB Road, Surampalem-533 437, Kakinada Dist, A.P. India.', M, headerY + 112, { width: W - M * 2, align: 'center' });
  doc.moveTo(70, headerY + 128).lineTo(W - 70, headerY + 128).lineWidth(0.5).strokeColor('#cccccc').stroke();

  let y = headerY + 148;
  doc.fontSize(28).font('Times-BoldItalic').fillColor(GREEN)
     .text('Certificate of Participation', M, y, { width: W - M * 2, align: 'center' });
  y += 44;

  doc.fontSize(14).font('Helvetica-Bold').fillColor(DARK_BLUE)
     .text('This certificate is presented to', M, y, { width: W - M * 2, align: 'center' });
  y += 30;

  const studentName = reg.studentName || 'Student';
  const pinNum = reg.pinNumber ? `(${reg.pinNumber})` : '';
  doc.fontSize(21).font('Helvetica-Bold').fillColor(ORANGE)
     .text(`${studentName} ${pinNum}`.trim(), M, y, { width: W - M * 2, align: 'center' });
  y += 34;

  doc.fontSize(14).font('Helvetica-Bold').fillColor(DARK_BLUE)
     .text('for participating in the event', M, y, { width: W - M * 2, align: 'center' });
  y += 30;

  doc.fontSize(20).font('Helvetica-Bold').fillColor(ORANGE)
     .text(event.title || 'Event', M, y, { width: W - M * 2, align: 'center' });
  y += 34;

  const branchName = reg.branch || event.branch || 'AI&ML';
  doc.fontSize(14).font('Helvetica-Bold').fillColor(DARK_BLUE)
     .text(`Organized by Department of ${branchName} on`, M, y, { width: W - M * 2, align: 'center' });
  y += 28;

  let dateFormatted = '24th Jan, 2026.';
  if (event.date) {
    try {
      const d = new Date(event.date);
      const day = d.getDate();
      const suffix = (day >= 11 && day <= 13) ? 'th' : (['st','nd','rd'][((day % 10) - 1)] || 'th');
      dateFormatted = `${day}${suffix} ${d.toLocaleDateString('en-US', { month: 'short' })}, ${d.getFullYear()}.`;
    } catch(e) {}
  }
  doc.fontSize(16).font('Helvetica-Bold').fillColor(ORANGE)
     .text(dateFormatted, M, y, { width: W - M * 2, align: 'center' });

  const sigY = H - 85;
  const sigW = 200;
  const gap  = (W - M * 2 - sigW * 3) / 2;
  const s1 = M, s2 = M + sigW + gap, s3 = M + (sigW + gap) * 2;

  const organizerName   = extraInfo.facultyName      || event.faculty  || 'Dr. M. Rama Krishna Reddy';
  const coordinatorName = extraInfo.coordinatorName  || 'Mr.M.Subrahmanyam';
  const hodName         = extraInfo.hodName          || 'Dr.M.Venkatesh';

  if (signaturePath && fs.existsSync(signaturePath)) {
    try { doc.image(signaturePath, s1 + 25, sigY - 48, { fit: [sigW - 50, 42], align: 'center' }); } catch(e) {}
  }
  if (hodSignaturePath && fs.existsSync(hodSignaturePath)) {
    try { doc.image(hodSignaturePath, s3 + 25, sigY - 48, { fit: [sigW - 50, 42], align: 'center' }); } catch(e) {}
  }
  if (extraInfo.coordinatorSigPath && fs.existsSync(extraInfo.coordinatorSigPath)) {
    try { doc.image(extraInfo.coordinatorSigPath, s2 + 25, sigY - 48, { fit: [sigW - 50, 42], align: 'center' }); } catch(e) {}
  }

  doc.fontSize(12).font('Helvetica-Bold').fillColor(DARK_BLUE);
  doc.text(organizerName,   s1, sigY - 12, { width: sigW, align: 'center' });
  doc.text(coordinatorName, s2, sigY - 12, { width: sigW, align: 'center' });
  doc.text(hodName,         s3, sigY - 12, { width: sigW, align: 'center' });

  doc.fontSize(10).font('Helvetica-Bold').fillColor('#0055A5');
  doc.text('Event Organizer',        s1, sigY + 4, { width: sigW, align: 'center' });
  doc.text('Coordinator',            s2, sigY + 4, { width: sigW, align: 'center' });
  doc.text('Head of the Department', s3, sigY + 4, { width: sigW, align: 'center' });
}

async function generateAndSave(reg, event) {
  const filename = `cert_${reg._id}_${Date.now()}.pdf`;
  const filepath = path.join(CERT_DIR, filename);

  const Faculty        = require('../models/Faculty');
  const DepartmentHead = require('../models/DepartmentHead');

  let signaturePath    = null;
  let hodSignaturePath = null;
  let facultyDept      = null;
  let extraInfo = {
    facultyName:      event.faculty || 'Dr. M. Rama Krishna Reddy',
    coordinatorName:  'Mr.M.Subrahmanyam',
    hodName:          'Dr.M.Venkatesh'
  };

  // Fetch faculty info & signature
  try {
    let faculty = null;
    if (event.publishedByFacultyId) {
      faculty =
        await Faculty.findById(event.publishedByFacultyId).catch(() => null) ||
        await Faculty.findOne({ facultyId: event.publishedByFacultyId }).catch(() => null);
    }
    if (!faculty) {
      faculty =
        await Faculty.findOne({ username: event.publishedBy }).catch(() => null) ||
        await Faculty.findOne({ fullName: event.faculty }).catch(() => null);
    }
    if (faculty) {
      facultyDept = faculty.department || faculty.coordinatorBranch;
      if (faculty.fullName)     extraInfo.facultyName = faculty.fullName;
      if (faculty.signatureUrl) signaturePath = path.join(__dirname, '../public', faculty.signatureUrl);
    }
  } catch(e) { console.error(e); }

  // Fetch coordinator signature
  const eventBranch = facultyDept || event.branch || '';
  if (eventBranch) {
    try {
      const coord = await Faculty.findOne({
        isCoordinator: true,
        $or: [
          { coordinatorBranch: new RegExp(`^${eventBranch}$`, 'i') },
          { department:        new RegExp(`^${eventBranch}$`, 'i') }
        ]
      }).catch(() => null);
      if (coord) {
        if (coord.fullName)     extraInfo.coordinatorName   = coord.fullName;
        if (coord.signatureUrl) extraInfo.coordinatorSigPath = path.join(__dirname, '../public', coord.signatureUrl);
      }
    } catch(e) { console.error('Coordinator sig error:', e); }
  }

  // Fetch HOD signature
  try {
    if (facultyDept) {
      const hod = await DepartmentHead.findOne({ department: facultyDept });
      if (hod) {
        if (hod.fullName)     extraInfo.hodName    = hod.fullName;
        if (hod.signatureUrl) hodSignaturePath = path.join(__dirname, '../public', hod.signatureUrl);
      }
    }
  } catch(e) { console.error(e); }

  // Generate PDF to disk
  await new Promise((resolve, reject) => {
    const doc    = new PDFDoc({ size: 'A4', layout: 'landscape', margin: 0 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);
    buildCertPDF(doc, reg, event, signaturePath, hodSignaturePath, extraInfo);
    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  // Return public URL pointing to this server
  const fileUrl = `${BASE_URL}/uploads/certificates/${filename}`;
  return { url: fileUrl, filename };
}

// ── GENERATE SINGLE CERTIFICATE ───────────────────────
router.post('/generate/:registrationId', async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.registrationId);
    if (!reg)          return res.status(404).json({ message: 'Registration not found' });
    if (!reg.attended) return res.status(400).json({ message: 'Student did not attend this event' });

    const event = await Event.findById(reg.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const { url, filename } = await generateAndSave(reg, event);
    reg.certificateUrl                    = url;
    reg.certificateCloudinaryPublicId     = filename; // reused field stores filename
    reg.certificateGeneratedAt            = new Date();
    reg.hasCertificate                    = true;
    await reg.save();

    await Notification.create({
      type: 'certificate', title: '🏅 Certificate Issued',
      message: `Your certificate for "${event.title}" is ready. Download it from My Certificates.`,
      eventId: event._id, eventTitle: event.title, pinNumber: reg.pinNumber
    }).catch(() => {});

    res.json({ message: 'Certificate generated ✅', certificateUrl: url });
  } catch(err) {
    console.error('Certificate generation error:', err);
    res.status(500).json({ message: 'Failed: ' + err.message });
  }
});

// ── GENERATE ALL CERTIFICATES FOR AN EVENT ────────────
router.post('/generate-all/:eventId', async (req, res) => {
  try {
    const regs  = await Registration.find({ eventId: req.params.eventId, attended: true });
    if (!regs.length) return res.status(400).json({ message: 'No attended students for this event' });

    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    let generated = 0;
    for (const reg of regs) {
      try {
        const { url, filename } = await generateAndSave(reg, event);
        reg.certificateUrl                = url;
        reg.certificateCloudinaryPublicId = filename;
        reg.certificateGeneratedAt        = new Date();
        reg.hasCertificate                = true;
        await reg.save();
        await Notification.create({
          type: 'certificate', title: '🏅 Certificate Issued',
          message: `Your certificate for "${event.title}" is ready.`,
          eventId: event._id, eventTitle: event.title, pinNumber: reg.pinNumber
        }).catch(() => {});
        generated++;
      } catch(e) { console.error('Cert error for', reg._id, e.message); }
    }
    res.json({ message: `Generated ${generated}/${regs.length} certificates ✅` });
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

// ── VIEW / LAZY-REGENERATE CERTIFICATE ────────────────
router.get('/view/:registrationId', async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.registrationId);
    if (!reg)          return res.status(404).json({ message: 'Registration record not found' });
    if (!reg.attended) return res.status(400).json({ message: 'Student did not attend this event' });

    const event = await Event.findById(reg.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const SystemSetting = require('../models/SystemSetting');
    let setting = await SystemSetting.findOne({ key: 'certificateRetentionDays' });
    let retentionDays = (setting && setting.value !== undefined && setting.value !== null) ? Number(setting.value) : 30;
    if (isNaN(retentionDays) || retentionDays < 0) retentionDays = 30;

    // Check if current file still exists on disk
    let fileExists = false;
    if (reg.certificateUrl) {
      const storedFilename = path.basename(reg.certificateUrl);
      fileExists = fs.existsSync(path.join(CERT_DIR, storedFilename));
    }

    // Check expiry
    let isExpired = false;
    if (reg.certificateGeneratedAt) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retentionDays);
      if (reg.certificateGeneratedAt < cutoff) isExpired = true;
    }

    if (reg.certificateUrl && fileExists && !isExpired) {
      return res.json({ certificateUrl: reg.certificateUrl, regenerated: false });
    }

    // Regenerate on demand
    const { url, filename } = await generateAndSave(reg, event);
    reg.certificateUrl                = url;
    reg.certificateCloudinaryPublicId = filename;
    reg.certificateGeneratedAt        = new Date();
    reg.hasCertificate                = true;
    await reg.save();

    return res.json({ certificateUrl: url, regenerated: true, message: 'Certificate regenerated on-demand' });
  } catch(err) {
    console.error('Certificate view error:', err);
    res.status(500).json({ message: 'Failed to access certificate: ' + err.message });
  }
});

module.exports = router;
