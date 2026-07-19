const mongoose = require('mongoose');
const Student = require('./models/Student');

mongoose.connect('mongodb://127.0.0.1:27017/CEM')
  .then(async () => {
    console.log('MongoDB Connected ✅\n');
    
    // Clear existing students
    await Student.deleteMany({});
    console.log('Cleared existing students\n');
    
    // Add test students
    const testStudents = [
      {
        studentId: "STU001",
        username: "student1",
        password: "pass123",
        pinNumber: "STU001",
        fullName: "John Doe",
        email: "john.doe@college.edu",
        phone: "9876543210",
        branch: "CSE",
        section: "A",
        year: "3"
      },
      {
        studentId: "STU002",
        username: "student2",
        password: "pass123",
        pinNumber: "STU002",
        fullName: "Jane Smith",
        email: "jane.smith@college.edu",
        phone: "9876543211",
        branch: "ECE",
        section: "B",
        year: "2"
      },
      {
        studentId: "STU003",
        username: "alex",
        password: "pass123",
        pinNumber: "STU003",
        fullName: "Alex Kumar",
        email: "alex.kumar@college.edu",
        phone: "9876543212",
        branch: "IT",
        section: "A",
        year: "3"
      }
    ];
    
    await Student.insertMany(testStudents);
    console.log('✅ Test students added successfully!\n');
    
    const students = await Student.find();
    console.log(`Total students: ${students.length}\n`);
    students.forEach(s => {
      console.log(`Username: ${s.username}`);
      console.log(`Password: ${s.password}`);
      console.log(`StudentID: ${s.studentId}`);
      console.log(`Full Name: ${s.fullName}`);
      console.log('---');
    });
    
    console.log('\n✅ You can now login with:');
    console.log('Username: student1');
    console.log('Password: pass123');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
