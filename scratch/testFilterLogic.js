require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('../models/Student');

function matchBranchValue(studentBranch, selectedBranch) {
  if (!selectedBranch) return true;
  if (!studentBranch) return false;
  return String(studentBranch).trim().toLowerCase() === String(selectedBranch).trim().toLowerCase();
}

function matchYearValue(studentYear, selectedYear) {
  if (!selectedYear) return true;
  if (studentYear === undefined || studentYear === null || studentYear === '') return false;

  const sStr = String(studentYear).trim().toLowerCase();
  const selStr = String(selectedYear).trim().toLowerCase();

  if (sStr === selStr) return true;

  const sDigit = sStr.replace(/[^0-9]/g, '');
  const selDigit = selStr.replace(/[^0-9]/g, '');

  if (sDigit && selDigit && sDigit === selDigit) return true;

  return false;
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/CEM');
  const allStudents = await Student.find().lean();
  console.log(`Total students loaded: ${allStudents.length}`);

  const branches = ['CSE', 'ECE', 'IT', 'AIML', 'DS'];
  const years = ['1', '2', '3', '4'];

  for (const branch of branches) {
    for (const year of years) {
      const filtered = allStudents.filter(s => matchBranchValue(s.branch, branch) && matchYearValue(s.year, year));
      if (filtered.length > 0) {
        console.log(`✅ Branch: ${branch}, Year: ${year} -> ${filtered.length} students found`);
      }
    }
  }

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
