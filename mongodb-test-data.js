// MongoDB Test Data for CEM (College Event Management System)
// Run these commands in MongoDB Compass or mongosh

// ========================================
// 1. INSERT FACULTY USERS
// ========================================

db.faculties.insertMany([
  {
    facultyId: "FAC001",
    username: "faculty1",
    password: "pass123"
  },
  {
    facultyId: "FAC002",
    username: "faculty2",
    password: "pass123"
  },
  {
    facultyId: "FAC003",
    username: "john.doe",
    password: "faculty123"
  }
]);

// ========================================
// 2. INSERT STUDENT USERS
// ========================================

db.students.insertMany([
  {
    studentId: "STU001",
    username: "student1",
    password: "pass123"
  },
  {
    studentId: "STU002",
    username: "student2",
    password: "pass123"
  },
  {
    studentId: "STU003",
    username: "jane.smith",
    password: "student123"
  },
  {
    studentId: "STU004",
    username: "alex.kumar",
    password: "student123"
  }
]);

// ========================================
// 3. INSERT SAMPLE EVENTS (Optional)
// ========================================

db.events.insertMany([
  {
    title: "Tech Fest 2026",
    description: "Annual technical festival featuring coding competitions, hackathons, and tech talks",
    venue: "Main Auditorium",
    date: "2026-03-15",
    time: "09:00",
    faculty: "Dr. Rajesh Kumar",
    facultyPhone: "9876543210",
    student: "Priya Sharma",
    studentPhone: "9123456789"
  },
  {
    title: "Cultural Night",
    description: "Evening of music, dance, and cultural performances by students",
    venue: "Open Air Theatre",
    date: "2026-03-20",
    time: "18:00",
    faculty: "Prof. Anita Desai",
    facultyPhone: "9876543211",
    student: "Rahul Verma",
    studentPhone: "9123456790"
  },
  {
    title: "AI & ML Workshop",
    description: "Hands-on workshop on Artificial Intelligence and Machine Learning fundamentals",
    venue: "Computer Lab - Block A",
    date: "2026-03-25",
    time: "10:00",
    faculty: "Dr. Suresh Patel",
    facultyPhone: "9876543212",
    student: "Neha Gupta",
    studentPhone: "9123456791"
  },
  {
    title: "Sports Day",
    description: "Inter-department sports competition including cricket, football, and athletics",
    venue: "College Sports Ground",
    date: "2026-04-01",
    time: "07:00",
    faculty: "Mr. Vikram Singh",
    facultyPhone: "9876543213",
    student: "Arjun Reddy",
    studentPhone: "9123456792"
  }
]);

// ========================================
// VERIFICATION QUERIES
// ========================================

// Check if data was inserted successfully
db.faculties.countDocuments();  // Should return 3
db.students.countDocuments();   // Should return 4
db.events.countDocuments();     // Should return 4

// View all inserted data
db.faculties.find().pretty();
db.students.find().pretty();
db.events.find().pretty();
