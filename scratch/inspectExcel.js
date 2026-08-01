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
  if (!fs.existsSync(filePath)) {
    console.log(`File NOT found: ${fileName}`);
    return;
  }
  console.log(`\n==================================================`);
  console.log(`FILE: ${fileName}`);
  console.log(`==================================================`);
  try {
    const wb = XLSX.readFile(filePath);
    console.log(`Sheet Names:`, wb.SheetNames);
    
    wb.SheetNames.forEach(sheetName => {
      console.log(`\n--- Sheet: "${sheetName}" ---`);
      const ws = wb.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      console.log(`Total raw rows: ${raw.length}`);
      // find top 10 rows to inspect structure
      raw.slice(0, 10).forEach((row, i) => {
        const nonVal = row.filter(c => String(c).trim() !== '');
        if (nonVal.length > 0) {
          console.log(`Row ${i}:`, row.slice(0, 10));
        }
      });
    });
  } catch (e) {
    console.error(`Error reading ${fileName}:`, e.message);
  }
});
