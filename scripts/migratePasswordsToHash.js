require('dotenv').config();
const mongoose = require('mongoose');

const Admin          = require('../models/Admin');
const Faculty        = require('../models/Faculty');
const Student        = require('../models/Student');
const DepartmentHead = require('../models/DepartmentHead');
const Hod            = require('../models/Hod');
const Dean           = require('../models/Dean');
const { isHashed, hashPassword } = require('../utils/passwordUtils');

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://cemuser:Cem12345@cem.c5r0uv0.mongodb.net/CEM?retryWrites=true&w=majority&appName=CEM";

async function migrateCollection(model, name) {
  const docs = await model.find().lean();
  let ops = [];
  let updatedCount = 0;
  console.log(`Checking ${name} collection (${docs.length} documents)...`);

  for (const doc of docs) {
    if (doc.password && !isHashed(doc.password)) {
      const hashed = await hashPassword(doc.password);
      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { password: hashed } }
        }
      });
      updatedCount++;

      if (ops.length >= 100) {
        await model.bulkWrite(ops);
        ops = [];
      }
    }
  }

  if (ops.length > 0) {
    await model.bulkWrite(ops);
  }

  console.log(`✅ ${name}: Converted ${updatedCount} legacy plain-text password(s) to bcrypt hash.`);
}

async function runMigration() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB ✅\nStarting password hash migration...\n');

    await migrateCollection(Admin, 'Admin');
    await migrateCollection(Faculty, 'Faculty');
    await migrateCollection(Student, 'Student');
    await migrateCollection(DepartmentHead, 'DepartmentHead');
    await migrateCollection(Hod, 'Hod');
    await migrateCollection(Dean, 'Dean');

    console.log('\n🎉 Password Hash Migration Complete!');
  } catch (err) {
    console.error('❌ Migration Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runMigration();
