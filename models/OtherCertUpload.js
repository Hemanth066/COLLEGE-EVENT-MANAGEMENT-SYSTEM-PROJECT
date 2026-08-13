const mongoose = require('mongoose');

// Represents a certificate uploaded by a student for verification
const otherCertUploadSchema = new mongoose.Schema({
  certificateId:   { type: mongoose.Schema.Types.ObjectId, ref: 'OtherCertificate', required: true },
  certificateName: { type: String, required: true },
  studentPin:      { type: String, required: true },
  studentName:     { type: String, default: '' },
  branch:          { type: String, default: '' },
  fileUrl:         { type: String, default: null },   // Cloudinary URL (null when cleaned up)
  fileBackupId:    { type: mongoose.Schema.Types.ObjectId, default: null }, // GridFS backup ID
  fileName:        { type: String, default: '' },
  status:          { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  marksAwarded:    { type: Number, default: 0 },
  uploadedAt:      { type: Date, default: Date.now },
  reviewedAt:      { type: Date, default: null }
});

module.exports = mongoose.model('OtherCertUpload', otherCertUploadSchema);
