const mongoose = require("mongoose");
const deanSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true },
  password:     { type: String, required: true },
  fullName:     { type: String, default: "" },
  email:        { type: String, default: "" },
  phone:        { type: String, default: "" },
  faculty:      { type: String, default: "" },   // e.g. "Engineering", "Science"
  branches:     { type: String, default: "ALL" },// e.g. "CSE, AIML" or "ALL"
  year:         { type: String, default: "ALL" },// e.g. "3" or "1, 2, 3, 4" or "ALL"
  signatureUrl: { type: String, default: "" },
  isLoggedIn:   { type: Boolean, default: false }
});
module.exports = mongoose.model("Dean", deanSchema);
