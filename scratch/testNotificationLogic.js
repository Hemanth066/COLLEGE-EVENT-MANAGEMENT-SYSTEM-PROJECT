require('dotenv').config();
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/CEM';

async function testNotifications() {
  await mongoose.connect(MONGO_URI);

  // 1. Create a global event notification (Rule 1)
  const notif1 = await Notification.create({
    type: 'new_event',
    title: '📢 Test Global Event',
    message: 'Global event published for all students',
    pinNumber: null,
    facultyId: null
  });

  // 2. Create a targeted student notification (Rule 2)
  const notif2 = await Notification.create({
    type: 'attendance',
    title: '✅ Attendance Marked',
    message: 'You have been marked Present for Test Event',
    pinNumber: '24B11CS001',
    facultyId: null
  });

  // 3. Create a faculty notification for certificate upload (Rule 3)
  const notif3 = await Notification.create({
    type: 'certificate',
    title: '📥 New Certificate Uploaded',
    message: 'Student uploaded certificate for verification',
    facultyId: 'FAC001',
    pinNumber: null
  });

  console.log('Created test notifications.');

  // Test Student Query for 24B11CS001
  const student1Notifs = await Notification.find({
    type: { $ne: 'new_registration' },
    facultyId: { $in: [null, undefined, ''] },
    dismissedByPins: { $ne: '24B11CS001' },
    $or: [
      { pinNumber: null },
      { pinNumber: '' },
      { pinNumber: new RegExp('^24B11CS001$', 'i') }
    ]
  });

  console.log('\nStudent 24B11CS001 saw notifications count:', student1Notifs.length);
  student1Notifs.forEach(n => console.log(`  - [${n.title}] -> pinNumber: ${n.pinNumber}, facultyId: ${n.facultyId}`));

  // Test Student Query for 24B11CS002 (should see global only, NOT student1's targeted attendance!)
  const student2Notifs = await Notification.find({
    type: { $ne: 'new_registration' },
    facultyId: { $in: [null, undefined, ''] },
    dismissedByPins: { $ne: '24B11CS002' },
    $or: [
      { pinNumber: null },
      { pinNumber: '' },
      { pinNumber: new RegExp('^24B11CS002$', 'i') }
    ]
  });

  console.log('\nStudent 24B11CS002 saw notifications count:', student2Notifs.length);
  student2Notifs.forEach(n => console.log(`  - [${n.title}] -> pinNumber: ${n.pinNumber}, facultyId: ${n.facultyId}`));

  // Test Faculty Query for FAC001
  const facultyNotifs = await Notification.find({
    dismissedByFaculty: { $nin: ['FAC001'] },
    $or: [
      { facultyId: { $in: ['FAC001'] } },
      { type: 'new_registration' }
    ]
  });

  console.log('\nFaculty FAC001 saw notifications count:', facultyNotifs.length);
  facultyNotifs.forEach(n => console.log(`  - [${n.title}] -> facultyId: ${n.facultyId}`));

  // Cleanup test items
  await Notification.deleteMany({ _id: { $in: [notif1._id, notif2._id, notif3._id] } });
  console.log('\nCleaned up test notifications.');

  await mongoose.disconnect();
}

testNotifications();
