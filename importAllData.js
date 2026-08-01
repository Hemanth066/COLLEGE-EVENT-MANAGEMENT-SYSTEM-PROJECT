/**
 * importAllData.js
 * Imports all student data from Excel files in the project root:
 * - AIML DATA.xsls.xlsx.xlsx
 * - DS data.xsls.xlsx.xlsx
 * - IT data.xsls.xlsx.xlsx
 * - Students.xsls.xlsx.xlsx
 * 
 * Upserts each student into MongoDB under the Student model.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const XLSX     = require('xlsx');
const path     = require('path');
const fs       = require('fs');
const Student  = require('./models/Student');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/CEM';

function cleanString(val) {
  if (val === undefined || val === null) return '';
  return String(val).replace(/\s+/g, ' ').trim();
}

function parseExcelFile(filePath) {
  const fileName = path.basename(filePath);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${fileName}`);
    return [];
  }

  const wb = XLSX.readFile(filePath);
  const students = [];

  // Check if there is a 'zeros' sheet for score corrections
  const scoreCorrections = {};
  if (wb.Sheets['zeros']) {
    const zeroRows = XLSX.utils.sheet_to_json(wb.Sheets['zeros'], { header: 1, defval: '' });
    zeroRows.forEach(r => {
      const id = cleanString(r[1]);
      const score = Number(r[3]);
      if (id && !isNaN(score)) {
        scoreCorrections[id] = score;
      }
    });
    console.log(`  ℹ️  Score corrections found for ${Object.keys(scoreCorrections).length} students in 'zeros' sheet.`);
  }

  wb.SheetNames.forEach(sheetName => {
    if (sheetName === 'zeros') return; // Skip zeros sheet for main records
    const ws = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (raw.length === 0) return;

    let headerIdx = raw.findIndex(r => Array.isArray(r) && r.some(c => String(c).toLowerCase().includes('studentid')));
    if (headerIdx === -1) headerIdx = 0;

    const headers = raw[headerIdx].map(h => cleanString(h).toLowerCase());
    const dataRows = raw.slice(headerIdx + 1);

    let idxInBranch = 0;
    dataRows.forEach(r => {
      const rowObj = {};
      headers.forEach((h, colIdx) => {
        if (h) rowObj[h] = r[colIdx];
      });

      const studentId = cleanString(rowObj['studentid'] || rowObj['student id'] || rowObj['username'] || r[0]);
      if (!studentId || !/^[0-9A-Z]{5,15}$/i.test(studentId)) return;

      const username  = cleanString(rowObj['username']) || studentId;
      const password  = cleanString(rowObj['password']) || 'aditya@123';
      const pinNumber = cleanString(rowObj['pinnumber'] || rowObj['pin']) || studentId;
      const fullName  = cleanString(rowObj['full name'] || rowObj['fullname'] || rowObj['name']);
      const email     = cleanString(rowObj['email']);
      const phone     = cleanString(rowObj['phone'] || rowObj['mobile'] || rowObj['contact']);
      
      let branch = cleanString(rowObj['branch']);
      if (!branch) {
        if (fileName.includes('AIML')) branch = 'AIML';
        else if (fileName.includes('DS')) branch = 'DS';
        else if (fileName.includes('IT')) branch = 'IT';
        else branch = 'CSE';
      }

      let year = cleanString(rowObj['year']);
      if (!year || year === '3') year = '3rd';

      // Score logic: 3rd sem + 4th sem or score column
      let sem3 = Number(rowObj['3rd sem']) || 0;
      let sem4 = Number(rowObj['4th sem']) || 0;
      let score = Number(rowObj['score']);
      if (isNaN(score) || score === 0) {
        score = sem3 + sem4;
      }

      if (scoreCorrections.hasOwnProperty(studentId)) {
        score = scoreCorrections[studentId];
      }

      const section = cleanString(rowObj['section']) || String(Math.floor(idxInBranch / 60) + 1);
      idxInBranch++;

      students.push({
        studentId,
        username,
        password,
        pinNumber,
        fullName,
        email,
        phone,
        branch,
        year,
        section,
        score,
        sem3Score: sem3,
        sem4Score: sem4
      });
    });
  });

  return students;
}

async function run() {
  console.log('🚀 Starting Student Excel Data Import...');
  
  // Find all matching .xlsx files in current directory
  const filesInDir = fs.readdirSync(__dirname);
  const targetFiles = filesInDir.filter(f => 
    f.endsWith('.xlsx') && (
      /aiml/i.test(f) ||
      /\bds\b/i.test(f) ||
      /\bit\b/i.test(f) ||
      /students/i.test(f)
    )
  );

  console.log(`📁 Target Excel files found (${targetFiles.length}):`, targetFiles);

  const allStudentsMap = new Map();

  for (const fileName of targetFiles) {
    const filePath = path.join(__dirname, fileName);
    console.log(`\n📄 Processing file: ${fileName}`);
    const parsed = parseExcelFile(filePath);
    console.log(`   Parsed ${parsed.length} records.`);
    parsed.forEach(st => {
      // Map by studentId to prevent duplicates across files and preserve scores
      if (allStudentsMap.has(st.studentId)) {
        const existing = allStudentsMap.get(st.studentId);
        allStudentsMap.set(st.studentId, {
          ...existing,
          ...st,
          sem3Score: st.sem3Score || existing.sem3Score || 0,
          sem4Score: st.sem4Score || existing.sem4Score || 0,
          score: st.score || existing.score || 0
        });
      } else {
        allStudentsMap.set(st.studentId, st);
      }
    });
  }

  const allStudents = Array.from(allStudentsMap.values());
  console.log(`\n📊 Unique students extracted across all files: ${allStudents.length}`);

  if (allStudents.length === 0) {
    console.log('⚠️ No student data found to import.');
    process.exit(0);
  }

  // Connect to MongoDB
  console.log('\n🔗 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const ops = allStudents.map(s => {
    const updateFields = {
      fullName: s.fullName,
      branch: s.branch,
      year: s.year,
      section: s.section,
      username: s.username,
      password: s.password,
      pinNumber: s.pinNumber
    };
    if (s.score) updateFields.score = s.score;
    if (s.sem3Score) updateFields.sem3Score = s.sem3Score;
    if (s.sem4Score) updateFields.sem4Score = s.sem4Score;
    if (s.email) updateFields.email = s.email;
    if (s.phone) updateFields.phone = s.phone;

    return {
      updateOne: {
        filter: { studentId: s.studentId },
        update: {
          $set: updateFields,
          $setOnInsert: {
            profileImage: 'https://ui-avatars.com/api/?name=Student&background=fbbf24&color=0a2540&size=200',
            eventScore: 0
          }
        },
        upsert: true
      }
    };
  });

  const res = await Student.bulkWrite(ops);
  inserted = res.upsertedCount || 0;
  updated = res.modifiedCount || 0;

  const totalInDb = await Student.countDocuments();
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 IMPORT COMPLETE SUCCESSFUL!');
  console.log(`   Processed Records : ${allStudents.length}`);
  console.log(`   New Inserted      : ${inserted}`);
  console.log(`   Updated           : ${updated}`);
  console.log(`   Total DB Count    : ${totalInDb}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Breakdown by branch
  const branchCounts = {};
  const branches = await Student.distinct('branch');
  console.log('\n📊 Students per Branch in Database:');
  for (const b of branches.sort()) {
    const cnt = await Student.countDocuments({ branch: b });
    console.log(`   ${b.padEnd(8)} : ${cnt}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Fatal error during import:', err);
  process.exit(1);
});
