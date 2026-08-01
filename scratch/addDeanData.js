require('dotenv').config();
const mongoose = require('mongoose');
const Dean = require('../models/Dean');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/CEM';

async function addDean() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB ✅');

  const deanData = {
    username: 'dean',
    password: 'dean123',
    fullName: 'Dr. K. V. S. Ramachandra Rao',
    email: 'dean.academics@cem.edu.in',
    phone: '+91 9876543210',
    faculty: 'School of Engineering & Technology',
    year: '2025-2026'
  };

  const updatedDean = await Dean.findOneAndUpdate(
    { username: deanData.username },
    deanData,
    { upsert: true, new: true }
  );

  console.log('✅ Dean account created/updated successfully:');
  console.log('-------------------------------------------');
  console.log('ID        :', updatedDean._id.toString());
  console.log('Username  :', updatedDean.username);
  console.log('Password  :', updatedDean.password);
  console.log('Full Name :', updatedDean.fullName);
  console.log('Email     :', updatedDean.email);
  console.log('Faculty   :', updatedDean.faculty);
  console.log('-------------------------------------------');

  const totalDeans = await Dean.countDocuments();
  console.log(`Total Deans in DB: ${totalDeans}`);

  await mongoose.disconnect();
}

addDean().catch(err => console.error('Error adding Dean:', err));
