// endpoints for managing groups
'use strict';

const Logger = require('../logger'),
    logger = new Logger('netsblox:api:Groups'),
    // Storage = require('../src/server/storage/storage'),
    // storage = new Storage(logger),
    Users = require('../storage/users'),
    Groups = require('../storage/groups');

// assuming group names are unique (id)
// TODO check if user has access to the group
// TODO group-user association as admin or teacher

module.exports = [
    {
        URL: 'groups',
        Method: 'GET',
        middleware: ['isLoggedIn'],
        Handler: function(req) {
            // gets a list of groups
            logger.trace('About to print all groups');
            return Groups.all();
        }
    },
    {
        URL: 'groups/:name',
        Method: 'GET',
        middleware: ['isLoggedIn'],
        Handler: function(req) {
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
        Handler: function(req) {
            // create a new group
            // console.log(req);
            let groupName = req.body.name;
            let owner = req.session.username;
            logger.info('creating group', groupName, 'with owner', owner);
            return Groups.new(groupName, owner);
        }
    },
    {
        // TODO add member removal
        // add new members
        URL: 'groups/:name/members',
        Method: 'POST',
        middleware: ['isLoggedIn', 'isGroupOwner'],
        Handler: function(req) {
            let username = req.body.username,
                groupName = req.params.name,
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
        middleware: ['isLoggedIn', 'isGroupOwner'],
        Handler: function(req) {
            // delete a group
            let groupName = req.params.name;
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
