// HOD Login Simulator - Run in DevTools Console on localhost:5000
console.log('🟢 HOD Login Simulator Ready!');

// 1. Create test HOD data (replace with real _id after admin add)
const testHod = {
  _id: 'temp_hod_id',
  username: 'hod1',
  password: '123456',
  fullName: 'Department Head CSE',
  department: 'CSE',
  year: '3',
  email: 'hod@cse.com'
};

// 2. Set localStorage for hodDashboard.html
localStorage.setItem('hodData', JSON.stringify(testHod));
localStorage.setItem('role', 'hod');
console.log('✅ localStorage set for HOD:', testHod);

// 3. Open HOD Dashboard
window.location.href = 'hodDashboard.html';
console.log('🚀 Redirecting to hodDashboard.html - Refresh if data not loading');

