const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary');
const Registration = require('../models/Registration');
const SystemSetting = require('../models/SystemSetting');

/**
 * Clean up generated certificate files that are older than the retention period.
 * Sets certificateUrl to null so storage space is freed up, while preserving
 * hasCertificate = true so the student can lazily regenerate it on demand.
 */
async function cleanupExpiredCertificates() {
  try {
    // Get certificate retention days setting (default: 30 days)
    let setting = await SystemSetting.findOne({ key: 'certificateRetentionDays' });
    let retentionDays = (setting && setting.value !== undefined && setting.value !== null) ? Number(setting.value) : 30;
    if (isNaN(retentionDays) || retentionDays < 0) {
      retentionDays = 30;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Find registrations with non-null certificateUrl created before cutoffDate
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
        // Attempt Cloudinary deletion if public ID is known or extract from URL
        let publicId = reg.certificateCloudinaryPublicId;
        if (!publicId && reg.certificateUrl) {
          // Attempt to extract Cloudinary public ID from URL if stored
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

        // Reset URL & publicId on registration record, maintain hasCertificate = true
        reg.certificateUrl = null;
        reg.certificateCloudinaryPublicId = null;
        reg.hasCertificate = true;
        await reg.save();

        cleanedCount++;
      } catch (err) {
        console.error(`[Cleanup] Error cleaning reg ${reg._id}:`, err.message);
      }
    }

    console.log(`[Certificate Cleanup] Processed ${cleanedCount} expired certificate(s) (Retention: ${retentionDays} days).`);
    return { cleanedCount, retentionDays };
  } catch (err) {
    console.error('[Certificate Cleanup] Global Cleanup Error:', err);
    throw err;
  }
}

module.exports = { cleanupExpiredCertificates };
