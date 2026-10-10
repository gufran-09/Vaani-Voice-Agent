const http = require('http');

const data = JSON.stringify({
  transcript: 'menu',
  sessionId: 'test-session-menu-' + Date.now(),
});

const req = http.request(
  {
    hostname: 'localhost',
    port: 3000,
    path: '/api/agent/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  },
  (res) => {
    let body = '';
    res.on('data', (chunk) => (body += chunk));
    res.on('end', () => {
      console.log('STATUS:', res.statusCode);
      console.log('RESPONSE:', body);
    });
  }
);

req.on('error', (e) => {
  console.error('ERROR:', e);
});

req.write(data);
req.end();
