require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/CEM';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected ✅');

    const db = mongoose.connection.db;

    const resStudents = await db.collection('students').updateMany({}, { $unset: { section: "" } });
    console.log(`Unset 'section' from students collection: modified ${resStudents.modifiedCount} documents.`);

    const resRegistrations = await db.collection('registrations').updateMany({}, { $unset: { section: "" } });
    console.log(`Unset 'section' from registrations collection: modified ${resRegistrations.modifiedCount} documents.`);

    console.log('Database cleanup completed successfully! ✅');
    process.exit(0);
  } catch (err) {
    console.error('Error during DB cleanup:', err);
    process.exit(1);
  }
}

run();
