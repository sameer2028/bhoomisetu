const jwt = require('jsonwebtoken');
const fs = require('fs');
const http = require('http');
const path = require('path');
const env = require('./src/config/env');

const token = jwt.sign({ userId: 1, role: 'ADMIN' }, env.jwtSecret, { expiresIn: '1h' });

const req = http.request({
  hostname: 'localhost',
  port: 5001,
  path: '/api/documents',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW'
  }
}, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(`BODY: ${data}`);
  });
});

req.on('error', (e) => {
  console.error(`request error: ${e.message}`);
});

req.write(
  '------WebKitFormBoundary7MA4YWxkTrZu0gW\r\n' +
  'Content-Disposition: form-data; name="title"\r\n\r\n' +
  'Test Doc\r\n' +
  '------WebKitFormBoundary7MA4YWxkTrZu0gW\r\n' +
  'Content-Disposition: form-data; name="file"; filename="test.txt"\r\n' +
  'Content-Type: text/plain\r\n\r\n' +
  'hello world\r\n' +
  '------WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n'
);
req.end();
