const mongoose = require('mongoose');
const Event = require('./models/Event');
const Faculty = require('./models/Faculty');

mongoose.connect('mongodb://127.0.0.1:27017/CEM')
  .then(async () => {
    console.log('MongoDB Connected ✅\n');
    
    // Get a faculty member
    let faculty = await Faculty.findOne();
    
    if (!faculty) {
      console.log('No faculty found, creating test faculty...');
      faculty = await Faculty.create({
        facultyId: "FAC001",
        username: "faculty1",
        password: "pass123",
        fullName: "Dr. John Smith",
        email: "faculty1@example.com",
        phone: "9876543210",
        department: "Computer Science"
      });
    }
    
    // Clear existing events
    await Event.deleteMany({});
    console.log('Cleared existing events\n');
    
    // Add test events
    const testEvents = [
      {
        title: "Tech Fest 2026",
        description: "Annual technical festival featuring coding competitions, hackathons, and tech talks",
        venue: "Main Auditorium",
        date: "2026-03-15",
        time: "09:00 AM",
        faculty: faculty.fullName || "Dr. John Smith",
        facultyPhone: faculty.phone || "9876543210",
        student: "Event Coordinator",
        studentPhone: "9123456789",
        publishedByFacultyId: faculty.facultyId,
        version: 1
      },
      {
        title: "Cultural Night",
        description: "Evening of music, dance, and cultural performances by students",
        venue: "Open Air Theatre",
        date: "2026-03-20",
        time: "06:00 PM",
        faculty: faculty.fullName || "Dr. John Smith",
        facultyPhone: faculty.phone || "9876543210",
        student: "Event Coordinator",
        studentPhone: "9123456790",
        publishedByFacultyId: faculty.facultyId,
        version: 1
      },
      {
        title: "AI & ML Workshop",
        description: "Hands-on workshop on Artificial Intelligence and Machine Learning fundamentals",
        venue: "Computer Lab - Block A",
        date: "2026-03-25",
        time: "10:00 AM",
        faculty: faculty.fullName || "Dr. John Smith",
        facultyPhone: faculty.phone || "9876543210",
        student: "Event Coordinator",
        studentPhone: "9123456791",
        publishedByFacultyId: faculty.facultyId,
        version: 1
      },
      {
        title: "Sports Day",
        description: "Inter-department sports competition including cricket, football, and athletics",
        venue: "College Sports Ground",
        date: "2026-04-01",
        time: "07:00 AM",
        faculty: faculty.fullName || "Dr. John Smith",
        facultyPhone: faculty.phone || "9876543210",
        student: "Event Coordinator",
        studentPhone: "9123456792",
        publishedByFacultyId: faculty.facultyId,
        version: 1
      }
    ];
    
    await Event.insertMany(testEvents);
    console.log('✅ Test events added successfully!\n');
    
    const events = await Event.find();
    console.log(`Total events: ${events.length}\n`);
    events.forEach(e => {
      console.log(`Event: ${e.title}`);
      console.log(`Date: ${e.date}`);
      console.log(`Venue: ${e.venue}`);
      console.log('---');
    });
    
    console.log('\n✅ Setup complete!');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
