// This creates the express router for the server from the routes in ./routes
var express = require('express'),
    userRoutes = require('./routes/Users'),
    basicRoutes = require('./routes/BasicRoutes'),

    debug = require('debug'),
    log = debug('NetsBlox:API:log');

var createRouter = function() {
    'use strict';
    
    var router = express.Router({mergeParams: true}),
        self = this;

    var routes = basicRoutes.concat(userRoutes);  // Add the user api

    routes.forEach(function(api) {
        // TODO: Add an authentication step to user routes (check the cookie)
        var method = api.Method.toLowerCase();
        console.log('adding "'+method+'" to /'+api.URL);
        router.route('/'+api.URL)[method](api.Handler.bind(self));
    });
    return router;
};

module.exports = createRouter;
