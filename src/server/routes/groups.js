// endpoints for managing groups
'use strict';

const Storage = require('../storage/storage'),
    Logger = require('../logger'),
    Groups = require('../storage/groups'),
    middleware = require('./middleware'),
    logger = new Logger('netsblox:api:Groups'),
    storage = new Storage(logger);

module.exports = [
    {
        URL: 'groups',
        Method: 'GET',
        middleware: ['isLoggedIn'],
        Handler: function(req, res) {
            // gets a list of groups
        }
    },
    {
        URL: 'groups/:id',
        Method: 'GET',
        middleware: ['isLoggedIn'],
        Handler: function(req, res) {
            // a specific group's details
        }
    },
    {
        URL: 'groups',
        Method: 'POST',
        middleware: ['isLoggedIn'],
        Handler: function(req, res) {
            // create a new group
        }
    },
    {
        URL: 'groups/:id',
        Method: 'PUT',
        middleware: ['isLoggedIn'],
        Handler: function(req, res) {
            // update a group (overriding)
        }
    },
    {
        URL: 'groups/:id',
        Method: 'DELETE',
        middleware: ['isLoggedIn'],
        Handler: function(req, res) {
            // delete a group
        }
    },
];
