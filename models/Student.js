const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  studentId: String,
  username: String,
  password: String,
  pinNumber: String,
  fullName: String,
  email: String,
  phone: String,
  branch: String,
  section: String,
  year: String,
  profileImage: { type: String, default: 'https://ui-avatars.com/api/?name=Student&background=fbbf24&color=0a2540&size=200' },
  score:      { type: Number, default: 0 },  // base score from Excel / admin
  eventScore: { type: Number, default: 0 }   // sum of all event registration scores
});

module.exports = mongoose.model("Student", studentSchema);
