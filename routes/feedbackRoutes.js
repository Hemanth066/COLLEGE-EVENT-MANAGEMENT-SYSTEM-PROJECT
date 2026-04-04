const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');

// Submit feedback
router.post('/submit', async (req, res) => {
  try {
    const { studentName, pinNumber, eventId, rating, comment } = req.body;

    if (!studentName || !pinNumber || !eventId || !rating || !comment) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existing = await Feedback.findOne({ pinNumber, eventId });
    if (existing) {
      return res.status(409).json({ message: 'Feedback already submitted' });
    }

    const feedback = new Feedback({ studentName, pinNumber, eventId, rating, comment });
    await feedback.save();

    res.json({ message: 'Feedback submitted successfully ✅' });
  } catch (err) {
    console.error('Feedback submit error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Check if feedback already submitted
router.get('/check/:pinNumber/:eventId', async (req, res) => {
  try {
    const { pinNumber, eventId } = req.params;
    const existing = await Feedback.findOne({ pinNumber, eventId });
    res.json({ submitted: !!existing });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get all feedbacks for an event (faculty view)
router.get('/event/:eventId', async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ eventId: req.params.eventId }).sort({ submittedAt: -1 });
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
