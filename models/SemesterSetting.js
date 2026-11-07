const mongoose = require('mongoose');

const semesterSettingSchema = new mongoose.Schema({
  branch: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  year: {
    type: String,
    required: true,
    trim: true
  },
  activeSemesters: {
    type: [Number],
    default: []
  },
  updatedBy: {
    type: String,
    default: ''
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound unique index so each branch + year combination has one record
semesterSettingSchema.index({ branch: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('SemesterSetting', semesterSettingSchema);

