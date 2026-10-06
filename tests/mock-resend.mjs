// Minimal Resend stand-in for e2e tests. POST /emails records the payload, GET /__last returns it.
import { createServer } from 'node:http';

let last = null;
let count = 0;
createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/emails') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      last = { auth: req.headers.authorization, body: JSON.parse(body || '{}') };
      count++;
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ id: 'mock-id' }));
    });
  } else if (req.url === '/__last') {
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ count, last }));
  } else {
    res.writeHead(200).end('ok');
  }
}).listen(4398, () => console.log('mock resend on 4398'));
