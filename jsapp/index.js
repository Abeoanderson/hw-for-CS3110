#!/usr/bin/env node
const http = require('http')
const fs = require('node:fs');
const { createHmac, randomUUID } = require('node:crypto');

const secret = 'abcdefg';
const hash = (str) =>
    createHmac('sha256', secret).update(str).digest('hex');

let users

fs.readFile('../passwd.db', 'utf8', (err, data) => {
        if(err) {
                console.error(err);
                return;
        }
        users = JSON.parse(data)
});


const authenticate = (auth = '') => {
    // const [user, pass] = atob(auth.slice(6)).split(':')
    // console.log("User:", user);
    // console.log("Pass:", pass);
    // const generatedHash = hash(pass + user);
    // console.log("Generated Hash:", generatedHash);
    // console.log("Stored Hash:", users[user]);
    // return !!user && !!pass && users[user] === generatedHash;
    return true;
}



let foodLog = [];
const handleRequest = (req, res) => {

    // Add CORS headers to allow requests from other origins
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow any origin
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE'); // Allow methods
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Allow necessary headers


    console.log(req.method, req.url)
    console.log('special log')
    const [path, query] = req.url.split('?')
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        console.log(req.headers)
        if (!authenticate(req.headers.authorization)) {
            res.writeHead(401, {
                "WWW-Authenticate": "Basic realm='oo laa'"
            })
            res.end()
        } else {
            let uid = query && query.match(/uid=([0-9a-f-]+)/)
            if (req.method === 'DELETE') {
                if (uid[1]) {
                    foodLog = foodLog.filter(
                        (d) => d.uid != uid[1]
                    )
                    res.writeHead(200).end()
                } else {
                    res.writeHead(400).end()
                }
            } else {
                let body = ''
                req.on('data', (data) => {
                    body += data
                })
                req.on('end', () => {
                    try {
                        const params = JSON.parse(body)
                        if (!uid && req.method == 'POST') {
                            uid = randomUUID()
                            foodLog.push({ ...params, uid })
                            res.writeHead(201).end(uid)
                        } else if (uid && req.method == 'PUT') {
                            const i = foodLog.findIndex(
                                (d) => d.uid == uid[1]
                            )
                            if (i >= 0) {
                                foodLog[i] = params
                                res.writeHead(200).end()
                            } else {
                                res.writeHead(404).end()
                            }
                        } else {
                            res.writeHead(400).end()
                        }
                    } catch {
                        res.writeHead(400).end()
                    }
                })
            }
        }
    } else {
        res.writeHead(200, {
            "Content-Type": "application/json"
        })
        res.write(JSON.stringify(foodLog))
        // res.write(JSON.stringify('you are talking to the API'))
        res.end()
    }
}

// Start the server
const server = http.createServer(handleRequest);
server.listen(3000, () => console.log("Server running on port 3000"));
