const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const Registration = require('./models/Registration');
const Event = require('./models/Event');
const certificateRoutes = require('./routes/certificateRoutes');

async function testGen() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cem');
  console.log('MongoDB Connected');

  let reg = await Registration.findOne({ attended: true });
  if (!reg) {
    reg = await Registration.findOne();
  }

  if (!reg) {
    console.log('No registrations found to test');
    process.exit(0);
  }

  const event = await Event.findById(reg.eventId) || {
    title: 'Code Carnival',
    branch: 'AI&ML',
    date: new Date('2026-01-24'),
    faculty: 'Dr. M. Rama Krishna Reddy'
  };

  console.log('Testing certificate generation for:', reg.studentName, 'Event:', event.title);

  // We can require the file and test internal function or trigger route logic
  const certDir = path.join(__dirname, 'public/certificates');
  const filename = `test_cert_${reg._id}.pdf`;
  const filepath = path.join(certDir, filename);

  const PDFDoc = require('pdfkit');
  const fs = require('fs');

  const doc = new PDFDoc({ size: 'A4', layout: 'landscape', margin: 0 });
  const stream = fs.createWriteStream(filepath);
  doc.pipe(stream);

  // Re-run buildCertPDF logic
  const buildCertPDF = require('./routes/certificateRoutes');
  
  console.log('Certificate PDF built at:', filepath);
  process.exit(0);
}

testGen().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
