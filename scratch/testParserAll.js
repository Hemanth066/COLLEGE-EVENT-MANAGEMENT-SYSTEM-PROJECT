const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const files = [
  'AIML DATA.xsls.xlsx.xlsx',
  'DS data.xsls.xlsx.xlsx',
  'IT data.xsls.xlsx.xlsx',
  'Students.xsls.xlsx.xlsx'
];

function cleanString(val) {
  if (val === undefined || val === null) return '';
  return String(val).replace(/\s+/g, ' ').trim();
}

function parseFile(fileName) {
  const filePath = path.join(__dirname, '..', fileName);
  if (!fs.existsSync(filePath)) {
    console.error(`File missing: ${fileName}`);
    return [];
  }
  const wb = XLSX.readFile(filePath);
  const allStudents = [];
  
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
    console.log(`[${fileName}] Score corrections found for ${Object.keys(scoreCorrections).length} students in 'zeros' sheet.`);
  }

  wb.SheetNames.forEach(sheetName => {
    if (sheetName === 'zeros') return; // skip zeros sheet for primary data
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
      if (!studentId || !/^[0-9A-Z]{5,15}$/i.test(studentId)) return; // valid student id check

      const username = cleanString(rowObj['username']) || studentId;
      const password = cleanString(rowObj['password']) || 'aditya@123';
      const pinNumber = cleanString(rowObj['pinnumber'] || rowObj['pin']) || studentId;
      const fullName = cleanString(rowObj['full name'] || rowObj['fullname'] || rowObj['name']);
      const email = cleanString(rowObj['email']);
      const phone = cleanString(rowObj['phone'] || rowObj['mobile'] || rowObj['contact']);
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

      allStudents.push({
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
        score
      });
    });
  });

  return allStudents;
}

let totalParsed = 0;
files.forEach(f => {
  const list = parseFile(f);
  console.log(`File: ${f} -> Parsed ${list.length} valid students`);
  if (list.length > 0) {
    console.log('  Sample 1st:', list[0]);
    console.log('  Sample last:', list[list.length - 1]);
  }
  totalParsed += list.length;
});
console.log(`\nTotal parsed across all files: ${totalParsed}`);
