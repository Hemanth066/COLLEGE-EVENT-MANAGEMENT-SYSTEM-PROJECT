const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Notification = require('../models/Notification');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const { sendNewEventEmail } = require('../emailService');

// Publish Event (POST /api/events)
router.post('/', async (req, res) => {
  try {
    console.log('Received event data:', req.body);
    const event = new Event(req.body);
    await event.save();

    // Create global notification for all students
    await Notification.create({
      type: 'new_event',
      title: 'New Event Published',
      message: `"${event.title}" is now open for registration!`,
      eventId: event._id,
      eventTitle: event.title,
      pinNumber: null
    });
    
    // --- SEND EMAIL NOTIFICATION TO ALL STUDENTS ---
    try {
      // Find all students to get their emails
      const students = await Student.find({}, 'email');
      const studentEmails = students.map(s => s.email).filter(email => email);
      
      let facultyEmail = 'no-reply@college.edu';
      let facultyName = event.faculty || 'A Faculty Member';
      
      if (event.publishedByFacultyId) {
        const facultyData = await Faculty.findOne({ facultyId: event.publishedByFacultyId });
        if (facultyData && facultyData.email) {
          facultyEmail = facultyData.email;
        }
      }
      
      if (studentEmails.length > 0) {
        // Run email script asynchronously so it doesn't block the API response
        sendNewEventEmail(
          studentEmails, 
          event.title, 
          event.date, 
          event.time, 
          facultyName, 
          facultyEmail
        ).catch(e => console.error("Email send failed:", e));
      }
    } catch (emailErr) {
      console.error("Failed to prepare broadcast email:", emailErr);
    }

    console.log('Event saved successfully:', event);
    res.json({ message: 'Event Published Successfully' });
  } catch (err) {
    console.error('Error publishing event:', err);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
});

// Get All Events (for students - no filter)
router.get('/', async (req, res) => {
  try {
    const events = await Event.find();
    // Attach current registration count to each event
    const Registration = require('../models/Registration');
    const eventsWithCount = await Promise.all(events.map(async e => {
      const count = await Registration.countDocuments({ eventId: e._id });
      const obj = e.toObject();
      obj.registrationCount = count;
      return obj;
    }));
    res.json(eventsWithCount);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get Events by Faculty (for faculty dashboard)
router.get('/faculty/:facultyId', async (req, res) => {
  try {
    const events = await Event.find({ publishedByFacultyId: req.params.facultyId });
    console.log(`Found ${events.length} events for faculty ${req.params.facultyId}`);
    res.json(events);
  } catch (err) {
    console.error('Error fetching faculty events:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Update Event
router.put('/:id', async (req, res) => {
  try {
    const currentEvent = await Event.findById(req.params.id);
    const updatedData = {
      ...req.body,
      version: (currentEvent.version || 1) + 1,
      updatedAt: new Date()
    };

    // Clear all existing registrations for this event so students must re-register
    const deleted = await Registration.deleteMany({ eventId: req.params.id });
    console.log(`Cleared ${deleted.deletedCount} registrations for updated event: ${req.params.id}`);

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );

    // Create global notification for all students
    await Notification.create({
      type: 'event_updated',
      title: 'Event Updated',
      message: `"${event.title}" has been updated. Please re-register if you were registered.`,
      eventId: event._id,
      eventTitle: event.title,
      pinNumber: null
    });

    res.json({ message: 'Event Updated Successfully', event, clearedRegistrations: deleted.deletedCount });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Delete Event
router.delete('/:id', async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event Deleted Successfully' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
