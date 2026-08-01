const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, default: "Admin" },
  email:    { type: String, default: "" },
  isLoggedIn: { type: Boolean, default: false },
  sessionId: { type: String, default: null }
});

module.exports = mongoose.model("Admin", adminSchema);
