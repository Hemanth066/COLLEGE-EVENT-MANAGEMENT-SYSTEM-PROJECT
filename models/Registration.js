const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  studentName: {
    type: String,
    required: true
  },
  pinNumber: {
    type: String,
    required: true
  },
  branch: {
    type: String,
    required: true
  },
  section: {
    type: String,
    required: true
  },
  year: {
    type: String,
    required: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  eventVersion: {
    type: Number,
    default: 1
  },
  attended: {
    type: Boolean,
    default: false
  },
  score: {
    type: Number,
    default: 0
  },
  certificateUrl: {
    type: String,
    default: null
  }
});

module.exports = mongoose.model('Registration', registrationSchema);
