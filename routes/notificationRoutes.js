const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

// GET /api/notifications?pinNumber=xxx
// Returns global notifications + student-specific ones, newest first
// Excludes new_registration type (faculty-only)
router.get('/', async (req, res) => {
  try {
    const { pinNumber, since } = req.query;
    const filter = {
      type: { $ne: 'new_registration' }
    };

    if (since) filter.createdAt = { $gt: new Date(since) };

    if (pinNumber) {
      filter.$or = [{ pinNumber: null }, { pinNumber }];
    } else {
      filter.pinNumber = null;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET /api/notifications/faculty/:facultyId — faculty-specific notifications
router.get('/faculty/:facultyId', async (req, res) => {
  try {
    const { since } = req.query;
    const filter = { facultyId: req.params.facultyId };
    if (since) filter.createdAt = { $gt: new Date(since) };

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// DELETE /api/notifications/student/:pinNumber — clear all notifications for a student
router.delete('/student/:pinNumber', async (req, res) => {
  try {
    await Notification.deleteMany({
      type: { $ne: 'new_registration' },
      $or: [{ pinNumber: null }, { pinNumber: req.params.pinNumber }]
    });
    res.json({ message: 'Cleared' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// DELETE /api/notifications/faculty/:facultyId — clear all notifications for a faculty
router.delete('/faculty/:facultyId', async (req, res) => {
  try {
    await Notification.deleteMany({ facultyId: req.params.facultyId });
    res.json({ message: 'Cleared' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
