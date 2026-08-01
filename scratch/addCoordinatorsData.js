require('dotenv').config();
const mongoose = require('mongoose');
const Faculty = require('../models/Faculty');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/CEM';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected ✅');

    // 1. Assign DR RAMESH as CSE Coordinator
    let ramesh = await Faculty.findOne({ fullName: /RAMESH/i }) || await Faculty.findOne({ department: 'CSE' });
    if (ramesh) {
      ramesh.isCoordinator = true;
      ramesh.coordinatorBranch = 'CSE';
      await ramesh.save();
      console.log(`✅ Assigned ${ramesh.fullName || ramesh.username} as CSE Coordinator`);
    }

    // 2. Assign DR kumar as ECE Coordinator
    let kumar = await Faculty.findOne({ fullName: /kumar/i }) || await Faculty.findOne({ department: 'ECE' });
    if (kumar) {
      kumar.isCoordinator = true;
      kumar.coordinatorBranch = 'ECE';
      await kumar.save();
      console.log(`✅ Assigned ${kumar.fullName || kumar.username} as ECE Coordinator`);
    }

    // 3. Ensure Coordinators exist for other branches
    const branchConfigs = [
      { branch: 'EEE', name: 'Dr. S. Venkatesh', username: 'coord_eee', password: 'faculty123', dept: 'EEE' },
      { branch: 'MECH', name: 'Dr. K. Srinivas', username: 'coord_mech', password: 'faculty123', dept: 'MECH' },
      { branch: 'CIVIL', name: 'Dr. P. Rajesh', username: 'coord_civil', password: 'faculty123', dept: 'CIVIL' },
      { branch: 'IT', name: 'Dr. M. Suresh', username: 'coord_it', password: 'faculty123', dept: 'IT' },
      { branch: 'DS', name: 'Dr. N. Anita', username: 'coord_ds', password: 'faculty123', dept: 'DS' },
      { branch: 'AIML', name: 'Dr. G. Harish', username: 'coord_aiml', password: 'faculty123', dept: 'AIML' }
    ];

    for (const config of branchConfigs) {
      let f = await Faculty.findOne({ coordinatorBranch: config.branch });
      if (!f) {
        f = await Faculty.findOne({ username: config.username });
        if (!f) {
          f = new Faculty({
            username: config.username,
            password: config.password,
            fullName: config.name,
            email: `${config.username}@aditya.ac.in`,
            phone: '9876543210',
            department: config.dept,
            isCoordinator: true,
            coordinatorBranch: config.branch
          });
        } else {
          f.isCoordinator = true;
          f.coordinatorBranch = config.branch;
        }
        await f.save();
        console.log(`✅ Created & assigned ${config.name} as ${config.branch} Coordinator`);
      }
    }

    console.log('\n🎉 All Branch Coordinators added & assigned successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error adding coordinators:', err);
    process.exit(1);
  }
}

run();
