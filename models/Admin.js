const mongoose = require("mongoose");
const { isHashed, hashPassword, verifyPassword } = require("../utils/passwordUtils");

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, default: "Admin" },
  email:    { type: String, default: "" },
  isLoggedIn: { type: Boolean, default: false },
  sessionId: { type: String, default: null }
});

adminSchema.pre("save", async function(next) {
  if (this.isModified("password") && this.password && !isHashed(this.password)) {
    this.password = await hashPassword(this.password);
  }
  next();
});

adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await verifyPassword(candidatePassword, this.password);
};

module.exports = mongoose.model("Admin", adminSchema);

