const mongoose = require('mongoose');

const pastEventParticipantSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'PastEvent', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  rollNumber: { type: String, required: true, trim: true },
  studentName: { type: String, default: '', trim: true },
  department: { type: String, default: '', trim: true },
  year: { type: String, default: '' },
  email: { type: String, default: '', trim: true },
  attendanceStatus: { type: String, default: 'Completed' },
  matched: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PastEventParticipant', pastEventParticipantSchema);
