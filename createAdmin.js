require("dotenv").config();
const mongoose = require("mongoose");
const Admin = require("./models/Admin");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected ✅");
  await Admin.deleteMany({});
  await Admin.create({ username: "admin", password: "Admin@123", fullName: "System Admin", email: "admin@cem.edu.in" });
  console.log("✅ Admin created — username: admin | password: Admin@123");
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
