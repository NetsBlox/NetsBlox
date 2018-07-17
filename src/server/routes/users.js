// User endpoints adapted from the Snap! server api. These are used by the server
// to create the endpoints and by the client to discover the endpoint urls
'use strict';

var middleware = require('./middleware'),
    NetworkTopology = require('../network-topology'),
    debug = require('debug'),
    log = debug('netsblox:api:Users:log'),
    info = debug('netsblox:api:Users:info');

module.exports = [
    {
        Service: 'cancelAccount',
        Parameters: '',
        Method: 'Post',
        Note: 'Cancel the user account.',
        middleware: ['isLoggedIn'],
        Handler: function(req, res) {
            var username = req.session.username;
            log('Deleting user "'+username+'"');
            return this.storage.users.get(username)
                .then(user => {
                    if (!user) {
                        return res.status(500).send(`Could not remove "${username}": user not found`);
                    }
                    user.destroy();
                    req.session.destroy();
                    return res.send('account for "'+username+'" has been deleted');
                })
                .catch(err => res.status(500).send(err));
        }
    },
    {
        Service: 'logout',
        Parameters: 'clientId',
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            log('received logout request!');
            middleware.tryLogIn(req, res, err => {
                if (err) {
                    return res.status(400).send(err);
                }

                // get the socket and call onLogout
                const {clientId} = req.body;
                const socket = NetworkTopology.getSocket(clientId);
                if (socket) {
                    socket.onLogout();
                }

                log(`${req.session.username} has logged out`);
                // Delete the cookie
                req.session.destroy();
                return res.status(200).send('you have been logged out');
            }, true);  // Don't refresh the cookie!
        }
    },
    {
        Service: 'changePassword',
        Parameters: 'OldPassword,NewPassword',
        Method: 'Post',
        middleware: ['isLoggedIn'],
        Handler: function(req, res) {
            var oldPassword = req.body.OldPassword,
                username = req.session.username,
                newPassword = req.body.NewPassword;

            info('Changing password for '+username);
            // Verify that the old password is correct
            this.storage.users.get(username)
                .then(user => {
                    if (!user || user.hash !== oldPassword) {
                        return res.status(403).send('ERROR: incorrect login');
                    }
                    user.hash = newPassword;
                    user.save();
                    return res.send('Password has been updated!');
                })
                .catch(err => res.status(500).send('ERROR: ' + err));
        }
    }
]
    .map(function(api) {
    // Set the URL to be the service name
        api.URL = api.Service;
        return api;
    });
