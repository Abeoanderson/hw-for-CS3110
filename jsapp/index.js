#!/usr/bin/env node

const http = require('http');
const fs = require('fs/promises');
const sqlite3 = require('sqlite3').verbose();
const { createHmac, randomUUID } = require('crypto');

const secret = 'abcdefg';
const hash = (str) => createHmac('sha256', secret).update(str).digest('hex');

const db = new sqlite3.Database('passwd.sqlite');

// Ensure tables exist
const initDB = () => {
  db.run(`CREATE TABLE IF NOT EXISTS users (username TEXT UNIQUE, password TEXT, role TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS meals (uid TEXT PRIMARY KEY, name TEXT, type TEXT)`);

  // Create default admin user (abe:pass)
  const adminPass = hash('pass' + 'abe');
  db.run('INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)', ['abe', adminPass, 'admin']);
  const authPass = hash('pass2' + 'notabe');
  db.run('INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)', ['notabe', authPassPass, 'user']);

};

initDB();

// Authenticate user
const authenticate = (auth) => {
  if (!auth) return null;
  const [user, pass] = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
  return new Promise((resolve) => {
    db.get('SELECT * FROM users WHERE username = ? AND password = ?', [user, hash(pass + user)], (err, row) => {
      if (err || !row) return resolve(null);
      resolve(row);
    });
  });
};
const countdown = (res, count) => {
  res.write('data: ' + count + '\n\n')
  if(count > 0) {
    setTimeout(() => countdown(res, count -1), 1000)
  } else {
    res.end()
  }
}
const handleRequest = async (req, res) => {
  const [path, query] = req.url.split('?');
  if (req.method === 'GET' && path === '/api/meals') {
    db.all('SELECT * FROM meals', (err, rows) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(rows || []));
    });
  } else if (path == '/le-stream') {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':'keep-alive',
        'X-Accel-Buffering': 'no',
    })
    countdown(res, 10)

  } else if (['POST', 'PUT', 'DELETE'].includes(req.method) && path === '/api/meals') {
    const user = await authenticate(req.headers.authorization);
    if (!user) {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Meal Tracker"' });
      return res.end('Unauthorized');
    }

    let body = '';
    req.on('data', (chunk) => (body += chunk));

    req.on('end', () => {
      const params = body ? JSON.parse(body) : {};
      const uidMatch = query && query.match(/uid=([0-9a-f-]+)/);
      const uid = uidMatch ? uidMatch[1] : null;

      if (req.method === 'POST') {
        const newUid = randomUUID();
        db.run('INSERT INTO meals (uid, name, type) VALUES (?, ?, ?)', [newUid, params.name, params.type], () => {
          res.writeHead(201).end(newUid);
        });
      } else if (req.method === 'PUT' && uid) {
        db.run('UPDATE meals SET name = ?, type = ? WHERE uid = ?', [params.name, params.type, uid], () => {
          res.writeHead(200).end('Updated');
        });
      } else if (req.method === 'DELETE' && uid) {
        db.run('DELETE FROM meals WHERE uid = ?', [uid], () => {
          res.writeHead(200).end('Deleted');
        });
      } else {
        res.writeHead(400).end('Bad Request');
      }
    });
  } else if (req.method === 'POST' && path === '/api/users') {
    const user = await authenticate(req.headers.authorization);
    if (!user || user.role !== 'admin') {
      res.writeHead(403).end('Forbidden');
      return;
    }

    let body = '';
    req.on('data', (chunk) => (body += chunk));

    req.on('end', () => {
      const { username, password, role } = JSON.parse(body);
      if (!username || !password || (role !== 'admin' && role !== 'author')) {
        res.writeHead(400).end('Invalid data');
        return;
      }
      const hashedPassword = hash(password + username);
      db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hashedPassword, role], (err) => {
        if (err) res.writeHead(500).end('Error creating user');
        else res.writeHead(201).end('User created');
      });
    });
  } else {
    res.writeHead(404).end('Not Found');
  }
};

const server = http.createServer(handleRequest);
server.listen(3000, () => console.log('Server running on https://localhost:3000'));
