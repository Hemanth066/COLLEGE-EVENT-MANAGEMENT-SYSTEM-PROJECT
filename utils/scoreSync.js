const Student = require('../models/Student');
const Registration = require('../models/Registration');
const Event = require('../models/Event');

/**
 * Recalculate and sync eventScore in the Student collection for given student PINs or all students.
 * @param {string|string[]} [pins] - Optional PIN or array of PINs to resync. If omitted or empty, resyncs all students.
 */
async function resyncStudentScores(pins = null) {
  try {
    let pinList = [];
    if (typeof pins === 'string' && pins.trim()) {
      pinList = [pins.trim()];
    } else if (Array.isArray(pins)) {
      pinList = pins.map(p => String(p).trim()).filter(Boolean);
    }

    // Get all valid event IDs currently existing in DB
    const existingEvents = await Event.find({}, '_id');
    const validEventIds = existingEvents.map(e => e._id);

    if (pinList.length > 0) {
      // Resync specific student PINs
      const regexes = pinList.map(p => new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
      const students = await Student.find({
        $or: [
          { pinNumber: { $in: regexes } },
          { studentId: { $in: regexes } },
          { username: { $in: regexes } }
        ]
      });

      for (const student of students) {
        const studentPins = [student.pinNumber, student.studentId, student.username]
          .filter(Boolean)
          .map(p => String(p).trim());
        const pinRegexes = studentPins.map(p => new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));

        const regs = await Registration.find({
          eventId: { $in: validEventIds },
          pinNumber: { $in: pinRegexes }
        });

        const newEventScore = regs.reduce((sum, r) => sum + (Number(r.score) || 0), 0);
        if (student.eventScore !== newEventScore) {
          student.eventScore = newEventScore;
          await student.save();
        }
      }
    } else {
      // Resync ALL students efficiently using aggregation
      const totals = await Registration.aggregate([
        { $match: { eventId: { $in: validEventIds } } },
        { $group: { _id: "$pinNumber", totalEventScore: { $sum: "$score" } } }
      ]);

      const scoreMap = new Map();
      totals.forEach(item => {
        if (item._id) scoreMap.set(String(item._id).trim().toUpperCase(), item.totalEventScore || 0);
      });

      const allStudents = await Student.find({});
      const bulkOps = [];

      for (const student of allStudents) {
        const pinsToTry = [student.pinNumber, student.studentId, student.username].filter(Boolean);
        let newScore = 0;
        for (const p of pinsToTry) {
          const upper = String(p).trim().toUpperCase();
          if (scoreMap.has(upper)) {
            newScore = scoreMap.get(upper);
            break;
          }
        }

        if (student.eventScore !== newScore) {
          bulkOps.push({
            updateOne: {
              filter: { _id: student._id },
              update: { $set: { eventScore: newScore } }
            }
          });
        }
      }

      if (bulkOps.length > 0) {
        await Student.bulkWrite(bulkOps);
      }
    }
    return { success: true };
  } catch (err) {
    console.error('[resyncStudentScores Error]:', err.message);
    throw err;
  }
}

/**
 * Remove any Registration documents whose eventId does not exist in Event collection,
 * then resync all student event scores.
 */
async function cleanupOrphanedRegistrationsAndSync() {
  try {
    const existingEvents = await Event.find({}, '_id');
    const validEventIds = new Set(existingEvents.map(e => e._id.toString()));

    const allRegistrations = await Registration.find({});
    const orphanedRegs = allRegistrations.filter(r => !r.eventId || !validEventIds.has(r.eventId.toString()));

    let deletedOrphanedCount = 0;
    if (orphanedRegs.length > 0) {
      const orphanedIds = orphanedRegs.map(r => r._id);
      const res = await Registration.deleteMany({ _id: { $in: orphanedIds } });
      deletedOrphanedCount = res.deletedCount || 0;
      console.log(`[Score Sync Cleanup] Removed ${deletedOrphanedCount} orphaned registration(s).`);
    }

    await resyncStudentScores();
    console.log('[Score Sync Cleanup] Recalculated event scores for all students.');

    return { deletedOrphanedCount };
  } catch (err) {
    console.error('[cleanupOrphanedRegistrationsAndSync Error]:', err.message);
    throw err;
  }
}

module.exports = {
  resyncStudentScores,
  cleanupOrphanedRegistrationsAndSync
};
