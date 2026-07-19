// Create test registrations with proper structure
const mongoose = require("mongoose");

mongoose.connect("mongodb://127.0.0.1:27017/CEM")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.log("❌ Connection Error:", err));

const eventSchema = new mongoose.Schema({
  title: String,
  description: String,
  venue: String,
  date: String,
  time: String,
  faculty: String,
  facultyPhone: String,
  student: String,
  studentPhone: String
});

const registrationSchema = new mongoose.Schema({
  studentName: String,
  pinNumber: String,
  branch: String,
  section: String,
  eventId: mongoose.Schema.Types.ObjectId,
  attended: { type: Boolean, default: false },
  score: { type: Number, default: 0 }
});

const Event = mongoose.model("Event", eventSchema);
const Registration = mongoose.model("Registration", registrationSchema);

async function createTestData() {
  try {
    // Get first event
    const events = await Event.find();
    
    if (events.length === 0) {
      console.log("❌ No events found. Please create an event first!");
      process.exit(1);
    }
    
    const firstEvent = events[0];
    console.log(`Using event: ${firstEvent.title} (ID: ${firstEvent._id})`);
    
    // Create test registrations
    const testRegistrations = [
      {
        studentName: "Hemanth Kumar",
        pinNumber: "071",
        branch: "CSE",
        section: "A",
        eventId: firstEvent._id,
        attended: false,
        score: 0
      },
      {
        studentName: "Siva Prasad",
        pinNumber: "072",
        branch: "ECE",
        section: "B",
        eventId: firstEvent._id,
        attended: false,
        score: 0
      },
      {
        studentName: "Kumar Reddy",
        pinNumber: "073",
        branch: "EEE",
        section: "A",
        eventId: firstEvent._id,
        attended: false,
        score: 0
      }
    ];
    
    const result = await Registration.insertMany(testRegistrations);
    console.log(`\n✅ Created ${result.length} test registrations`);
    
    result.forEach((reg, i) => {
      console.log(`${i + 1}. ${reg.studentName} - ID: ${reg._id}`);
    });
    
    process.exit(0);

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

createTestData();
