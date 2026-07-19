// Script to update existing registrations with attended and score fields
const mongoose = require("mongoose");

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/CEM")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.log("❌ Connection Error:", err));

// Define Schema
const registrationSchema = new mongoose.Schema({
  studentName: String,
  pinNumber: String,
  branch: String,
  section: String,
  eventId: mongoose.Schema.Types.ObjectId,
  attended: Boolean,
  score: Number
});

const Registration = mongoose.model("Registration", registrationSchema);

// Update all registrations
async function updateRegistrations() {
  try {
    // Update all existing registrations to add attended and score fields
    const result = await Registration.updateMany(
      { attended: { $exists: false } }, // Find registrations without attended field
      { 
        $set: { 
          attended: false,
          score: 0 
        } 
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} registrations`);
    console.log("All registrations now have attended and score fields!");
    
    // Show updated registrations
    const registrations = await Registration.find();
    console.log("\n📋 All Registrations:");
    registrations.forEach((reg, index) => {
      console.log(`${index + 1}. ${reg.studentName} - Attended: ${reg.attended}, Score: ${reg.score}`);
    });

    process.exit(0);

  } catch (error) {
    console.error("❌ Error updating registrations:", error);
    process.exit(1);
  }
}

// Run the update
updateRegistrations();
