const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, uppercase: true, trim: true },
  code: { type: String, uppercase: true, trim: true },
  description: { type: String, default: '' },
  totalSemesters: { type: Number, default: 8, min: 1, max: 8 },
  activeSemesters: { type: [Number], default: [1, 2, 3, 4, 5, 6, 7, 8] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Branch", branchSchema);
