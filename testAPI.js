// Test API endpoints
const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log("Testing API endpoints...\n");

    // Test 1: Get all registrations
    console.log("1. Testing GET /api/register/all");
    const response1 = await fetch("http://localhost:5000/api/register/all");
    const data1 = await response1.json();
    console.log("Response:", data1);
    
    if (data1.length > 0) {
      const firstReg = data1[0];
      console.log("\nFirst registration ID:", firstReg._id);
      
      // Test 2: Update attendance
      console.log("\n2. Testing PUT /api/register/attendance/:id");
      const response2 = await fetch(`http://localhost:5000/api/register/attendance/${firstReg._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attended: true })
      });
      const data2 = await response2.json();
      console.log("Response:", data2);
    }

  } catch (error) {
    console.error("Error:", error.message);
  }
}

testAPI();
