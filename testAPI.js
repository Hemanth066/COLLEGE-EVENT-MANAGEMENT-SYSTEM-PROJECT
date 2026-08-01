// Test API endpoints

async function testAPI() {
  try {
    console.log("Testing API endpoints...\n");

    const response1 = await fetch("http://localhost:5000/api/register/all");
    const data1 = await response1.json();
    console.log("Response:", data1);

  } catch (error) {
    console.error("Error:", error.message);
  }
}

testAPI();
