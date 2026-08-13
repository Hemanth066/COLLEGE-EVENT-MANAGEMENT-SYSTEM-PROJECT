const express  = require('express');
const router   = express.Router();
const PDFDoc   = require('pdfkit');
const path     = require('path');
const fs       = require('fs');
const Registration = require('../models/Registration');
const Event    = require('../models/Event');
const Notification = require('../models/Notification');
const cloudinary = require('../config/cloudinary');

function buildCertPDF(doc, reg, event, signaturePath, hodSignaturePath, extraInfo = {}) {
  const W = doc.page.width;   // 841.89
  const H = doc.page.height;  // 595.28
  const CX = W / 2;

  const BLUE   = '#0A4B94';
  const DARK_BLUE = '#0F4C81';
  const ORANGE = '#E65100';
  const GREEN  = '#1E7E34';
  const DARK   = '#1E2937';
  const GRAY   = '#555555';
  const M      = 40;

  // 1. Background Paper
  doc.rect(0, 0, W, H).fill('#ffffff');

  // 2. Corner Triangles (matching template design)
  // Top-Left Corner Fold
  doc.polygon([0, 0], [105, 0], [0, 105]).fill(BLUE);
  doc.polygon([0, 0], [70, 0], [0, 70]).fill('#003366');

  // Top-Right Corner Fold
  doc.polygon([W, 0], [W - 105, 0], [W, 105]).fill(BLUE);
  doc.polygon([W, 0], [W - 70, 0], [W, 70]).fill('#003366');

  // Bottom-Left Corner Fold
  doc.polygon([0, H], [105, H], [0, H - 105]).fill(BLUE);
  doc.polygon([0, H], [70, H], [0, H - 70]).fill('#003366');

  // Bottom-Right Corner Fold
  doc.polygon([W, H], [W - 105, H], [W, H - 105]).fill(BLUE);
  doc.polygon([W, H], [W - 70, H], [W, H - 70]).fill('#003366');

  // Outer framing border
  doc.rect(20, 20, W - 40, H - 40).lineWidth(1.5).strokeColor(BLUE).stroke();

  // 3. Header Section: Logos, Big Title & Accreditation Badges Below
  const logoPath   = path.join(__dirname, '../public/images/aditya_logo.jpg');
  const badgesPath = path.join(__dirname, '../public/images/accreditation_badges.png');

  let headerY = 18;

  // Draw Large Logo on Top Left
  if (fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, 65, headerY, { height: 75 });
    } catch(e) { console.error('Logo draw error:', e.message); }
  }

  // Big Title: ADITYA UNIVERSITY (42pt font)
  doc.fontSize(42).font('Helvetica-Bold');
  const tA = 'ADITYA ', tU = 'UNIVERSITY';
  const wA = doc.widthOfString(tA);
  const wU = doc.widthOfString(tU);
  const titleX = CX - (wA + wU) / 2 + 35;

  doc.fillColor(ORANGE).text(tA, titleX, headerY + 6, { continued: true, lineBreak: false });
  doc.fillColor(BLUE).text(tU, { lineBreak: false });

  // Accreditation Badges below Title (Enlarged 44px height)
  if (fs.existsSync(badgesPath)) {
    try {
      doc.image(badgesPath, CX - 145, headerY + 62, { height: 44 });
    } catch(e) { console.error('Badges draw error:', e.message); }
  }

  // Address line under accreditation badges
  doc.fontSize(9.5).font('Helvetica').fillColor('#333333')
     .text('Aditya Nagar, ADB Road, Surampalem-533 437, Kakinada Dist, A.P. India.', M, headerY + 112, { width: W - M * 2, align: 'center' });

  // Thin separator line
  doc.moveTo(70, headerY + 128).lineTo(W - 70, headerY + 128).lineWidth(0.5).strokeColor('#cccccc').stroke();

  // 4. Body Content
  let y = headerY + 148;

  // Title: Certificate of Participation (Cursive script style)
  doc.fontSize(28).font('Times-BoldItalic').fillColor(GREEN)
     .text('Certificate of Participation', M, y, { width: W - M * 2, align: 'center' });
  y += 44;

  // Presented to line
  doc.fontSize(14).font('Helvetica-Bold').fillColor(DARK_BLUE)
     .text('This certificate is presented to', M, y, { width: W - M * 2, align: 'center' });
  y += 30;

  // Student Name (PIN)
  const studentName = reg.studentName || 'Student';
  const pinNum = reg.pinNumber ? `(${reg.pinNumber})` : '';
  const fullStudentStr = `${studentName} ${pinNum}`.trim();
  doc.fontSize(21).font('Helvetica-Bold').fillColor(ORANGE)
     .text(fullStudentStr, M, y, { width: W - M * 2, align: 'center' });
  y += 34;

  // Event statement
  doc.fontSize(14).font('Helvetica-Bold').fillColor(DARK_BLUE)
     .text('for participating in the event', M, y, { width: W - M * 2, align: 'center' });
  y += 30;

  // Event Title
  doc.fontSize(20).font('Helvetica-Bold').fillColor(ORANGE)
     .text(event.title || 'Event', M, y, { width: W - M * 2, align: 'center' });
  y += 34;

  // Department & Date line
  const branchName = reg.branch || event.branch || 'AI&ML';
  const deptStr = `Organized by Department of ${branchName} on`;
  doc.fontSize(14).font('Helvetica-Bold').fillColor(DARK_BLUE)
     .text(deptStr, M, y, { width: W - M * 2, align: 'center' });
  y += 28;

  // Date
  let dateFormatted = '24th Jan, 2026.';
  if (event.date) {
    try {
      const d = new Date(event.date);
      const day = d.getDate();
      const suffix = (day >= 11 && day <= 13) ? 'th' : ['st','nd','rd'][((day % 10) - 1)] || 'th';
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const year = d.getFullYear();
      dateFormatted = `${day}${suffix} ${month}, ${year}.`;
    } catch(e) {}
  }
  doc.fontSize(16).font('Helvetica-Bold').fillColor(ORANGE)
     .text(dateFormatted, M, y, { width: W - M * 2, align: 'center' });

  // 5. Signatures Section (3 Columns at bottom)
  const sigY = H - 85;
  const sigW = 200;
  const gap  = (W - M * 2 - sigW * 3) / 2;
  const s1 = M, s2 = M + sigW + gap, s3 = M + (sigW + gap) * 2;

  const organizerName   = extraInfo.facultyName || event.faculty || 'Dr. M. Rama Krishna Reddy';
  const coordinatorName = extraInfo.coordinatorName || 'Mr.M.Subrahmanyam';
  const hodName         = extraInfo.hodName || 'Dr.M.Venkatesh';

  // Draw Faculty / Organizer Signature if exists
  if (signaturePath && fs.existsSync(signaturePath)) {
    try {
      doc.image(signaturePath, s1 + 25, sigY - 48, { fit: [sigW - 50, 42], align: 'center' });
    } catch(e) { console.error('Organizer sig draw error:', e.message); }
  }

  // Draw HOD Signature if exists
  if (hodSignaturePath && fs.existsSync(hodSignaturePath)) {
    try {
      doc.image(hodSignaturePath, s3 + 25, sigY - 48, { fit: [sigW - 50, 42], align: 'center' });
    } catch(e) { console.error('HOD sig draw error:', e.message); }
  }

  // Draw Coordinator Signature if exists in extraInfo
  if (extraInfo.coordinatorSigPath && fs.existsSync(extraInfo.coordinatorSigPath)) {
    try {
      doc.image(extraInfo.coordinatorSigPath, s2 + 25, sigY - 48, { fit: [sigW - 50, 42], align: 'center' });
    } catch(e) {}
  }

  // Names above roles
  doc.fontSize(12).font('Helvetica-Bold').fillColor(DARK_BLUE);
  doc.text(organizerName, s1, sigY - 12, { width: sigW, align: 'center' });
  doc.text(coordinatorName, s2, sigY - 12, { width: sigW, align: 'center' });
  doc.text(hodName, s3, sigY - 12, { width: sigW, align: 'center' });

  // Role Subtitles
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#0055A5');
  doc.text('Event Organizer', s1, sigY + 4, { width: sigW, align: 'center' });
  doc.text('Coordinator',     s2, sigY + 4, { width: sigW, align: 'center' });
  doc.text('Head of the Department', s3, sigY + 4, { width: sigW, align: 'center' });
}

async function generateAndSave(reg, event) {
  const certDir = path.join(__dirname, '../public/certificates');

  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  const filename = `cert_${reg._id}_${Date.now()}.pdf`;
  const filepath = path.join(certDir, filename);

  // Fetch faculty signature & HOD signature
  const Faculty = require('../models/Faculty');
  const DepartmentHead = require('../models/DepartmentHead');

  let signaturePath = null;
  let hodSignaturePath = null;
  let facultyDept = null;
  let extraInfo = {
    facultyName: event.faculty || 'Dr. M. Rama Krishna Reddy',
    coordinatorName: 'Mr.M.Subrahmanyam',
    hodName: 'Dr.M.Venkatesh'
  };

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
      if (faculty.fullName) extraInfo.facultyName = faculty.fullName;
      if (faculty.signatureUrl) {
        signaturePath = path.join(__dirname, "../public", faculty.signatureUrl);
      }
    }
  } catch (e) {
    console.error(e);
  }

  // Fetch Event Branch Coordinator (e.g. CSE Coordinator for CSE events)
  const eventBranch = facultyDept || event.branch || '';
  if (eventBranch) {
    try {
      const coordinatorObj = await Faculty.findOne({
        isCoordinator: true,
        $or: [
          { coordinatorBranch: new RegExp(`^${eventBranch}$`, 'i') },
          { department: new RegExp(`^${eventBranch}$`, 'i') }
        ]
      }).catch(() => null);

      if (coordinatorObj) {
        if (coordinatorObj.fullName) extraInfo.coordinatorName = coordinatorObj.fullName;
        if (coordinatorObj.signatureUrl) {
          extraInfo.coordinatorSigPath = path.join(__dirname, "../public", coordinatorObj.signatureUrl);
        }
      }
    } catch (e) {
      console.error('Error fetching coordinator signature:', e);
    }
  }

  try {
    if (facultyDept) {
      const hod = await DepartmentHead.findOne({
        department: facultyDept,
      });

      if (hod) {
        if (hod.fullName) extraInfo.hodName = hod.fullName;
        if (hod.signatureUrl) {
          hodSignaturePath = path.join(
            __dirname,
            "../public",
            hod.signatureUrl
          );
        }
      }
    }
  } catch (e) {
    console.error(e);
  }

  // Generate PDF
  await new Promise((resolve, reject) => {
    const doc = new PDFDoc({
      size: "A4",
      layout: "landscape",
      margin: 0,
    });

    const stream = fs.createWriteStream(filepath);

    doc.pipe(stream);

    buildCertPDF(
      doc,
      reg,
      event,
      signaturePath,
      hodSignaturePath,
      extraInfo
    );

    doc.end();

    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  // Upload PDF to Cloudinary
 // Upload PDF to Cloudinary
const result = await cloudinary.uploader.upload(filepath, {
  resource_type: "raw",
  folder: "CEM_Certificates",
  public_id: filename.replace(".pdf", ""),
  use_filename: true,
  unique_filename: false,
});

// Create a downloadable PDF URL
const certUrl = cloudinary.url(result.public_id + ".pdf", {
  resource_type: "raw",
  secure: true,
  flags: "attachment"
});

  // Delete local file
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }

  // Return Cloudinary URL and public ID
  return { url: result.secure_url, publicId: result.public_id };
}

router.post('/generate/:registrationId', async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.registrationId);
    if (!reg)          return res.status(404).json({ message:'Registration not found' });
    if (!reg.attended) return res.status(400).json({ message:'Student did not attend this event' });
    const event = await Event.findById(reg.eventId);
    if (!event) return res.status(404).json({ message:'Event not found' });
    const { url, publicId } = await generateAndSave(reg, event);
    reg.certificateUrl = url;
    reg.certificateCloudinaryPublicId = publicId;
    reg.certificateGeneratedAt = new Date();
    reg.hasCertificate = true;
    await reg.save();
    await Notification.create({
      type:'certificate', title:'🏅 Certificate Issued',
      message:`Your certificate for "${event.title}" is ready. Download it from My Certificates.`,
      eventId:event._id, eventTitle:event.title, pinNumber:reg.pinNumber
    }).catch(()=>{});
    res.json({ message:'Certificate generated ✅', certificateUrl:url });
  } catch(err) {
    console.error('Certificate generation error:', err);
    res.status(500).json({ message:'Failed: ' + err.message });
  }
});

router.post('/generate-all/:eventId', async (req, res) => {
  try {
    const regs = await Registration.find({ eventId:req.params.eventId, attended:true });
    if (!regs.length) return res.status(400).json({ message:'No attended students for this event' });
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message:'Event not found' });
    let generated = 0;
    for (const reg of regs) {
      try {
        const { url, publicId } = await generateAndSave(reg, event);
        reg.certificateUrl = url;
        reg.certificateCloudinaryPublicId = publicId;
        reg.certificateGeneratedAt = new Date();
        reg.hasCertificate = true;
        await reg.save();
        await Notification.create({
          type:'certificate', title:'🏅 Certificate Issued',
          message:`Your certificate for "${event.title}" is ready.`,
          eventId:event._id, eventTitle:event.title, pinNumber:reg.pinNumber
        }).catch(()=>{});
        generated++;
      } catch(e) { console.error('Cert error for', reg._id, e.message); }
    }
    res.json({ message:`Generated ${generated}/${regs.length} certificates ✅` });
  } catch(err) {
    res.status(500).json({ message:err.message });
  }
});

// GET /api/certificates/view/:registrationId — View or lazily regenerate certificate
router.get('/view/:registrationId', async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.registrationId);
    if (!reg) return res.status(404).json({ message: 'Registration record not found' });
    if (!reg.attended) return res.status(400).json({ message: 'Student did not attend this event' });

    const event = await Event.findById(reg.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const SystemSetting = require('../models/SystemSetting');
    let setting = await SystemSetting.findOne({ key: 'certificateRetentionDays' });
    let retentionDays = (setting && setting.value !== undefined && setting.value !== null) ? Number(setting.value) : 30;
    if (isNaN(retentionDays) || retentionDays < 0) retentionDays = 30;

    let isExpired = false;
    if (reg.certificateGeneratedAt) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retentionDays);
      if (reg.certificateGeneratedAt < cutoff) {
        isExpired = true;
      }
    }

    if (reg.certificateUrl && !isExpired) {
      return res.json({ certificateUrl: reg.certificateUrl, regenerated: false });
    }

    // Lazy regeneration on-demand!
    const { url, publicId } = await generateAndSave(reg, event);
    reg.certificateUrl = url;
    reg.certificateCloudinaryPublicId = publicId;
    reg.certificateGeneratedAt = new Date();
    reg.hasCertificate = true;
    await reg.save();

    return res.json({ certificateUrl: url, regenerated: true, message: 'Certificate regenerated on-demand' });
  } catch (err) {
    console.error('Certificate view error:', err);
    res.status(500).json({ message: 'Failed to access certificate: ' + err.message });
  }
});

module.exports = router;
