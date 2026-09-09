const fs   = require('fs');
const path = require('path');
const Registration   = require('../models/Registration');
const OtherCertUpload = require('../models/OtherCertUpload');
const SystemSetting  = require('../models/SystemSetting');

const CERT_DIR       = path.join(__dirname, '../uploads/certificates');
const OTHER_CERT_DIR = path.join(__dirname, '../uploads/other-certs');

/**
 * Clean up generated event certificate files older than the retention period.
 * Deletes the file from disk and sets certificateUrl to null.
 * hasCertificate remains true so students can lazily regenerate on demand.
 */
async function cleanupExpiredCertificates() {
  try {
    let setting = await SystemSetting.findOne({ key: 'certificateRetentionDays' });
    let retentionDays = (setting && setting.value != null) ? Number(setting.value) : 30;
    if (isNaN(retentionDays) || retentionDays < 0) retentionDays = 30;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const expiredRegs = await Registration.find({
      certificateUrl:          { $ne: null },
      certificateGeneratedAt:  { $lt: cutoffDate }
    });

    if (!expiredRegs.length) return { cleanedCount: 0, retentionDays };

    let cleanedCount = 0;
    for (const reg of expiredRegs) {
      try {
        // Delete file from disk
        const filename = reg.certificateCloudinaryPublicId || (reg.certificateUrl && path.basename(reg.certificateUrl));
        if (filename) {
          const filePath = path.join(CERT_DIR, path.basename(filename));
          if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch(e) { console.error(`[Cleanup] File delete error: ${filePath}`, e.message); }
          }
        }

        reg.certificateUrl                = null;
        reg.certificateCloudinaryPublicId = null;
        reg.hasCertificate                = true;
        await reg.save();
        cleanedCount++;
      } catch (err) {
        console.error(`[Cleanup] Error cleaning reg ${reg._id}:`, err.message);
      }
    }

    console.log(`[Event Cert Cleanup] Cleaned ${cleanedCount} expired certificate(s) (Retention: ${retentionDays} days).`);
    return { cleanedCount, retentionDays };
  } catch (err) {
    console.error('[Event Cert Cleanup] Global error:', err);
    throw err;
  }
}

/**
 * Clean up approved other-certificates uploaded by students older than the retention period.
 * Deletes the file from disk and clears fileUrl.
 * Approved status and marks are preserved.
 */
async function cleanupExpiredOtherCertificates() {
  try {
    let setting = await SystemSetting.findOne({ key: 'otherCertRetentionDays' });
    let retentionDays = (setting && setting.value != null) ? Number(setting.value) : 30;
    if (isNaN(retentionDays) || retentionDays < 0) retentionDays = 30;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const expiredUploads = await OtherCertUpload.find({
      status:     'approved',
      fileUrl:    { $ne: null },
      reviewedAt: { $ne: null, $lt: cutoffDate }
    });

    if (!expiredUploads.length) return { cleanedCount: 0, retentionDays };

    let cleanedCount = 0;
    for (const upload of expiredUploads) {
      try {
        if (upload.fileName) {
          const filePath = path.join(OTHER_CERT_DIR, upload.fileName);
          if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch(e) { console.error(`[OtherCert Cleanup] File delete error: ${filePath}`, e.message); }
          }
        }

        upload.fileUrl = null;
        await upload.save();
        cleanedCount++;
      } catch (err) {
        console.error(`[OtherCert Cleanup] Error cleaning upload ${upload._id}:`, err.message);
      }
    }

    console.log(`[OtherCert Cleanup] Cleaned ${cleanedCount} expired certificate(s) (Retention: ${retentionDays} days).`);
    return { cleanedCount, retentionDays };
  } catch (err) {
    console.error('[OtherCert Cleanup] Global error:', err);
    throw err;
  }
}

module.exports = { cleanupExpiredCertificates, cleanupExpiredOtherCertificates };
