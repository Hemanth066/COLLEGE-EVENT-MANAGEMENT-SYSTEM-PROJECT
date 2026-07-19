const mongoose = require('mongoose');
const Registration = require('./models/Registration');
const Event = require('./models/Event');

mongoose.connect('mongodb://127.0.0.1:27017/CEM')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const registrations = await Registration.find().populate('eventId');
    
    console.log('\n=== TOTAL REGISTRATIONS:', registrations.length, '===\n');
    
    registrations.forEach((reg, i) => {
      console.log(`${i+1}. ${reg.studentName} - PIN: ${reg.pinNumber}`);
      console.log(`   Event: ${reg.eventId?.title || 'Unknown'}`);
      console.log(`   EventID: ${reg.eventId?._id || reg.eventId}`);
      console.log(`   Version: ${reg.eventVersion}`);
      console.log(`   Attended: ${reg.attended}`);
      console.log(`   Score: ${reg.score}`);
      console.log('');
    });
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
