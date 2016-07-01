'use strict';

var Http_Request_Hook = require('./http-request-hook');
var http = require('http');

var requestOptions = new Http_Request_Hook.options();

requestOptions.on('request', function(options, callback) {
    console.log('-------------------------------------------------------')
    console.log('On Request Emitted');
    console.log('-------------------------------------------------------')
});

requestOptions.on('response', function(req, res) {
    console.log('-------------------------------------------------------')
    console.log('On Response -- Emitted');
    console.log('-------------------------------------------------------')
});

requestOptions.on('responseEnd', function(req, res) {
    console.log('-------------------------------------------------------')
    console.log('On Response End Emited');
    console.log('-------------------------------------------------------')
});


Http_Request_Hook.applyRequestOptions(requestOptions, http);





var querystring = require('querystring');

var postData = querystring.stringify({
    'msg': 'Hello World!'
});

var options = {
    hostname: 'www.google.com',
    port: 80,
    path: '/upload',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length
    }
};


var req = http.request(options, (res) => {
    console.log(`------------------------------------------------------------------`);
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
    res.on('end', () => {
       console.log('No more data in response.')
    })
});

req.on('error', (e) => {
   console.log(`problem with request: ${e.message}`);
});

//write data to request body
req.write(postData);
req.end();
