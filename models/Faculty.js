const mongoose = require("mongoose");

const facultySchema = new mongoose.Schema({
  facultyId: String,
  username: String,
  password: String,
  fullName: String,
  email: String,
  phone: String,
  department: String,
  profileImage: { type: String, default: 'https://ui-avatars.com/api/?name=Faculty&background=667eea&color=fff&size=200' }
});

module.exports = mongoose.model("Faculty", facultySchema);
