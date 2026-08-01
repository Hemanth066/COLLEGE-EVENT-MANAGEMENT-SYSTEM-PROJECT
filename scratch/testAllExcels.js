const XLSX = require('xlsx');
const path = require('path');

const files = [
  'AIML DATA.xsls.xlsx.xlsx',
  'DS data.xsls.xlsx.xlsx',
  'IT data.xsls.xlsx.xlsx',
  'Students.xsls.xlsx.xlsx'
];

files.forEach(fileName => {
  const filePath = path.join(__dirname, '..', fileName);
  const wb = XLSX.readFile(filePath);
  console.log(`\n================ ${fileName} ================`);
  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    console.log(`Sheet "${sheetName}": ${raw.length} total rows`);
    if (raw.length > 0) {
      console.log('Header row:', raw[0]);
      console.log('Sample row 1:', raw[1]);
      if (raw.length > 2) console.log('Sample row 2:', raw[2]);
    }
  });
});
