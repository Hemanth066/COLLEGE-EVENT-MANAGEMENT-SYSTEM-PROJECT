const mongoose = require('mongoose');
const Faculty = require('./models/Faculty');
const Event = require('./models/Event');

mongoose.connect('mongodb://127.0.0.1:27017/CEM')
  .then(async () => {
    console.log('MongoDB Connected ✅\n');
    
    // Get all faculty
    const faculties = await Faculty.find();
    console.log(`Found ${faculties.length} faculty members:\n`);
    faculties.forEach(f => {
      console.log(`Faculty ID: ${f.facultyId}`);
      console.log(`Username: ${f.username}`);
      console.log(`Password: ${f.password}`);
      console.log(`Full Name: ${f.fullName || 'Not set'}`);
      console.log('---');
    });
    
    // Get all events
    const events = await Event.find();
    console.log(`\nFound ${events.length} events:\n`);
    events.forEach(e => {
      console.log(`Event: ${e.title}`);
      console.log(`Published By Faculty ID: ${e.publishedByFacultyId || 'Not set'}`);
      console.log(`Faculty Name: ${e.faculty || 'Not set'}`);
      console.log(`Date: ${e.date}`);
      console.log('---');
    });
    
    console.log('\n✅ To login as faculty and see these events:');
    if (faculties.length > 0) {
      console.log(`Username: ${faculties[0].username}`);
      console.log(`Password: ${faculties[0].password}`);
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
