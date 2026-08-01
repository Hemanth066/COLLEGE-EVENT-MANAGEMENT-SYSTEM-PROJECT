require('dotenv').config();
const mongoose = require('mongoose');
const DepartmentHead = require('../models/DepartmentHead');
const Student = require('../models/Student');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/CEM';

function buildYearQuery(yearGroup) {
  if (!yearGroup || yearGroup === '2-3-4' || yearGroup === 'all' || yearGroup === '2,3,4') {
    return { $in: ['1', '2', '3', '4', '1st', '2nd', '3rd', '4th', '1st Year', '2nd Year', '3rd Year', '4th Year', 1, 2, 3, 4] };
  }
  const clean = String(yearGroup).replace(/[^0-9]/g, '');
  if (clean === '1') return { $in: ['1', '1st', '1st Year', 1] };
  if (clean === '2') return { $in: ['2', '2nd', '2nd Year', 2] };
  if (clean === '3') return { $in: ['3', '3rd', '3rd Year', 3] };
  if (clean === '4') return { $in: ['4', '4th', '4th Year', 4] };
  return yearGroup;
}

async function verify() {
  await mongoose.connect(MONGO_URI);

  const dhs = await DepartmentHead.find();
  console.log('Verifying Department Heads & Student queries:');
  for (const dh of dhs) {
    const dept = (dh.department || '').trim();
    const yearQuery = buildYearQuery(dh.year);
    const count = await Student.countDocuments({
      branch: new RegExp('^' + dept + '$', 'i'),
      year: yearQuery
    });
    console.log(`HOD username: ${dh.username.padEnd(10)} | Dept: ${dh.department.padEnd(6)} | Year setting: ${dh.year.padEnd(6)} | Found Students: ${count}`);
  }

  await mongoose.disconnect();
}

verify();
