const http = require('http');

const req = http.request('http://localhost:3000/api/events', (res) => {
  console.log('Connected to SSE');
  res.on('data', (chunk) => {
    console.log('Received:', chunk.toString());
  });
});
req.end();

setTimeout(() => {
  console.log('Triggering update...');
  http.get('http://localhost:3000/api/test-event', (res) => {
    console.log('Trigger response:', res.statusCode);
  });
}, 2000);

setTimeout(() => {
  console.log('Exiting');
  process.exit(0);
}, 5000);
