const mongoose = require('mongoose');

// Represents a certificate eligibility created by faculty
const otherCertSchema = new mongoose.Schema({
  certificateName: { type: String, required: true },
  branch:          { type: String, required: true },
  pinStart:        { type: String, required: true },
  pinEnd:          { type: String, required: true },
  marks:           { type: Number, required: true },
  description:     { type: String, default: '' },
  status:          { type: String, enum: ['active', 'inactive'], default: 'active' },
  startDate:       { type: Date, default: null },
  endDate:         { type: Date, default: null },
  extendDate:      { type: Date, default: null },
  facultyId:       { type: String, required: true },
  facultyName:     { type: String, default: '' },
  createdAt:       { type: Date, default: Date.now }
});

module.exports = mongoose.model('OtherCertificate', otherCertSchema);
