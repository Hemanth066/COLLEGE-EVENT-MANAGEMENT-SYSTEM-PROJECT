const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, uppercase: true, trim: true },
  code: { type: String, uppercase: true, trim: true },
  description: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Branch", branchSchema);
