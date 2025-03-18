#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const { createHmac, randomUUID } = require('crypto');
const sqlite3 = require('sqlite3').verbose();

const secret = 'abcdefg';
const hash = (str) => createHmac('sha256', secret).update(str).digest('hex');

const db = new sqlite3.Database('passwd.sqlite');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  )`);

  db.get('SELECT * FROM users WHERE username = ?', ['abe'], (err, row) => {
    if (!row) {
      db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['abe', hash('passabe'), 'admin']);
      console.log('Admin user created: abe:pass');
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    type TEXT,
    uid TEXT
  )`);
});

const authenticate = (auth = '') => {
  try {
    const [user, pass] = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
    return new Promise((resolve) => {
      db.get('SELECT * FROM users WHERE username = ?', [user], (err, row) => {
        if (row && row.password === hash(pass + user)) {
          resolve(row);
        } else {
          resolve(null);
        }
      });
    });
  } catch {
    return Promise.resolve(null);
  }
};

const handleRequest = async (req, res) => {
  const [path] = req.url.split('?');
  const user = await authenticate(req.headers.authorization);

  if (req.method === 'GET' && path === '/api/meals') {
    db.all('SELECT * FROM meals', (err, rows) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(rows));
    });
  } else if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    if (!user) {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Meal Tracker"' });
      res.end('Unauthorized');
      return;
    }

    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const data = JSON.parse(body);
      if (req.method === 'POST' && path === '/api/meals') {
        const uid = randomUUID();
        db.run('INSERT INTO meals (name, type, uid) VALUES (?, ?, ?)', [data.name, data.type, uid], () => {
          res.writeHead(201).end(uid);
        });
      } else if (req.method === 'DELETE' && path.startsWith('/api/meals/')) {
        const uid = path.split('/').pop();
        db.run('DELETE FROM meals WHERE uid = ?', [uid], () => {
          res.writeHead(200).end('Deleted');
        });
      } else if (req.method === 'POST' && path === '/api/users' && user.role === 'admin') {
        db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [data.username, hash(data.password + data.username), data.role], () => {
          res.writeHead(201).end('User created');
        });
      } else {
        res.writeHead(403).end('Forbidden');
      }
    });
  } else if (req.method === 'GET' && path === '/api/logout') {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Meal Tracker"' });
    res.end('Logged out');
  } else {
    res.writeHead(404).end('Not Found');
  }
};

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
};

https.createServer(options, handleRequest).listen(3000, () => {
  console.log('Server running on https://localhost:3000');
});