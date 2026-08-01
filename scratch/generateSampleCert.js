const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const PDFDoc = require('pdfkit');
require('dotenv').config();

const Registration = require('../models/Registration');
const Event = require('../models/Event');
const Faculty = require('../models/Faculty');
const DepartmentHead = require('../models/DepartmentHead');

async function testGenerate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cem');
  console.log('Connected to MongoDB');

  const reg = await Registration.findOne({ attended: true }) || {
    _id: '65b21c70f1a23b0012345678',
    studentName: 'Aratakatla Hemanth Siva Kumar',
    pinNumber: '25B21CS071',
    branch: 'AI&ML'
  };

  const event = {
    title: 'Code Carnival',
    branch: 'AI&ML',
    date: new Date('2026-01-24'),
    faculty: 'Dr. M. Rama Krishna Reddy'
  };

  const certDir = path.join(__dirname, '../public/certificates');
  if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });

  const filepath = path.join(certDir, 'sample_aditya_certificate.pdf');

  // Load certificate builder from route file or require
  const certRoutes = require('../routes/certificateRoutes');

  // Let's create doc and build
  const doc = new PDFDoc({ size: 'A4', layout: 'landscape', margin: 0 });
  const stream = fs.createWriteStream(filepath);
  doc.pipe(stream);

  // Read Faculty & HOD signature if available
  let signaturePath = null;
  let hodSignaturePath = null;
  const faculty = await Faculty.findOne({ signatureUrl: { $exists: true, $ne: null } });
  if (faculty && faculty.signatureUrl) {
    signaturePath = path.join(__dirname, '../public', faculty.signatureUrl);
  }
  const hod = await DepartmentHead.findOne({ signatureUrl: { $exists: true, $ne: null } });
  if (hod && hod.signatureUrl) {
    hodSignaturePath = path.join(__dirname, '../public', hod.signatureUrl);
  }

  // We test generating
  const W = doc.page.width;
  const H = doc.page.height;
  const CX = W / 2;
  const BLUE = '#0A4B94';
  const DARK_BLUE = '#0F4C81';
  const ORANGE = '#E65100';
  const GREEN = '#1E7E34';

  doc.rect(0, 0, W, H).fill('#ffffff');

  // Corner folds
  doc.polygon([0, 0], [105, 0], [0, 105]).fill(BLUE);
  doc.polygon([0, 0], [70, 0], [0, 70]).fill('#003366');
  doc.polygon([W, 0], [W - 105, 0], [W, 105]).fill(BLUE);
  doc.polygon([W, 0], [W - 70, 0], [W, 70]).fill('#003366');
  doc.polygon([0, H], [105, H], [0, H - 105]).fill(BLUE);
  doc.polygon([0, H], [70, H], [0, H - 60]).fill('#003366');
  doc.polygon([W, H], [W - 105, H], [W, H - 105]).fill(BLUE);
  doc.polygon([W, H], [W - 70, H], [W, H - 70]).fill('#003366');

  doc.rect(20, 20, W - 40, H - 40).lineWidth(1.5).strokeColor(BLUE).stroke();

  const logoPath = path.join(__dirname, '../public/images/aditya_logo.jpg');
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

  // Accreditation Badges below Title (Enlarged height 44px)
  if (fs.existsSync(badgesPath)) {
    try {
      doc.image(badgesPath, CX - 145, headerY + 62, { height: 44 });
    } catch(e) { console.error('Badges draw error:', e.message); }
  }

  // Address line under accreditation badges
  doc.fontSize(9.5).font('Helvetica').fillColor('#333333')
     .text('Aditya Nagar, ADB Road, Surampalem-533 437, Kakinada Dist, A.P. India.', 40, headerY + 112, { width: W - 80, align: 'center' });

  // Thin separator line
  doc.moveTo(70, headerY + 128).lineTo(W - 70, headerY + 128).lineWidth(0.5).strokeColor('#cccccc').stroke();

  let y = headerY + 148;
  doc.fontSize(28).font('Times-BoldItalic').fillColor(GREEN).text('Certificate of Participation', 40, y, { width: W - 80, align: 'center' });
  y += 44;
  doc.fontSize(14).font('Helvetica-Bold').fillColor(DARK_BLUE).text('This certificate is presented to', 40, y, { width: W - 80, align: 'center' });
  y += 30;
  doc.fontSize(21).font('Helvetica-Bold').fillColor(ORANGE).text(`${reg.studentName} (${reg.pinNumber})`, 40, y, { width: W - 80, align: 'center' });
  y += 34;
  doc.fontSize(14).font('Helvetica-Bold').fillColor(DARK_BLUE).text('for participating in the event', 40, y, { width: W - 80, align: 'center' });
  y += 30;
  doc.fontSize(20).font('Helvetica-Bold').fillColor(ORANGE).text(event.title, 40, y, { width: W - 80, align: 'center' });
  y += 34;
  doc.fontSize(14).font('Helvetica-Bold').fillColor(DARK_BLUE).text(`Organized by Department of ${event.branch} on`, 40, y, { width: W - 80, align: 'center' });
  y += 28;
  doc.fontSize(16).font('Helvetica-Bold').fillColor(ORANGE).text('24th Jan, 2026.', 40, y, { width: W - 80, align: 'center' });

  const sigY = H - 85;
  const sigW = 200;
  const gap = (W - 80 - sigW * 3) / 2;
  const s1 = 40, s2 = 40 + sigW + gap, s3 = 40 + (sigW + gap) * 2;

  if (signaturePath && fs.existsSync(signaturePath)) {
    try { doc.image(signaturePath, s1 + 25, sigY - 48, { fit: [sigW - 50, 42], align: 'center' }); } catch(e){}
  }
  if (hodSignaturePath && fs.existsSync(hodSignaturePath)) {
    try { doc.image(hodSignaturePath, s3 + 25, sigY - 48, { fit: [sigW - 50, 42], align: 'center' }); } catch(e){}
  }

  doc.fontSize(12).font('Helvetica-Bold').fillColor(DARK_BLUE);
  doc.text('Dr. M. Rama Krishna Reddy', s1, sigY - 12, { width: sigW, align: 'center' });
  doc.text('Mr.M.Subrahmanyam', s2, sigY - 12, { width: sigW, align: 'center' });
  doc.text('Dr.M.Venkatesh', s3, sigY - 12, { width: sigW, align: 'center' });

  doc.fontSize(10).font('Helvetica-Bold').fillColor('#0055A5');
  doc.text('Event Organizer', s1, sigY + 4, { width: sigW, align: 'center' });
  doc.text('Coordinator', s2, sigY + 4, { width: sigW, align: 'center' });
  doc.text('Head of the Department', s3, sigY + 4, { width: sigW, align: 'center' });

  doc.end();

  stream.on('finish', () => {
    console.log('Sample Certificate PDF created successfully at:', filepath);
    process.exit(0);
  });
}

testGenerate().catch(err => {
  console.error('Error generating sample:', err);
  process.exit(1);
});
