const fetch = require('node-fetch');

async function testServer() {
  console.log('Testing server endpoints...\n');
  
  try {
    // Test 1: Server is running
    console.log('1. Testing if server is running...');
    const testResponse = await fetch('http://localhost:5000/test');
    const testText = await testResponse.text();
    console.log('   ✅ Server is running:', testText);
    
    // Test 2: Get events
    console.log('\n2. Testing GET /api/events...');
    const eventsResponse = await fetch('http://localhost:5000/api/events');
    const events = await eventsResponse.json();
    console.log(`   ✅ Found ${events.length} events`);
    if (events.length > 0) {
      console.log(`   First event: ${events[0].title}`);
    }
    
    // Test 3: Get registrations for a student
    console.log('\n3. Testing GET /api/registrations/student/STU001...');
    const regsResponse = await fetch('http://localhost:5000/api/registrations/student/STU001');
    const regs = await regsResponse.json();
    console.log(`   ✅ Found ${regs.length} registrations for STU001`);
    
    // Test 4: Test registration endpoint (without actually registering)
    console.log('\n4. Testing POST /api/registrations endpoint...');
    console.log('   (Checking if endpoint exists - will get validation error)');
    const regTestResponse = await fetch('http://localhost:5000/api/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    console.log(`   Response status: ${regTestResponse.status}`);
    const regTestData = await regTestResponse.json();
    console.log(`   Response: ${regTestData.message}`);
    
    console.log('\n✅ All endpoint tests completed!');
    console.log('\nServer is ready for use.');
    
  } catch (error) {
    console.error('\n❌ Error testing server:', error.message);
    console.log('\nPlease make sure:');
    console.log('1. Server is running (node server.js)');
    console.log('2. MongoDB is running');
    console.log('3. Server is on port 5000');
  }
}

testServer();
