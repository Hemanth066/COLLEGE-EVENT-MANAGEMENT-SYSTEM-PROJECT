const mongoose = require("mongoose");
const deanSchema = new mongoose.Schema({
  username:   { type: String, required: true, unique: true },
  password:   { type: String, required: true },
  fullName:   { type: String, default: "" },
  email:      { type: String, default: "" },
  phone:      { type: String, default: "" },
  faculty:    { type: String, default: "" },   // e.g. "Engineering", "Science"
  year:       { type: String, default: "" }
});
module.exports = mongoose.model("Dean", deanSchema);
