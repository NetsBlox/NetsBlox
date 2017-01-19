'use strict';
var path = require('path');
require('dotenv').load({
    path: path.join(__dirname, '..', '.env'),
    silent: true
});

var express = require('express'),
    app = express(),
    port,
    vport;

port = process.env.PORT || 8080;
vport = process.env.VANTAGE_PORT || 1234;

app.use(express.static(__dirname + '/client/'));

app.get('/', function(req, res) {
    res.redirect('/snap.html');
});

// Set the group manager
var opts = {
    port: port,
    vantagePort: vport,
    vantage: process.env.ENV !== 'production'
};

var Server = require('../src/server/Server'),
    server = new Server(opts);

server.start();
