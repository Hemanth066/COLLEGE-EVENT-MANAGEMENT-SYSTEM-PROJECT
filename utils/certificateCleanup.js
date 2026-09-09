const fs   = require('fs');
const path = require('path');
const Registration   = require('../models/Registration');
const OtherCertUpload = require('../models/OtherCertUpload');
const SystemSetting  = require('../models/SystemSetting');

const CERT_DIR       = path.join(__dirname, '../uploads/certificates');
const OTHER_CERT_DIR = path.join(__dirname, '../uploads/other-certs');

const ALT_CERT_DIR       = path.join(__dirname, '../public/certificates');
const ALT_OTHER_CERT_DIR = path.join(__dirname, '../public/other-certs');

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
        // Delete file from disk (checking both uploads/certificates and public/certificates)
        const filename = reg.certificateCloudinaryPublicId || (reg.certificateUrl && path.basename(reg.certificateUrl));
        if (filename) {
          const bname = path.basename(filename);
          const p1 = path.join(CERT_DIR, bname);
          const p2 = path.join(ALT_CERT_DIR, bname);
          if (fs.existsSync(p1)) { try { fs.unlinkSync(p1); } catch(e) {} }
          if (fs.existsSync(p2)) { try { fs.unlinkSync(p2); } catch(e) {} }
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
        const fname = upload.fileName || (upload.fileUrl ? path.basename(upload.fileUrl) : null);
        if (fname) {
          const bname = path.basename(fname);
          const p1 = path.join(OTHER_CERT_DIR, bname);
          const p2 = path.join(ALT_OTHER_CERT_DIR, bname);
          if (fs.existsSync(p1)) { try { fs.unlinkSync(p1); } catch(e) {} }
          if (fs.existsSync(p2)) { try { fs.unlinkSync(p2); } catch(e) {} }
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
