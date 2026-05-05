const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  pinNumber: { type: String, required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now }
});

// One feedback per student per event
feedbackSchema.index({ pinNumber: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
