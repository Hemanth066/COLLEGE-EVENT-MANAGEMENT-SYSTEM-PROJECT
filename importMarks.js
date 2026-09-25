/**
 * importMarks.js
 * --------------
 * Standalone CLI script to bulk update student marks from an Excel file (.xlsx) into MongoDB.
 * Matches existing students by studentId / pinNumber / username.
 *
 * Usage:
 *   node importMarks.js <path-to-excel-file>
 * Example:
 *   node importMarks.js "AIML DATA.xsls.xlsx.xlsx"
 */

require('dotenv').config();
const mongoose = require('mongoose');
const XLSX     = require('xlsx');
const path     = require('path');
const Student  = require('./models/Student');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/CEM';

function normalise(col) {
  const c = col.toLowerCase().replace(/[\s_\-\.]/g, '');
  if (c.includes('studentid') || c.includes('pin') || c.includes('roll') || c.includes('htno') || c === 'id') return 'studentId';
  if (c.includes('1stsem') || c.includes('sem1')) return 'sem1Score';
  if (c.includes('2ndsem') || c.includes('sem2')) return 'sem2Score';
  if (c.includes('3rdsem') || c.includes('sem3')) return 'sem3Score';
  if (c.includes('4thsem') || c.includes('sem4')) return 'sem4Score';
  if (c.includes('score') || c.includes('mark') || c.includes('total')) return 'score';
  return null;
}

async function run() {
  const targetFile = process.argv[2] || 'Students.xslx.xlsx';
  const filePath = path.isAbsolute(targetFile) ? targetFile : path.join(__dirname, targetFile);

  console.log(`📂 Reading file: ${filePath}...`);
  let workbook;
  try {
    workbook = XLSX.readFile(filePath);
  } catch (e) {
    console.error(`❌ Could not read Excel file: ${e.message}`);
    process.exit(1);
  }

  let rows = [];
  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if (raw.length) {
      console.log(`📋 Sheet "${sheetName}": ${raw.length} rows`);
      rows = rows.concat(raw);
    }
  }

  if (!rows.length) {
    console.error('❌ Excel file is empty.');
    process.exit(1);
  }

  const cleanStr = val => (val === undefined || val === null) ? '' : String(val).trim();

  const operations = [];
  let validRows = 0;

  for (const r of rows) {
    let sId = '';
    const setObj = {};

    for (const [col, val] of Object.entries(r)) {
      const field = normalise(col);
      const strVal = cleanStr(val);
      if (!field || strVal === '') continue;

      if (field === 'studentId') {
        sId = strVal.toUpperCase();
      } else if (['sem1Score', 'sem2Score', 'sem3Score', 'sem4Score', 'score'].includes(field)) {
        const num = Number(strVal);
        if (!isNaN(num)) setObj[field] = num;
      }
    }

    if (!sId) continue;

    if (setObj.score === undefined && (setObj.sem1Score !== undefined || setObj.sem2Score !== undefined || setObj.sem3Score !== undefined || setObj.sem4Score !== undefined)) {
      setObj.score = (setObj.sem1Score || 0) + (setObj.sem2Score || 0) + (setObj.sem3Score || 0) + (setObj.sem4Score || 0);
    }

    if (Object.keys(setObj).length === 0) continue;

    operations.push({
      updateOne: {
        filter: {
          $or: [
            { studentId: sId },
            { pinNumber: sId },
            { username: sId }
          ]
        },
        update: { $set: setObj }
      }
    });
    validRows++;
  }

  if (!operations.length) {
    console.error('❌ No valid student ID and marks columns found in the file.');
    process.exit(1);
  }

  console.log(`🔗 Connecting to MongoDB...`);
  await mongoose.connect(MONGO_URI);
  console.log(`✅ Connected to MongoDB.`);

  console.log(`⚡ Updating marks for ${operations.length} rows...`);
  const res = await Student.bulkWrite(operations, { ordered: false });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Marks import complete!`);
  console.log(`   Rows matched & updated: ${res.matchedCount || res.modifiedCount || 0}`);
  console.log(`   Total parsed in sheet : ${validRows}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
