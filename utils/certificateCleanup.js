const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary');
const Registration = require('../models/Registration');
const OtherCertUpload = require('../models/OtherCertUpload');
const SystemSetting = require('../models/SystemSetting');

/**
 * Clean up generated event certificate files that are older than the retention period.
 * Sets certificateUrl to null so storage space is freed up, while preserving
 * hasCertificate = true so the student can lazily regenerate it on demand.
 */
async function cleanupExpiredCertificates() {
  try {
    let setting = await SystemSetting.findOne({ key: 'certificateRetentionDays' });
    let retentionDays = (setting && setting.value !== undefined && setting.value !== null) ? Number(setting.value) : 30;
    if (isNaN(retentionDays) || retentionDays < 0) {
      retentionDays = 30;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const expiredRegs = await Registration.find({
      certificateUrl: { $ne: null },
      certificateGeneratedAt: { $lt: cutoffDate }
    });

    if (!expiredRegs.length) {
      return { cleanedCount: 0, retentionDays };
    }

    let cleanedCount = 0;
    for (const reg of expiredRegs) {
      try {
        let publicId = reg.certificateCloudinaryPublicId;
        if (!publicId && reg.certificateUrl) {
          const match = reg.certificateUrl.match(/CEM_Certificates\/([^/.]+)/);
          if (match) {
            publicId = `CEM_Certificates/${match[1]}`;
          }
        }

        if (publicId) {
          await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }).catch(err => {
            console.error(`[Cleanup] Cloudinary destroy error for ${publicId}:`, err.message);
          });
        }

        reg.certificateUrl = null;
        reg.certificateCloudinaryPublicId = null;
        reg.hasCertificate = true;
        await reg.save();

        cleanedCount++;
      } catch (err) {
        console.error(`[Cleanup] Error cleaning reg ${reg._id}:`, err.message);
      }
    }

    console.log(`[Event Cert Cleanup] Processed ${cleanedCount} expired certificate(s) (Retention: ${retentionDays} days).`);
    return { cleanedCount, retentionDays };
  } catch (err) {
    console.error('[Event Cert Cleanup] Global Cleanup Error:', err);
    throw err;
  }
}

/**
 * Clean up approved Other Certificates uploaded by students that are older than the otherCertRetentionDays period after faculty approval (reviewedAt).
 * Clears fileUrl while keeping status = 'approved', marks, and GridFS backup for lazy on-demand restoration.
 */
async function cleanupExpiredOtherCertificates() {
  try {
    let setting = await SystemSetting.findOne({ key: 'otherCertRetentionDays' });
    let retentionDays = (setting && setting.value !== undefined && setting.value !== null) ? Number(setting.value) : 30;
    if (isNaN(retentionDays) || retentionDays < 0) {
      retentionDays = 30;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Find approved uploads with active fileUrl where reviewedAt is older than cutoffDate
    const expiredUploads = await OtherCertUpload.find({
      status: 'approved',
      fileUrl: { $ne: null },
      reviewedAt: { $ne: null, $lt: cutoffDate }
    });

    if (!expiredUploads.length) {
      return { cleanedCount: 0, retentionDays };
    }

    let cleanedCount = 0;
    for (const upload of expiredUploads) {
      try {
        // Extract public ID from Cloudinary URL if stored
        let publicId = null;
        if (upload.fileUrl) {
          const match = upload.fileUrl.match(/CEM_OtherCerts\/([^/.]+)/);
          if (match) {
            publicId = `CEM_OtherCerts/${match[1]}`;
          }
        }

        if (publicId) {
          await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' }).catch(err => {
            // Also try raw if auto didn't catch
            cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }).catch(() => {});
          });
        }

        // Set fileUrl to null, maintain approved status and marks
        upload.fileUrl = null;
        await upload.save();

        cleanedCount++;
      } catch (err) {
        console.error(`[OtherCert Cleanup] Error cleaning upload ${upload._id}:`, err.message);
      }
    }

    console.log(`[OtherCert Cleanup] Processed ${cleanedCount} expired certificate(s) (Retention: ${retentionDays} days).`);
    return { cleanedCount, retentionDays };
  } catch (err) {
    console.error('[OtherCert Cleanup] Global Cleanup Error:', err);
    throw err;
  }
}

module.exports = {
  cleanupExpiredCertificates,
  cleanupExpiredOtherCertificates
};
