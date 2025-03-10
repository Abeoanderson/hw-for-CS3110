#!/usr/bin/env node
const http = require('http')
const fs = require('node:fs');
const { createHmac, randomUUID } = require('node:crypto');

const secret = 'abcdefg';
const hash = (str) =>
    createHmac('sha256', secret).update(str).digest('hex');

let users
fs.readFile('passwd.db', 'utf8', (err, data) => {
    if (err) {
        console.error(err);
        return;
    }
    users = JSON.parse(data)
});

const authenticate = (auth = '') => {
    const [ user, pass ] = atob(auth.slice(6)).split(':')
    return !!user && !!pass && users[user] === hash(pass + user)
}

let foodLog = [];

const handleRequest = (req, res) => {
    const urlParts = req.url.split('/');
    const index = urlParts.length > 2 ? parseInt(urlParts[2], 10) : null;
    if 
    if (req.method === "POST") {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const entry = JSON.parse(body);
                foodLog.push(entry);
                sendResponse(res, 200, foodLog);
            } catch {
                sendResponse(res, 400, { error: "Invalid data format" });
            }
        });
    }
    else if (req.method === "GET") {
        sendResponse(res, 200, foodLog);
    }
    else if (req.method === "PUT" && index !== null && !isNaN(index)) {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                if (foodLog[index]) {
                    foodLog[index].calories = data.calories;
                    sendResponse(res, 200, foodLog);
                } else {
                    sendResponse(res, 404, { error: "Entry not found" });
                }
            } catch {
                sendResponse(res, 400, { error: "Invalid data format" });
            }
        });
    }
    else if (req.method === "DELETE" && index !== null && !isNaN(index)) {
        if (index >= 0 && index < foodLog.length) {
            foodLog.splice(index, 1);
            sendResponse(res, 200, { message: "Entry deleted successfully", foodLog });
        } else {
            sendResponse(res, 404, { error: "Entry not found" });
        }
    }
    else {
        sendResponse(res, 405, { error: "Method not allowed" });
    }
};

// Function to send JSON response
const sendResponse = (res, status, data) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
};

// Start the server
const server = http.createServer(handleRequest);
server.listen(3000, () => console.log("Server running on port 3000"));
