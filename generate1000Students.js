require("dotenv").config();
const mongoose = require("mongoose");
const Student = require("./models/Student");

const firstNames = ["Aarav","Aditya","Akash","Arjun","Ashwin","Bharath","Deepak","Dinesh","Ganesh","Gopal",
  "Harish","Karthik","Krishna","Kumar","Lokesh","Manoj","Mohan","Naveen","Nikhil","Pavan",
  "Praveen","Rahul","Rajesh","Ravi","Rohit","Sanjay","Sathish","Senthil","Suresh","Vijay",
  "Vikram","Vishal","Vivek","Yogesh","Ananya","Bhavana","Deepika","Divya","Gayathri","Harini",
  "Ishwarya","Janani","Kavitha","Keerthana","Lakshmi","Meena","Nithya","Pooja","Priya","Ramya",
  "Ranjitha","Saranya","Shruthi","Sneha","Sowmya","Sridevi","Swathi","Usha","Varsha","Vimala"];

const lastNames = ["Kumar","Sharma","Reddy","Naidu","Pillai","Iyer","Rao","Nair","Menon","Krishnan",
  "Murugan","Selvam","Pandian","Rajan","Subramaniam","Venkatesh","Balaji","Sundaram","Natarajan","Anand",
  "Balasubramanian","Chandrasekaran","Durai","Eswaran","Ganesan","Hariharan","Jayakumar","Kalaivanan","Loganathan","Muthukumar"];

const branches = ["CSE","ECE","EEE","MECH","CIVIL","IT","AIDS","AIML"];
const sections = ["1","2","3","4","5","6","7","8","9","10"];
const years = ["1","2","3","4"];

function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pad(n, len) { return String(n).padStart(len, "0"); }

async function generate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected ✅");

    // Clear existing students (optional — comment out to keep existing)
    await Student.deleteMany({});

    const students = [];
    for (let i = 1; i <= 1000; i++) {
      const firstName = getRandom(firstNames);
      const lastName  = getRandom(lastNames);
      const branch    = getRandom(branches);
      const year      = getRandom(years);
      const section   = getRandom(sections);
      const rollNo    = pad(i, 4);
      const studentId = `CEM${year}${branch}${rollNo}`;
      const username  = `${firstName.toLowerCase()}${rollNo}`;

      students.push({
        studentId,
        username,
        password: "student123",
        pinNumber: pad(Math.floor(Math.random() * 9000) + 1000, 4),
        fullName: `${firstName} ${lastName}`,
        email: `${username}@cem.edu.in`,
        phone: `9${pad(Math.floor(Math.random() * 900000000) + 100000000, 9)}`,
        branch,
        section,
        year,
        profileImage: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=fbbf24&color=0a2540&size=200`
      });
    }

    await Student.insertMany(students);
    console.log("✅ 1000 students inserted successfully!");
    console.log(`Sample login — username: ${students[0].username} | password: student123`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

generate();
