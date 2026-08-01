require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('../models/Student');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/CEM';

async function checkYears() {
  await mongoose.connect(MONGO_URI);
  const yearsInDb = await Student.distinct('year');
  console.log('Unique years in Student collection:', yearsInDb);
  
  for (const y of yearsInDb) {
    const count = await Student.countDocuments({ year: y });
    console.log(`  year "${y}": ${count} students`);
  }
  await mongoose.disconnect();
}
checkYears();
