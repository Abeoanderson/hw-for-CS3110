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

const express = require('express');
const fs = require('fs');
const https = require('https');
const bcrypt = require('bcrypt');
const basicAuth = require('basic-auth');

const app = express();
app.use(express.json());

const USERS_FILE = 'passwd.db';
let foodLog = [];
let users = {};

// Load SSL certificates
const options = {
    key: fs.readFileSync('ssl/key.pem'),
    cert: fs.readFileSync('ssl/cert.pem')
};

// Load users from file
const loadUsers = () => {
    if (fs.existsSync(USERS_FILE)) {
        users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
};
loadUsers();

// Save users to file
const saveUsers = () => fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

// Authentication middleware
const auth = (req, res, next) => {
    const user = basicAuth(req);
    if (!user || !users[user.name]) return res.status(401).json({ error: "Unauthorized" });

    bcrypt.compare(user.pass, users[user.name].password, (err, result) => {
        if (err || !result) return res.status(401).json({ error: "Unauthorized" });
        req.user = users[user.name];
        next();
    });
};

// Get food entries (Unauthenticated)
app.get('/api', (req, res) => res.json(foodLog));

// Add food entry (Authenticated: Author/Admin)
app.post('/api', auth, (req, res) => {
    if (req.user.role !== "author" && req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

    const { name, calories } = req.body;
    if (!name || !calories) return res.status(400).json({ error: "Invalid data" });

    foodLog.push({ name, calories });
    res.json(foodLog);
});

// Update food entry (Authenticated: Author/Admin)
app.put('/api/:index', auth, (req, res) => {
    const index = parseInt(req.params.index, 10);
    if (isNaN(index) || !foodLog[index]) return res.status(404).json({ error: "Not found" });

    foodLog[index].calories = req.body.calories;
    res.json(foodLog);
});

// Delete food entry (Authenticated: Author/Admin)
app.delete('/api/:index', auth, (req, res) => {
    const index = parseInt(req.params.index, 10);
    if (isNaN(index) || !foodLog[index]) return res.status(404).json({ error: "Not found" });

    foodLog.splice(index, 1);
    res.json({ message: "Deleted", foodLog });
});

// Create new credentials (Only Admin)
app.post('/users', auth, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

    const { username, password, role } = req.body;
    if (!username || !password || (role !== "admin" && role !== "author")) {
        return res.status(400).json({ error: "Invalid data" });
    }

    if (users[username]) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    users[username] = { password: hashedPassword, role };
    saveUsers();

    res.json({ message: "User created", users });
});

// Start HTTPS Server
https.createServer(options, app).listen(3000, () => console.log("Server running on https://localhost:3000"));
