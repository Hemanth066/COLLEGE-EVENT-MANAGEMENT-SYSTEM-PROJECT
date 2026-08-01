require('dotenv').config();
const mongoose = require('mongoose');
const DepartmentHead = require('../models/DepartmentHead');
const Student = require('../models/Student');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/CEM';

async function checkHODs() {
  await mongoose.connect(MONGO_URI);
  console.log('=== Department Heads ===');
  const hods = await DepartmentHead.find();
  console.log(JSON.stringify(hods, null, 2));

  console.log('\n=== Sample Students per Branch & Year ===');
  const branches = await Student.distinct('branch');
  for (const b of branches) {
    const years = await Student.distinct('year', { branch: b });
    console.log(`Branch "${b}": years =`, years);
  }

  await mongoose.disconnect();
}
checkHODs();
