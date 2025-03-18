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

const handleRequest = async (req, res) => {
  const [path, query] = req.url.split('?');

  if (req.method === 'GET' && path === '/api/meals') {
    db.all('SELECT * FROM meals', (err, rows) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(rows || []));
    });
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
  } else {
    res.writeHead(404).end('Not Found');
  }
};

const server = http.createServer(handleRequest);
server.listen(3000, () => console.log('Server running on https://localhost:3000'));
