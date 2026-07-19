const mongoose = require('mongoose');
const Faculty = require('./models/Faculty');
const Student = require('./models/Student');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/CEM')
  .then(() => console.log('MongoDB Connected ✅'))
  .catch(err => console.log(err));

async function addProfileData() {
  try {
    // Add Faculty with complete profile
    const faculty1 = await Faculty.findOneAndUpdate(
      { facultyId: 'FAC001' },
      {
        facultyId: 'FAC001',
        username: 'faculty1',
        password: 'faculty123',
        fullName: 'Dr. Rajesh Kumar',
        email: 'rajesh.kumar@college.edu',
        phone: '+91 9876543210',
        department: 'Computer Science',
        profileImage: 'https://ui-avatars.com/api/?name=Rajesh+Kumar&background=667eea&color=fff&size=200&bold=true'
      },
      { upsert: true, new: true }
    );
    console.log('✅ Faculty 1 added:', faculty1.fullName);

    const faculty2 = await Faculty.findOneAndUpdate(
      { facultyId: 'FAC002' },
      {
        facultyId: 'FAC002',
        username: 'faculty2',
        password: 'faculty123',
        fullName: 'Prof. Priya Sharma',
        email: 'priya.sharma@college.edu',
        phone: '+91 9876543211',
        department: 'Electronics',
        profileImage: 'https://ui-avatars.com/api/?name=Priya+Sharma&background=764ba2&color=fff&size=200&bold=true'
      },
      { upsert: true, new: true }
    );
    console.log('✅ Faculty 2 added:', faculty2.fullName);

    const faculty3 = await Faculty.findOneAndUpdate(
      { facultyId: 'FAC003' },
      {
        facultyId: 'FAC003',
        username: 'faculty3',
        password: 'faculty123',
        fullName: 'Dr. Amit Patel',
        email: 'amit.patel@college.edu',
        phone: '+91 9876543212',
        department: 'Mechanical Engineering',
        profileImage: 'https://ui-avatars.com/api/?name=Amit+Patel&background=2563eb&color=fff&size=200&bold=true'
      },
      { upsert: true, new: true }
    );
    console.log('✅ Faculty 3 added:', faculty3.fullName);

    // Add Students with complete profile
    const student1 = await Student.findOneAndUpdate(
      { studentId: 'STU001' },
      {
        studentId: 'STU001',
        username: 'student1',
        password: 'student123',
        pinNumber: '21CS001',
        fullName: 'Arjun Reddy',
        email: 'arjun.reddy@student.edu',
        phone: '+91 9876543220',
        branch: 'CSE',
        section: '1',
        year: '3rd Year',
        profileImage: 'https://ui-avatars.com/api/?name=Arjun+Reddy&background=fbbf24&color=0a2540&size=200&bold=true'
      },
      { upsert: true, new: true }
    );
    console.log('✅ Student 1 added:', student1.fullName);

    const student2 = await Student.findOneAndUpdate(
      { studentId: 'STU002' },
      {
        studentId: 'STU002',
        username: 'student2',
        password: 'student123',
        pinNumber: '21CS002',
        fullName: 'Sneha Iyer',
        email: 'sneha.iyer@student.edu',
        phone: '+91 9876543221',
        branch: 'CSE',
        section: '1',
        year: '3rd Year',
        profileImage: 'https://ui-avatars.com/api/?name=Sneha+Iyer&background=f59e0b&color=fff&size=200&bold=true'
      },
      { upsert: true, new: true }
    );
    console.log('✅ Student 2 added:', student2.fullName);

    const student3 = await Student.findOneAndUpdate(
      { studentId: 'STU003' },
      {
        studentId: 'STU003',
        username: 'student3',
        password: 'student123',
        pinNumber: '21EC001',
        fullName: 'Vikram Singh',
        email: 'vikram.singh@student.edu',
        phone: '+91 9876543222',
        branch: 'ECE',
        section: '2',
        year: '2nd Year',
        profileImage: 'https://ui-avatars.com/api/?name=Vikram+Singh&background=10b981&color=fff&size=200&bold=true'
      },
      { upsert: true, new: true }
    );
    console.log('✅ Student 3 added:', student3.fullName);

    console.log('\n🎉 All profile data added successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('\nFaculty:');
    console.log('  Username: faculty1, Password: faculty123 (Dr. Rajesh Kumar - CSE)');
    console.log('  Username: faculty2, Password: faculty123 (Prof. Priya Sharma - ECE)');
    console.log('  Username: faculty3, Password: faculty123 (Dr. Amit Patel - Mech)');
    console.log('\nStudents:');
    console.log('  Username: student1, Password: student123 (Arjun Reddy - 21CS001)');
    console.log('  Username: student2, Password: student123 (Sneha Iyer - 21CS002)');
    console.log('  Username: student3, Password: student123 (Vikram Singh - 21EC001)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding profile data:', error);
    process.exit(1);
  }
}

addProfileData();
