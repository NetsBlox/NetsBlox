// This creates the express router for the server from the routes in ./routes
var express = require('express'),
    userRoutes = require('./routes/Users'),
    projectRoutes = require('./routes/Projects'),
    basicRoutes = require('./routes/BasicRoutes'),

    debug = require('debug'),
    log = debug('NetsBlox:API:log');

var createRouter = function() {
    'use strict';
    
    var router = express.Router({mergeParams: true}),
        self = this;

    var routes = basicRoutes
        .concat(userRoutes)
        .concat(projectRoutes);

    routes.forEach(function(api) {
        // TODO: Add an authentication step to user routes (check the cookie)
        var method = api.Method.toLowerCase();
        log('adding "'+method+'" to /'+api.URL);
        router.route('/'+api.URL)[method](api.Handler.bind(self));
    });
    return router;
};

module.exports = createRouter;
