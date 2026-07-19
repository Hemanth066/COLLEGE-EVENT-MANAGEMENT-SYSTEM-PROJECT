/**
 * importStudents.js
 * ------------------
 * Reads students.xlsx and bulk-upserts into MongoDB.
 * Email and phone are left empty — students fill those from their profile tab.
 *
 * Usage:
 *   1. npm install xlsx        (one time only)
 *   2. node importStudents.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const XLSX     = require('xlsx');
const path     = require('path');

// ── MongoDB connection ──────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/CEM';

// ── Student Schema (matches models/Student.js) ──────────────────────────────
const studentSchema = new mongoose.Schema({
  studentId:    String,
  username:     String,
  password:     String,
  pinNumber:    String,
  fullName:     String,
  email:        String,
  phone:        String,
  branch:       String,
  section:      String,
  year:         String,
  score:        { type: Number, default: 0 },
  profileImage: { type: String, default: 'https://ui-avatars.com/api/?name=Student&background=fbbf24&color=0a2540&size=200' }
});
const Student = mongoose.model('Student', studentSchema);

// ── Column name normaliser ──────────────────────────────────────────────────
// Maps whatever header is in Excel → our field name
function normalise(col) {
  const c = col.toLowerCase().replace(/[\s_\-\.]/g, '');
  if (c.includes('studentid') || c === 'id')              return 'studentId';
  if (c.includes('username') || c === 'user')             return 'username';
  if (c.includes('password') || c.includes('pass'))       return 'password';
  if (c.includes('pin'))                                  return 'pinNumber';
  if (c.includes('fullname') || c.includes('name'))       return 'fullName';
  if (c.includes('email') || c.includes('mail'))          return 'email';
  if (c.includes('phone') || c.includes('mobile') || c.includes('contact')) return 'phone';
  if (c.includes('branch') || c.includes('dept'))         return 'branch';
  if (c.includes('section') || c.includes('sec'))         return 'section';
  if (c.includes('year') || c.includes('sem'))            return 'year';
  if (c.includes('score') || c.includes('point'))         return 'score';
  return null;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function run() {
  // 1. Read Excel
  const filePath = path.join(__dirname, 'Students.xslx.xlsx');
  let workbook;
  try {
    workbook = XLSX.readFile(filePath);
  } catch (e) {
    console.error('❌ Could not read students.xlsx — make sure the file is in C:\\Users\\heman\\CEM\\');
    process.exit(1);
  }

  // ── Find header row automatically (first row with actual text content) ──
  function getRowsFromSheet(ws) {
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    // Find first row where at least 3 cells are non-empty strings
    let headerIdx = -1;
    for (let i = 0; i < raw.length; i++) {
      const nonEmpty = raw[i].filter(c => String(c).trim() !== '');
      if (nonEmpty.length >= 3) { headerIdx = i; break; }
    }
    if (headerIdx === -1) return [];
    const headers = raw[headerIdx].map(h => String(h).trim());
    const dataRows = [];
    for (let i = headerIdx + 1; i < raw.length; i++) {
      const row = {};
      headers.forEach((h, j) => { if (h) row[h] = raw[i][j] !== undefined ? raw[i][j] : ''; });
      dataRows.push(row);
    }
    return dataRows;
  }

  // Collect rows from ALL sheets
  let rows = [];
  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const sheetRows = getRowsFromSheet(ws);
    if (sheetRows.length) {
      console.log(`📋 Sheet "${sheetName}": ${sheetRows.length} data rows, columns: ${Object.keys(sheetRows[0]).filter(k=>k).join(', ')}`);
      rows = rows.concat(sheetRows);
    }
  }

  if (!rows.length) {
    console.error('❌ Excel sheet is empty.');
    process.exit(1);
  }

  console.log(`\n📄 Total rows across all sheets: ${rows.length}\n`);

  // 2. Map rows → student objects
  const students = rows.map((row, i) => {
    const doc = {};
    for (const [col, val] of Object.entries(row)) {
      const field = normalise(col);
      if (field) doc[field] = String(val).trim();
    }

    // studentId and username default to same value if only one exists
    if (!doc.studentId && doc.username) doc.studentId = doc.username;
    if (!doc.username  && doc.studentId) doc.username  = doc.studentId;

    // pinNumber same as studentId if not provided
    if (!doc.pinNumber) doc.pinNumber = doc.studentId || '';

    // Default password = studentId if not in sheet
    if (!doc.password) doc.password = doc.studentId || 'student123';

    // score as number
    doc.score = doc.score ? Number(doc.score) || 0 : 0;

    // Leave email and phone blank — students fill these in their profile
    doc.email = doc.email || '';
    doc.phone = doc.phone || '';

    return doc;
  }).filter(d => d.studentId); // skip rows with no ID

  if (!students.length) {
    console.error('❌ No valid student rows found (need at least a studentId / username column).');
    process.exit(1);
  }

  // 3. Connect to MongoDB
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected\n');

  // 4. Bulk upsert — update if exists, insert if new
  let inserted = 0, updated = 0, skipped = 0;

  for (const s of students) {
    try {
      const filter = { studentId: s.studentId };

      // Only update email/phone if they were blank in DB (don't overwrite student's own data)
      const setOnInsert = { ...s };
      const setAlways   = {
        fullName: s.fullName,
        branch:   s.branch,
        section:  s.section,
        year:     s.year,
        score:    s.score,
        password: s.password,
        username: s.username,
        pinNumber: s.pinNumber
        // email and phone are NOT in setAlways — students own them
      };

      const result = await Student.findOneAndUpdate(
        filter,
        [
          {
            $set: {
              ...setAlways,
              // Only set email if currently blank in DB
              email: {
                $cond: [
                  { $or: [{ $eq: ['$email', ''] }, { $eq: ['$email', null] }, { $not: ['$email'] }] },
                  s.email || '',
                  '$email'
                ]
              },
              phone: {
                $cond: [
                  { $or: [{ $eq: ['$phone', ''] }, { $eq: ['$phone', null] }, { $not: ['$phone'] }] },
                  s.phone || '',
                  '$phone'
                ]
              }
            }
          }
        ],
        { upsert: true, new: true }
      );

      if (result) {
        // Check if it was an insert or update by comparing timestamps
        const wasNew = result.createdAt ? false : true;
        updated++;
      }
    } catch (e) {
      if (e.code === 11000) {
        skipped++;
      } else {
        console.error(`  ⚠️  Error on row ${s.studentId}:`, e.message);
        skipped++;
      }
    }
  }

  // Simpler count approach
  const finalCount = await Student.countDocuments();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Import complete!`);
  console.log(`   Rows processed : ${students.length}`);
  console.log(`   Total in DB now: ${finalCount}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📌 Note: email & phone left blank for students to fill via Profile tab');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
