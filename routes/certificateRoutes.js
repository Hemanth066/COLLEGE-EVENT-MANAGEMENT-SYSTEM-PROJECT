const express  = require('express');
const router   = express.Router();
const PDFDoc   = require('pdfkit');
const path     = require('path');
const fs       = require('fs');
const Registration = require('../models/Registration');
const Event    = require('../models/Event');
const Notification = require('../models/Notification');

function buildCertPDF(doc, reg, event, signaturePath, hodSignaturePath) {
  const W = doc.page.width;
  const H = doc.page.height;
  const CX = W / 2;
  const BLUE = '#1a3a8f', ORANGE = '#e07b2a', GREEN = '#2e7d32', DARK = '#1a2a4a', GRAY = '#555555';
  const M = 38;

  // White background for certificate paper
  doc.rect(0, 0, W, H).fill('#ffffff');
  
  // Decorative border around certificate
  doc.rect(10, 10, W-20, H-20).lineWidth(7).strokeColor(BLUE).stroke();
  doc.rect(19, 19, W-38, H-38).lineWidth(1.5).strokeColor(BLUE).stroke();
  
  // Corner decorations
  const cs = 24;
  [[10,10],[W-10-cs,10],[10,H-10-cs],[W-10-cs,H-10-cs]].forEach(([x,y]) => doc.rect(x,y,cs,cs).fill(BLUE));

  // Header with university branding
  doc.fontSize(30).font('Helvetica-Bold');
  const tA = 'ADITYA ', tU = 'UNIVERSITY';
  const wA = doc.widthOfString(tA), wU = doc.widthOfString(tU);
  const hdrX = CX - (wA + wU) / 2;
  doc.fillColor(ORANGE).text(tA, hdrX, 32, { continued:true, lineBreak:false });
  doc.fillColor(BLUE).text(tU, { lineBreak:false });

  doc.fontSize(9).font('Helvetica').fillColor(GRAY)
     .text('Aditya Nagar, ADB Road, Surampalem-533 437, Kakinada Dist, A.P. India.', M, 68, { width:W-M*2, align:'center' });

  doc.moveTo(M+20, 82).lineTo(W-M-20, 82).lineWidth(0.7).strokeColor('#bbbbbb').stroke();

  // Body — vertically centered between y=82 and y=H-100
  let y = 188;
  const lh = n => { y += n; };

  doc.fontSize(22).font('Helvetica-Oblique').fillColor(GREEN)
     .text('Certificate of Participation', M, y, { width:W-M*2, align:'center' });
  lh(34);

  doc.fontSize(13).font('Helvetica').fillColor(DARK)
     .text('This certificate is presented to', M, y, { width:W-M*2, align:'center' });
  lh(24);

  const studentLine = `${reg.studentName || 'Student'} (${reg.pinNumber || '—'})`;
  doc.fontSize(20).font('Helvetica-Bold').fillColor(ORANGE)
     .text(studentLine, M, y, { width:W-M*2, align:'center' });
  lh(32);

  doc.fontSize(13).font('Helvetica').fillColor(DARK)
     .text('for participating in the event', M, y, { width:W-M*2, align:'center' });
  lh(22);

  doc.fontSize(18).font('Helvetica-Bold').fillColor(BLUE)
     .text((event.title || 'Event').toUpperCase(), M, y, { width:W-M*2, align:'center' });
  lh(30);

  const dept = reg.branch ? `Department of ${reg.branch}` : 'the Department';
  const dateStr = event.date
    ? new Date(event.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
    : '—';

  doc.fontSize(13).font('Helvetica');
  const wPre = doc.widthOfString('Organized by ');
  doc.font('Helvetica-Bold');
  const wMid = doc.widthOfString(dept + ' on');
  const orgX = CX - (wPre + wMid) / 2;
  doc.fontSize(13).font('Helvetica').fillColor(DARK).text('Organized by ', orgX, y, { continued:true, lineBreak:false });
  doc.font('Helvetica-Bold').fillColor(ORANGE).text(dept + ' on', { lineBreak:false });
  lh(22);

  doc.fontSize(15).font('Helvetica-Bold').fillColor(BLUE)
     .text(dateStr + '.', M, y, { width:W-M*2, align:'center' });

  // Signatures section with improved layout
  const sigY = H - 100;
  const sigW = 160;
  const gap  = (W - M*2 - sigW*3) / 2;
  const s1 = M, s2 = M + sigW + gap, s3 = M + (sigW + gap) * 2;

  // Draw faculty signature image above the first line
  if (signaturePath && fs.existsSync(signaturePath)) {
    try {
      // Improved signature positioning and sizing
      doc.image(signaturePath, s1 + 5, sigY - 54, { fit: [sigW - 10, 50], align: 'center' });
    } catch(e) { 
      console.error('[Cert] Faculty sig draw error:', e.message); 
      // Draw placeholder if signature fails
      doc.rect(s1 + 5, sigY - 54, sigW - 10, 50).fill('#f0f0f0').stroke();
      doc.fontSize(8).fillColor(GRAY).text('Signature Not Found', s1 + 10, sigY - 45);
    }
  } else {
    // Draw placeholder if no signature
    doc.rect(s1 + 5, sigY - 54, sigW - 10, 50).fill('#f0f0f0').stroke();
    doc.fontSize(8).fillColor(GRAY).text('Signature Not Found', s1 + 10, sigY - 45);
  }

  // Draw HOD signature image above the third line
  if (hodSignaturePath && fs.existsSync(hodSignaturePath)) {
    try {
      doc.image(hodSignaturePath, s3 + 5, sigY - 54, { fit: [sigW - 10, 50], align: 'center' });
    } catch(e) { 
      console.error('[Cert] HOD sig draw error:', e.message); 
      // Draw placeholder if signature fails
      doc.rect(s3 + 5, sigY - 54, sigW - 10, 50).fill('#f0f0f0').stroke();
      doc.fontSize(8).fillColor(GRAY).text('Signature Not Found', s3 + 10, sigY - 45);
    }
  } else {
    // Draw placeholder if no signature
    doc.rect(s3 + 5, sigY - 54, sigW - 10, 50).fill('#f0f0f0').stroke();
    doc.fontSize(8).fillColor(GRAY).text('Signature Not Found', s3 + 10, sigY - 45);
  }

  // Signature lines
  [s1, s2, s3].forEach(x => doc.moveTo(x, sigY).lineTo(x+sigW, sigY).lineWidth(0.8).strokeColor('#444').stroke());

  doc.fontSize(11).font('Helvetica-Bold').fillColor(DARK);
  doc.text(event.faculty || 'Faculty', s1, sigY+5, { width:sigW, align:'center' });
  doc.text('Coordinator',              s2, sigY+5, { width:sigW, align:'center' });
  doc.text('Head of the Department',   s3, sigY+5, { width:sigW, align:'center' });

  doc.fontSize(9).font('Helvetica').fillColor(GRAY);
  doc.text('Event Organiser', s1, sigY+20, { width:sigW, align:'center' });
  doc.text('Coordinator',     s2, sigY+20, { width:sigW, align:'center' });
  doc.text('HOD',             s3, sigY+20, { width:sigW, align:'center' });

  doc.fontSize(7.5).font('Helvetica').fillColor('#aaaaaa')
     .text(`Certificate ID: CEM-${reg._id.toString().slice(-8).toUpperCase()}   |   Issued: ${new Date().toLocaleDateString('en-IN')}`,
           M, H-26, { width:W-M*2, align:'center' });
}

async function generateAndSave(reg, event) {
  const certDir = path.join(__dirname, '../public/certificates');
  if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive:true });
  const filename = `cert_${reg._id}_${Date.now()}.pdf`;
  const filepath = path.join(certDir, filename);
  const certUrl  = `/certificates/${filename}`;
  if (reg.certificateUrl) {
    const old = path.join(__dirname, '../public', reg.certificateUrl);
    if (fs.existsSync(old)) try { fs.unlinkSync(old); } catch(e){}
  }

  // Fetch faculty signature using publishedByFacultyId (most reliable)
  const Faculty        = require('../models/Faculty');
  const DepartmentHead = require('../models/DepartmentHead');
  let signaturePath    = null;
  let hodSignaturePath = null;
  let facultyDept      = null;

  try {
    // Look up faculty by ID first, then fallback to name fields
    let faculty = null;
    if (event.publishedByFacultyId) {
      faculty = await Faculty.findById(event.publishedByFacultyId).catch(() => null)
             || await Faculty.findOne({ facultyId: event.publishedByFacultyId }).catch(() => null);
    }
    if (!faculty) {
      faculty = await Faculty.findOne({ username: event.publishedBy }).catch(() => null)
             || await Faculty.findOne({ fullName: event.faculty }).catch(() => null);
    }
    if (faculty) {
      facultyDept = faculty.department;
      if (faculty.signatureUrl) {
        signaturePath = path.join(__dirname, '../public', faculty.signatureUrl);
        console.log('[Cert] Faculty signature path:', signaturePath, '| exists:', fs.existsSync(signaturePath));
      } else {
        console.log('[Cert] Faculty found but no signatureUrl:', faculty.username);
      }
    } else {
      console.log('[Cert] Faculty not found for event:', event.title);
    }
  } catch(e) { console.error('[Cert] Faculty lookup error:', e.message); }

  try {
    // Find DepartmentHead by faculty's department
    if (facultyDept) {
      const dh = await DepartmentHead.findOne({ department: facultyDept }).catch(() => null);
      if (dh && dh.signatureUrl) {
        hodSignaturePath = path.join(__dirname, '../public', dh.signatureUrl);
        console.log('[Cert] HOD signature path:', hodSignaturePath, '| exists:', fs.existsSync(hodSignaturePath));
      } else {
        console.log('[Cert] HOD not found or no signature for dept:', facultyDept);
      }
    }
  } catch(e) { console.error('[Cert] HOD lookup error:', e.message); }

  // Enhanced error handling for signature paths
  if (signaturePath && !fs.existsSync(signaturePath)) {
    console.warn('[Cert] Faculty signature file does not exist:', signaturePath);
    signaturePath = null;
  }
  
  if (hodSignaturePath && !fs.existsSync(hodSignaturePath)) {
    console.warn('[Cert] HOD signature file does not exist:', hodSignaturePath);
    hodSignaturePath = null;
  }

  await new Promise((resolve, reject) => {
    const doc = new PDFDoc({ size:'A4', layout:'landscape', margin:0 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);
    buildCertPDF(doc, reg, event, signaturePath, hodSignaturePath);
    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
  return certUrl;
}

router.post('/generate/:registrationId', async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.registrationId);
    if (!reg)          return res.status(404).json({ message:'Registration not found' });
    if (!reg.attended) return res.status(400).json({ message:'Student did not attend this event' });
    const event = await Event.findById(reg.eventId);
    if (!event) return res.status(404).json({ message:'Event not found' });
    const certUrl = await generateAndSave(reg, event);
    reg.certificateUrl = certUrl;
    await reg.save();
    await Notification.create({
      type:'certificate', title:'🏅 Certificate Issued',
      message:`Your certificate for "${event.title}" is ready. Download it from My Certificates.`,
      eventId:event._id, eventTitle:event.title, pinNumber:reg.pinNumber
    }).catch(()=>{});
    res.json({ message:'Certificate generated ✅', certificateUrl:certUrl });
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
        const certUrl = await generateAndSave(reg, event);
        reg.certificateUrl = certUrl;
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

module.exports = router;
