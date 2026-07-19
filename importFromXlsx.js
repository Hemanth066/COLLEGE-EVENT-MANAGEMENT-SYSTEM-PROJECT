/**
 * importFromXlsx.js
 * Imports students from Students.xslx.xlsx into MongoDB.
 * - Reads "IV SEM" sheet (headers at row 5, data from row 6)
 * - Applies score corrections from "zeros" sheet
 * - Upserts by studentId (preserves existing email/phone if already set)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const XLSX     = require('xlsx');
const path     = require('path');
const Student  = require('./models/Student');

const MONGO_URI  = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/CEM';
const XLSX_FILE  = path.join(__dirname, 'Students.xslx.xlsx');

// Derive a section from studentId e.g. "24B11CS001" → roll 001 → section based on roll range
// The IDs seem to be sequential per branch; we'll derive section (groups of ~60)
function deriveSection(studentId, rollIndex) {
  // Use 1-based index divided into sections of ~60 students
  return String(Math.floor(rollIndex / 60) + 1);
}

async function run() {
  // ── Read Excel ──────────────────────────────────────────────────────────────
  let wb;
  try {
    wb = XLSX.readFile(XLSX_FILE);
  } catch (e) {
    console.error('❌ Cannot read Excel file:', e.message);
    process.exit(1);
  }

  // ── Parse "IV SEM" sheet ────────────────────────────────────────────────────
  const ws   = wb.Sheets[' IV SEM'];
  const raw  = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const headers = raw[5].map(h => String(h).trim()); // row index 5 = header row
  const dataRows = raw.slice(6).filter(r => String(r[0]).trim() !== '');

  console.log('Headers:', headers);
  console.log('Data rows found:', dataRows.length);

  const students = dataRows.map((r, idx) => {
    const obj = {};
    headers.forEach((h, j) => { if (h) obj[h] = String(r[j]).trim(); });

    const studentId = obj['studentID'] || obj['studentId'] || '';
    const fullName  = obj['full name'] || obj['fullName'] || obj['name'] || '';
    const branch    = (obj['branch'] || '').trim();
    const year      = String(obj['year'] || '').trim();
    const score     = Number(obj['score']) || 0;
    const username  = obj['username'] || studentId;
    const password  = obj['password'] || 'student123';
    const email     = obj['email'] || '';
    const phone     = obj['phone'] || '';
    const section   = obj['section'] || obj['Section'] || deriveSection(studentId, idx);
    const pinNumber = obj['pinNumber'] || obj['pin'] || studentId;

    return { studentId, username, password, pinNumber, fullName, email, phone, branch, year, section, score };
  }).filter(s => s.studentId);

  // ── Parse "zeros" sheet (score corrections) ─────────────────────────────────
  const wsZeros = wb.Sheets['zeros'];
  const zeroRows = XLSX.utils.sheet_to_json(wsZeros, { header: 1, defval: '' });
  // Format: [sno, studentId, name, score, faculty]
  const scoreCorrections = {};
  zeroRows.forEach(r => {
    const id    = String(r[1]).trim();
    const score = Number(r[3]) || 0;
    if (id) scoreCorrections[id] = score;
  });
  console.log('Score corrections from zeros sheet:', Object.keys(scoreCorrections).length, 'students');

  // Apply score corrections
  students.forEach(s => {
    if (scoreCorrections.hasOwnProperty(s.studentId)) {
      s.score = scoreCorrections[s.studentId];
    }
  });

  // ── Connect to MongoDB ───────────────────────────────────────────────────────
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB Connected ✅\n');

  // ── Upsert each student ──────────────────────────────────────────────────────
  let inserted = 0, updated = 0, errors = 0;

  for (const s of students) {
    try {
      const existing = await Student.findOne({ studentId: s.studentId });
      if (existing) {
        // Update fields but preserve email/phone if student already filled them
        existing.fullName  = s.fullName  || existing.fullName;
        existing.branch    = s.branch    || existing.branch;
        existing.year      = s.year      || existing.year;
        existing.section   = s.section   || existing.section;
        existing.score     = s.score;
        existing.username  = s.username  || existing.username;
        existing.password  = s.password  || existing.password;
        existing.pinNumber = s.pinNumber || existing.pinNumber;
        if (!existing.email && s.email) existing.email = s.email;
        if (!existing.phone && s.phone) existing.phone = s.phone;
        await existing.save();
        updated++;
      } else {
        await Student.create(s);
        inserted++;
      }
    } catch (e) {
      console.error('Error on', s.studentId, ':', e.message);
      errors++;
    }
  }

  const total = await Student.countDocuments();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Import complete!');
  console.log('   Rows processed :', students.length);
  console.log('   Inserted        :', inserted);
  console.log('   Updated         :', updated);
  console.log('   Errors          :', errors);
  console.log('   Total in DB now :', total);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Show a summary by branch/year
  const branches = await Student.distinct('branch');
  console.log('\n--- Students per Branch ---');
  for (const b of branches.sort()) {
    const count = await Student.countDocuments({ branch: b });
    console.log('  ' + b + ': ' + count);
  }

  process.exit(0);
}

run().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
