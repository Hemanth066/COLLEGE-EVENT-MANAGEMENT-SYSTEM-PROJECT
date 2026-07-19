require('dotenv').config();
const mongoose = require('mongoose');
const DepartmentHead = require('./models/DepartmentHead');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/CEM';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB Connected ✅');

  // Remove existing dept heads to avoid duplicates
  await DepartmentHead.deleteMany({});

  const branches = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'AIML'];

  const deptHeads = branches.map(branch => ({
    username:   'hod.' + branch.toLowerCase(),
    password:   'hod123',
    fullName:   'HOD of ' + branch,
    email:      'hod.' + branch.toLowerCase() + '@cem.edu.in',
    phone:      '',
    department: branch,
    year:       '2-3-4'   // covers Years 2, 3 & 4
  }));

  await DepartmentHead.insertMany(deptHeads);
  console.log('✅ Created ' + deptHeads.length + ' DepartmentHead accounts:');
  deptHeads.forEach(d => {
    console.log('  username: ' + d.username + ' | dept: ' + d.department + ' | password: hod123');
  });

  process.exit(0);
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
