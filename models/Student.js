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
  year: String,
  profileImage: { type: String, default: 'https://ui-avatars.com/api/?name=Student&background=fbbf24&color=0a2540&size=200' },
  score:      { type: Number, default: 0 },  // base score from Excel / admin
  sem3Score:  { type: Number, default: 0 },  // 3rd Sem score from Excel
  sem4Score:  { type: Number, default: 0 },  // 4th Sem score from Excel
  eventScore: { type: Number, default: 0 },   // sum of all event registration scores
  isLoggedIn: { type: Boolean, default: false },
  sessionId: { type: String, default: null }
});

module.exports = mongoose.model("Student", studentSchema);
