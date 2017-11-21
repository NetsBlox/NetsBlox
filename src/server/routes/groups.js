// endpoints for managing groups
'use strict';

const Logger = require('../logger'),
    middleware = require('./middleware'),
    logger = new Logger('netsblox:api:Groups'),
    // Storage = require('../src/server/storage/storage'),
    // storage = new Storage(logger),
    Users = require('../storage/users'),
    Groups = require('../storage/groups');

// TODO check if user has access to the group

module.exports = [
    {
        URL: 'groups',
        Method: 'GET',
        middleware: ['isLoggedIn'],
        Handler: function(req, res) {
            // gets a list of groups
            logger.trace('About to print all groups');
            return Groups.all();
        }
    },
    {
        URL: 'groups/:name',
        Method: 'GET',
        middleware: ['isLoggedIn'],
        Handler: function(req, res) {
            // a specific group's details: (which only include members)
            let groupName = req.params.name;
            return Groups.get(groupName).then( group => {
                return group.getMembers();
            });
        }
    },
    {
        URL: 'groups',
        Method: 'POST',
        middleware: ['isLoggedIn'],
        Handler: function(req, res) {
            // create a new group
            let groupName = req.query.name;
            logger.info('removing group', groupName);
            return Groups.new(groupName);
        }
    },
    {
        URL: 'groups/:name',
        Method: 'PUT',
        middleware: ['isLoggedIn'],
        Handler: function(req, res) {
            // update a group (overriding)
        }
    },
    {
        URL: 'groups/:name',
        Method: 'PATCH',
        middleware: ['isLoggedIn'],
        Handler: function(req, res) {
            // not that RESTy..
            // update a add or remove user
            // TODO add member removal
            let username = req.query.username,
                groupName = req.params.query,
                user;
            return Users.get(username)
                .then(_user => {
                    user = _user;
                    if (!user) {
                        throw 'User not found';
                    }
                    return Groups.get(groupName);
                })
                .then(group => {
                    if (!group) throw 'Group not found';
                    return group.addMember(user);
                });
        }
    },
    {
        URL: 'groups/:name',
        Method: 'DELETE',
        middleware: ['isLoggedIn'],
        Handler: function(req, res) {
            // delete a group
            let groupName = req.query.name;
            logger.info('removing group', groupName);
            return Groups.remove(groupName);
        }
    },
].map(route => { // handle the actual sending of the results
    let handler = route.Handler;
    route.Handler = (req, res) => {
        handler(req, res)
            .then( val => {
                res.status(200).send(val);
            })
            .catch(e => {
                logger.error(e);
                res.status(500).send();
            });
    };
    return route;
});
