const mongoose = require("mongoose");
const { isHashed, hashPassword, verifyPassword } = require("../utils/passwordUtils");

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
  sem1Score:  { type: Number, default: 0 },  // 1st Sem score from Excel
  sem2Score:  { type: Number, default: 0 },  // 2nd Sem score from Excel
  sem3Score:  { type: Number, default: 0 },  // 3rd Sem score from Excel
  sem4Score:  { type: Number, default: 0 },  // 4th Sem score from Excel
  eventScore: { type: Number, default: 0 },   // sum of all event registration scores
  isLoggedIn: { type: Boolean, default: false },
  sessionId: { type: String, default: null }
});

studentSchema.pre("save", async function(next) {
  if (this.isModified("password") && this.password && !isHashed(this.password)) {
    this.password = await hashPassword(this.password);
  }
  next();
});

studentSchema.methods.comparePassword = async function(candidatePassword) {
  return await verifyPassword(candidatePassword, this.password);
};

module.exports = mongoose.model("Student", studentSchema);

