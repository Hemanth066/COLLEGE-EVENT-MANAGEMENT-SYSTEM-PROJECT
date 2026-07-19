// Script to insert faculty and student data into MongoDB
const mongoose = require("mongoose");

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/CEM")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.log("❌ Connection Error:", err));

// Define Schemas
const facultySchema = new mongoose.Schema({
  facultyId: String,
  username: String,
  password: String
});

const studentSchema = new mongoose.Schema({
  studentId: String,
  username: String,
  password: String
});

const Faculty = mongoose.model("Faculty", facultySchema);
const Student = mongoose.model("Student", studentSchema);

// Faculty Data
const facultyData = [
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
  },
  {
    facultyId: "FAC004",
    username: "rajesh.kumar",
    password: "faculty123"
  },
  {
    facultyId: "FAC005",
    username: "anita.desai",
    password: "faculty123"
  }
];

// Student Data
const studentData = [
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
  },
  {
    studentId: "STU005",
    username: "priya.sharma",
    password: "student123"
  }
];

// Insert Data Function
async function insertData() {
  try {
    // Clear existing data (optional - remove if you want to keep existing data)
    await Faculty.deleteMany({});
    await Student.deleteMany({});
    console.log("🗑️  Cleared existing data");

    // Insert Faculty
    const faculties = await Faculty.insertMany(facultyData);
    console.log(`✅ Inserted ${faculties.length} faculty members`);

    // Insert Students
    const students = await Student.insertMany(studentData);
    console.log(`✅ Inserted ${students.length} students`);

    console.log("\n📋 Faculty Login Credentials:");
    facultyData.forEach(f => {
      console.log(`   Username: ${f.username} | Password: ${f.password}`);
    });

    console.log("\n📋 Student Login Credentials:");
    studentData.forEach(s => {
      console.log(`   Username: ${s.username} | Password: ${s.password}`);
    });

    console.log("\n✅ Data insertion completed successfully!");
    process.exit(0);

  } catch (error) {
    console.error("❌ Error inserting data:", error);
    process.exit(1);
  }
}

// Run the insertion
insertData();
