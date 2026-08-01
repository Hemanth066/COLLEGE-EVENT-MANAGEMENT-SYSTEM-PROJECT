const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: { type: String, enum: ['new_event', 'event_updated', 'attendance', 'score', 'certificate', 'new_registration', 'registration_confirmed', 'past_event', 'event_completed'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  eventTitle: { type: String, default: '' },
  // null = global (all students), pinNumber = student-specific, facultyId = faculty-specific
  pinNumber: { type: String, default: null },
  facultyId: { type: String, default: null },
  dismissedByPins: { type: [String], default: [] },
  dismissedByFaculty: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
