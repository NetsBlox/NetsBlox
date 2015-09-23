'use strict';
var express = require('express'),
    app = express(),
    argv = require('yargs').argv,
    port = process.env.PORT || 8080,
    wsPort = process.env.WS_PORT || 5432,
    mongoURI = process.env.MONGO_URI || process.env.MONGOLAB_URI,
    fs = require('fs'),
    path = require('path');

app.use(express.static(__dirname + '/client/'));

app.get('/', function(req, res) {
    res.redirect('/snap.html');
});

// Set the group manager
var opts = {
        port: port,
        wsPort: wsPort,
        path: '',
        mongoURI: mongoURI || 'mongodb://localhost:27017'
    };

var Server = require('../src/server/Server'),
    server = new Server(opts);

server.start();
