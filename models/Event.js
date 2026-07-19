const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: String,
  description: String,
  venue: String,
  date: String,
  time: String,
  faculty: String,
  facultyPhone: String,
  student: String,
  studentPhone: String,
  version: { type: Number, default: 1 },
  updatedAt: { type: Date, default: Date.now },
  publishedBy: String,
  publishedByFacultyId: String,
  registrationDeadline: String,
  maxParticipants: { type: Number, default: null } // null = unlimited
});

module.exports = mongoose.model('Event', eventSchema);
