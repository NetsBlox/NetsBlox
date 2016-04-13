'use strict';
var express = require('express'),
    path = require('path'),
    app = express(),
    port,
    vport,
    mongoURI;

require('dotenv').load({path: path.join(__dirname, '..', '.env')});

port = process.env.PORT || 8080;
vport = process.env.VANTAGE_PORT || 1234;
mongoURI = process.env.MONGO_URI || process.env.MONGOLAB_URI;

app.use(express.static(__dirname + '/client/'));

app.get('/', function(req, res) {
    res.redirect('/snap.html');
});

// Set the group manager
var opts = {
        port: port,
        vantagePort: vport,
        vantage: process.env.ENV !== 'production',
        mongoURI: mongoURI || 'mongodb://localhost:27017'
    };

var Server = require('../src/server/Server'),
    server = new Server(opts);

server.start();
