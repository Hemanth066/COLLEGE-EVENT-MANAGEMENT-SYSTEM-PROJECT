const mongoose = require("mongoose");
const { isHashed, hashPassword, verifyPassword } = require("../utils/passwordUtils");

const departmentHeadSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true },
  password:     { type: String, required: true },
  fullName:     { type: String, default: "" },
  email:        { type: String, default: "" },
  phone:        { type: String, default: "" },
  department:   { type: String, default: "" },
  year:         { type: String, default: "" },
  signatureUrl: { type: String, default: "" },
  isLoggedIn:   { type: Boolean, default: false },
  sessionId:    { type: String, default: null }
});

departmentHeadSchema.pre("save", async function(next) {
  if (this.isModified("password") && this.password && !isHashed(this.password)) {
    this.password = await hashPassword(this.password);
  }
  next();
});

departmentHeadSchema.methods.comparePassword = async function(candidatePassword) {
  return await verifyPassword(candidatePassword, this.password);
};

module.exports = mongoose.model("DepartmentHead", departmentHeadSchema);

