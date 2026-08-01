const mongoose = require("mongoose");

const facultySchema = new mongoose.Schema({
  facultyId: String,
  username: String,
  password: String,
  fullName: String,
  email: String,
  phone: String,
  department: String,
  profileImage: { type: String, default: 'https://ui-avatars.com/api/?name=Faculty&background=667eea&color=fff&size=200' },
  signatureUrl: { type: String, default: '' },
  isCoordinator: { type: Boolean, default: false },
  coordinatorBranch: { type: String, default: '' },
  isLoggedIn: { type: Boolean, default: false }
});

module.exports = mongoose.model("Faculty", facultySchema);
