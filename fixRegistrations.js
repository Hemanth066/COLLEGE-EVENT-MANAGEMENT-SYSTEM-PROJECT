// Fix registrations - delete and recreate with proper structure
const mongoose = require("mongoose");

mongoose.connect("mongodb://127.0.0.1:27017/CEM")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.log("❌ Connection Error:", err));

const registrationSchema = new mongoose.Schema({
  studentName: String,
  pinNumber: String,
  branch: String,
  section: String,
  eventId: mongoose.Schema.Types.ObjectId,
  attended: { type: Boolean, default: false },
  score: { type: Number, default: 0 }
});

const Registration = mongoose.model("Registration", registrationSchema);

async function fixRegistrations() {
  try {
    // Get all registrations
    const regs = await Registration.find();
    console.log(`Found ${regs.length} registrations`);
    
    // Show current data
    console.log("\nCurrent registrations:");
    regs.forEach((reg, i) => {
      console.log(`${i + 1}. ID: ${reg._id}, Name: ${reg.studentName}, Attended: ${reg.attended}, Score: ${reg.score}`);
    });

    // Delete all and recreate
    console.log("\n🗑️  Deleting all registrations...");
    await Registration.deleteMany({});
    
    console.log("✅ All registrations deleted");
    console.log("\nYou can now register students again from the student dashboard");
    console.log("Or run insertData.js to add test data");
    
    process.exit(0);

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixRegistrations();
