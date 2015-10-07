'use strict';
var express = require('express'),
    app = express(),
    port = process.env.PORT || 8080,
    mongoURI = process.env.MONGO_URI || process.env.MONGOLAB_URI;

require('dotenv').load();
app.use(express.static(__dirname + '/client/'));

app.get('/', function(req, res) {
    res.redirect('/snap.html');
});

// Set the group manager
var opts = {
        port: port,
        mongoURI: mongoURI || 'mongodb://localhost:27017'
    };

var Server = require('../src/server/Server'),
    server = new Server(opts);

server.start();
