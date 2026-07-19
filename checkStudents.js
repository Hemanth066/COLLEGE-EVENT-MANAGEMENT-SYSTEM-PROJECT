const mongoose = require('mongoose');
const Student = require('./models/Student');

mongoose.connect('mongodb://127.0.0.1:27017/CEM')
  .then(async () => {
    console.log('MongoDB Connected ✅');
    
    // Check if students exist
    const students = await Student.find();
    console.log(`\nFound ${students.length} students in database:`);
    students.forEach(s => {
      console.log(`  - Username: ${s.username}, StudentID: ${s.studentId}`);
    });
    
    // If no students, add test students
    if (students.length === 0) {
      console.log('\n⚠️  No students found. Adding test students...');
      
      const testStudents = [
        { studentId: "STU001", username: "student1", password: "pass123" },
        { studentId: "STU002", username: "student2", password: "pass123" },
        { studentId: "STU003", username: "jane.smith", password: "student123" },
        { studentId: "STU004", username: "alex.kumar", password: "student123" }
      ];
      
      await Student.insertMany(testStudents);
      console.log('✅ Test students added successfully!');
      
      const newStudents = await Student.find();
      console.log(`\nNow have ${newStudents.length} students:`);
      newStudents.forEach(s => {
        console.log(`  - Username: ${s.username}, StudentID: ${s.studentId}`);
      });
    }
    
    console.log('\n✅ Check complete!');
    console.log('\nYou can login with:');
    console.log('  Username: student1');
    console.log('  Password: pass123');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
