require('dotenv').config();
const mongoose = require('mongoose');
const DepartmentHead = require('../models/DepartmentHead');
const Hod = require('../models/Hod');
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

async function run() {
  await mongoose.connect(MONGO_URI);

  const depts = ['AIML', 'DS', 'IT', 'CSE'];
  for (const dept of depts) {
    const dh = await DepartmentHead.findOne({ department: dept });
    const hod = await Hod.findOne({ department: dept });

    console.log(`\n================ Department Head: ${dept} ================`);
    if (dh) {
      console.log(`DH ID: ${dh._id}, dept: "${dh.department}", year: "${dh.year}"`);
      // OLD QUERY
      const oldYears = dh.year === '2-3-4' ? ['2','3','4'] : [dh.year];
      const oldStudents = await Student.find({ branch: dh.department, year: { $in: oldYears } });
      console.log(`  OLD QUERY count: ${oldStudents.length}`);

      // NEW QUERY
      const yearQuery = buildYearQuery(dh.year);
      const newStudents = await Student.find({
        branch: new RegExp('^' + dh.department.trim() + '$', 'i'),
        year: yearQuery
      });
      console.log(`  NEW QUERY count: ${newStudents.length}`);
    } else {
      console.log(`No DepartmentHead found for ${dept}`);
    }
  }

  await mongoose.disconnect();
}

run();
