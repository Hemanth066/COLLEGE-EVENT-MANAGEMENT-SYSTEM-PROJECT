const mongoose = require("mongoose");
const { isHashed, hashPassword, verifyPassword } = require("../utils/passwordUtils");

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
  coordinatorBranches: { type: [String], default: [] },
  coordinatorYears: { type: [String], default: ['1', '2', '3', '4'] },
  isLoggedIn: { type: Boolean, default: false },
  sessionId: { type: String, default: null }
});

facultySchema.pre("save", async function(next) {
  if (this.isModified("password") && this.password && !isHashed(this.password)) {
    this.password = await hashPassword(this.password);
  }
  next();
});

facultySchema.methods.comparePassword = async function(candidatePassword) {
  return await verifyPassword(candidatePassword, this.password);
};

module.exports = mongoose.model("Faculty", facultySchema);

