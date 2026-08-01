require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./models/Student');
const DepartmentHead = require('./models/DepartmentHead');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/CEM');
  console.log('MongoDB Connected ✅\n');

  const total = await Student.countDocuments();
  console.log('Total students in DB:', total);

  const branches = await Student.distinct('branch');
  console.log('Branches:', branches);

  const years = await Student.distinct('year');
  console.log('Years:', years);

  console.log('\n--- Students per Branch ---');
  for (const branch of branches) {
    const count = await Student.countDocuments({ branch });
    console.log('  ' + branch + ': ' + count + ' students');
  }

  console.log('\n--- DepartmentHead accounts ---');
  const dhs = await DepartmentHead.find();
  console.log('Total dept heads:', dhs.length);
  for (const dh of dhs) {
    const dhYears = dh.year === '2-3-4' ? ['2', '3', '4'] : [dh.year];
    const stuCount = await Student.countDocuments({ branch: dh.department, year: { $in: dhYears } });
    console.log('  ' + dh.username + ' (' + dh.department + ', year ' + dh.year + ') => ' + stuCount + ' students');
  }

  console.log('\n✅ All good! Restart your server and try logging in.');
  console.log('Login credentials:');
  console.log('  Username: hod.cse  | Password: hod123  (for CSE dept)');
  console.log('  Username: hod.ece  | Password: hod123  (for ECE dept)');
  console.log('  ... etc for EEE, MECH, CIVIL, IT, DS, AIML');

  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
