#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const { createHmac, randomUUID } = require('crypto');
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('passwd.sqlite');

const secret = 'abcdefg';
const hash = (str) => createHmac('sha256', secret).update(str).digest('hex');

db.run(`CREATE TABLE IF NOT EXISTS meals (id TEXT PRIMARY KEY, name TEXT, type TEXT)`);
db.run(`CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password TEXT, role TEXT)`);

const authenticate = (auth = '') => {
  const [user, pass] = Buffer.from(auth.slice(6), 'base64').toString().split(':');
  return new Promise((resolve) => {
    db.get('SELECT * FROM users WHERE username = ? AND password = ?', [user, hash(pass + user)], (err, row) => {
      if (err || !row) return resolve(null);
      resolve(row);
    });
  });
};

const handleRequest = async (req, res) => {
  const [path] = req.url.split('?');

  if (req.method === 'GET' && path === '/api/meals') {
    db.all('SELECT * FROM meals', (err, rows) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(rows));
    });
    return;
  }

  if (['POST', 'PUT', 'DELETE'].includes(req.method) && path.startsWith('/api/meals')) {
    const user = await authenticate(req.headers.authorization);
    if (!user) {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Secure"' });
      return res.end();
    }

    if (req.method === 'POST' && user.role === 'author') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const { name, type } = JSON.parse(body);
        const id = randomUUID();
        db.run('INSERT INTO meals VALUES (?, ?, ?)', [id, name, type], () => {
          res.writeHead(201).end();
        });
      });
    }
  }
};

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

// Start the server
const server = http.createServer(handleRequest);
server.listen(3000, () => console.log("Server running on port 3000"));
