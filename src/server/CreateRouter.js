// This creates the express router for the server from the routes in ./routes
var express = require('express'),
    fs = require('fs'),
    path = require('path'),
    middleware = require('./routes/middleware'),
    logger;

var createRouter = function() {
    'use strict';
    
    var router = express.Router({mergeParams: true}),
        self = this;

    var routes = fs.readdirSync(path.join(__dirname, 'routes'))
        .filter(name => path.extname(name) === '.js')  // Only read js files
        .filter(name => name !== 'middleware.js')  // ignore middleware file
        .map(name => __dirname + '/routes/' + name)  // Create the file path
        .map(filePath => require(filePath))  // Load the routes
        .reduce((prev, next) => prev.concat(next), []);  // Merge all routes

    middleware.init(this);

    routes.forEach(function(api) {
        // TODO: Add an authentication step to user routes (check the cookie)
        var method = api.Method.toLowerCase();
        api.URL = '/' + api.URL;
        logger.log(`adding "${method}" to ${api.URL}`);

        // Add the middleware
        if (api.middleware) {
            logger.trace(`adding "${method}" to ${api.URL}`);
            var args = api.middleware.map(name => middleware[name]);
            args.unshift(api.URL);
            router.use.apply(router, args);
        }

        router.route(api.URL)[method](api.Handler.bind(self));
    });
    return router;
};

createRouter.init = _logger => logger = _logger.fork('API');

module.exports = createRouter;
