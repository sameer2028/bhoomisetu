const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/audit?entity_type=ai_mismatch&limit=5',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test' // Might need real token if authenticated, let's see. 
  }
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'DATA:', data));
});
req.on('error', e => console.error(e));
req.end();
