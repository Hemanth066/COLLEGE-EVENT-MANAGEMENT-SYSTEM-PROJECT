const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

// GET /api/notifications?pinNumber=xxx
// Returns global notifications + student-specific ones, newest first
// Excludes faculty-only notifications and notifications dismissed by this student
router.get('/', async (req, res) => {
  try {
    const { pinNumber, since } = req.query;
    const pin = pinNumber ? String(pinNumber).trim() : null;

    const filter = {
      type: { $ne: 'new_registration' },
      facultyId: { $in: [null, undefined, ''] } // Exclude faculty-targeted notifications!
    };

    if (since) filter.createdAt = { $gt: new Date(since) };

    if (pin) {
      filter.dismissedByPins = { $ne: pin }; // Exclude notifications dismissed by this student
      filter.$or = [
        { pinNumber: null },
        { pinNumber: '' },
        { pinNumber: new RegExp(`^${pin}$`, 'i') }
      ];
    } else {
      filter.pinNumber = null;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (err) {
    console.error('Error fetching student notifications:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET /api/notifications/faculty/:facultyId — faculty-specific notifications
router.get('/faculty/:facultyId', async (req, res) => {
  try {
    const { since } = req.query;
    const fid = String(req.params.facultyId).trim();
    const Faculty = require('../models/Faculty');
    const mongoose = require('mongoose');

    let faculty = null;
    if (mongoose.Types.ObjectId.isValid(fid)) {
      try { faculty = await Faculty.findById(fid); } catch(e) {}
    }
    if (!faculty) {
      try { faculty = await Faculty.findOne({ facultyId: fid }); } catch(e) {}
    }
    if (!faculty) {
      try { faculty = await Faculty.findOne({ username: fid }); } catch(e) {}
    }

    const matchedIds = [fid];
    if (faculty) {
      if (faculty._id) matchedIds.push(String(faculty._id));
      if (faculty.facultyId) matchedIds.push(String(faculty.facultyId));
      if (faculty.username) matchedIds.push(String(faculty.username));
    }

    const filter = {
      dismissedByFaculty: { $nin: matchedIds }, // Exclude notifications dismissed by this faculty
      $or: [
        { facultyId: { $in: matchedIds } },
        { type: 'new_registration' }
      ]
    };

    if (since) filter.createdAt = { $gt: new Date(since) };

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (err) {
    console.error('Error fetching faculty notifications:', err);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// DELETE /api/notifications/student/:pinNumber — per-user clear for student (does not affect other students)
router.delete('/student/:pinNumber', async (req, res) => {
  try {
    const pin = String(req.params.pinNumber).trim();
    if (!pin) return res.status(400).json({ message: 'pinNumber required' });

    // Mark notifications as dismissed for this student PIN only
    await Notification.updateMany(
      {
        type: { $ne: 'new_registration' },
        facultyId: { $in: [null, undefined, ''] },
        dismissedByPins: { $ne: pin },
        $or: [
          { pinNumber: null },
          { pinNumber: '' },
          { pinNumber: new RegExp(`^${pin}$`, 'i') }
        ]
      },
      { $addToSet: { dismissedByPins: pin } }
    );

    res.json({ message: 'Notifications cleared for student' });
  } catch (err) {
    console.error('Error clearing student notifications:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// DELETE /api/notifications/faculty/:facultyId — per-user clear for faculty
router.delete('/faculty/:facultyId', async (req, res) => {
  try {
    const fid = String(req.params.facultyId).trim();
    const Faculty = require('../models/Faculty');
    const mongoose = require('mongoose');

    let faculty = null;
    if (mongoose.Types.ObjectId.isValid(fid)) {
      try { faculty = await Faculty.findById(fid); } catch(e) {}
    }
    if (!faculty) {
      try { faculty = await Faculty.findOne({ facultyId: fid }); } catch(e) {}
    }

    const matchedIds = [fid];
    if (faculty) {
      if (faculty._id) matchedIds.push(String(faculty._id));
      if (faculty.facultyId) matchedIds.push(String(faculty.facultyId));
      if (faculty.username) matchedIds.push(String(faculty.username));
    }

    await Notification.updateMany(
      {
        dismissedByFaculty: { $nin: matchedIds },
        $or: [
          { facultyId: { $in: matchedIds } },
          { type: 'new_registration' }
        ]
      },
      { $addToSet: { dismissedByFaculty: { $each: matchedIds } } }
    );

    res.json({ message: 'Notifications cleared for faculty' });
  } catch (err) {
    console.error('Error clearing faculty notifications:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
