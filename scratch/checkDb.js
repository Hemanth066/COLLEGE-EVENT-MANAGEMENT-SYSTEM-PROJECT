require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('../models/Student');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/CEM';

async function check() {
  await mongoose.connect(MONGO_URI);
  const total = await Student.countDocuments();
  console.log('Total students in DB:', total);
  const branches = await Student.distinct('branch');
  console.log('Branches in DB:');
  for (const b of branches) {
    const c = await Student.countDocuments({ branch: b });
    console.log(`  "${b}": ${c}`);
  }
  await mongoose.disconnect();
}
check();
