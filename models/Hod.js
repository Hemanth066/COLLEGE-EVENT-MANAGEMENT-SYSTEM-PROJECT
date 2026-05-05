const mongoose = require("mongoose");
const hodSchema = new mongoose.Schema({
  username:   { type: String, required: true, unique: true },
  password:   { type: String, required: true },
  fullName:   { type: String, default: "" },
  email:      { type: String, default: "" },
  phone:      { type: String, default: "" },
  department: { type: String, default: "" },
  year:       { type: String, default: "" }
});
module.exports = mongoose.model("Hod", hodSchema);
