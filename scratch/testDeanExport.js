require('dotenv').config();
const http = require('http');

http.get('http://localhost:5000/api/admin/dean/naac-report/6a68bf69c45b1eb057b31ad2', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Dean NAAC Report Status:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log('NAAC Summary:', parsed.summary);
      console.log('Events Count:', parsed.events ? parsed.events.length : 0);
    } catch (e) {
      console.log('Error parsing JSON:', e.message);
    }
  });
});

http.get('http://localhost:5000/api/admin/dean/export-excel/6a68bf69c45b1eb057b31ad2', (res) => {
  console.log('\nDean Excel Export Status:', res.statusCode);
  console.log('Content-Type:', res.headers['content-type']);
  console.log('Content-Disposition:', res.headers['content-disposition']);
});
