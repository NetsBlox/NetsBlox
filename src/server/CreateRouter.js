// This creates the express router for the server from the routes in ./routes
var express = require('express'),
    fs = require('fs'),
    path = require('path'),

    debug = require('debug'),
    log = debug('NetsBlox:API:log');

var createRouter = function() {
    'use strict';
    
    var router = express.Router({mergeParams: true}),
        self = this;

    var routes = fs.readdirSync(path.join(__dirname, 'routes'))
        .filter(name => path.extname(name) === '.js')  // Only read js files
        .map(name => __dirname + '/routes/' + name)  // Create the file path
        .map(filePath => require(filePath))  // Load the routes
        .reduce((prev, next) => prev.concat(next), []);  // Merge all routes

    routes.forEach(function(api) {
        // TODO: Add an authentication step to user routes (check the cookie)
        var method = api.Method.toLowerCase();
        log('adding "'+method+'" to /'+api.URL);
        router.route('/'+api.URL)[method](api.Handler.bind(self));
    });
    return router;
};

module.exports = createRouter;
