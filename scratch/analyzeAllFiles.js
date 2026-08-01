const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const files = [
  'AIML DATA.xsls.xlsx.xlsx',
  'DS data.xsls.xlsx.xlsx',
  'IT data.xsls.xlsx.xlsx',
  'Students.xsls.xlsx.xlsx'
];

files.forEach(fileName => {
  const filePath = path.join(__dirname, '..', fileName);
  if (!fs.existsSync(filePath)) return;
  
  const wb = XLSX.readFile(filePath);
  console.log(`\n========================================`);
  console.log(`FILE: ${fileName}`);
  
  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (raw.length === 0) return;
    
    // Header is usually line 0 or line with studentid
    let headerIdx = raw.findIndex(r => Array.isArray(r) && r.some(c => String(c).toLowerCase().includes('studentid')));
    if (headerIdx === -1) headerIdx = 0;

    const headers = raw[headerIdx].map(h => String(h).trim()).filter(h => h !== '');
    const dataRows = raw.slice(headerIdx + 1).filter(r => String(r[0]).trim() !== '');

    console.log(`Sheet "${sheetName}": header row index ${headerIdx}`);
    console.log(`Headers:`, headers);
    console.log(`Data count: ${dataRows.length}`);
    if (dataRows.length > 0) {
      console.log(`First row:`, dataRows[0].slice(0, 10));
      console.log(`Last row:`, dataRows[dataRows.length - 1].slice(0, 10));
    }
  });
});
