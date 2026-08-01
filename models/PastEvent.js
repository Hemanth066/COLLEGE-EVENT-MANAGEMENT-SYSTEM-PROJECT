const mongoose = require('mongoose');

const pastEventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  venue: { type: String, required: true, trim: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  facultyCoordinator: { type: String, required: true, trim: true },
  facultyPhone: { type: String, required: true, trim: true },
  studentCoordinator: { type: String, required: true, trim: true },
  studentPhone: { type: String, required: true, trim: true },
  uploadedPdf: { type: String, default: '' },
  createdBy: { type: String, required: true },
  status: { type: String, default: 'Completed' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PastEvent', pastEventSchema);
