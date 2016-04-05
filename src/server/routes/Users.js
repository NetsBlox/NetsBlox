// User endpoints adapted from the Snap! server API. These are used by the server
// to create the endpoints and by the client to discover the endpoint urls
'use strict';

var _ = require('lodash'),
    // Logging
    // TODO: change this to something with forking
    debug = require('debug'),
    log = debug('NetsBlox:API:Users:log'),
    info = debug('NetsBlox:API:Users:info');

module.exports = [
        {
            Service: 'cancelAccount',
            Parameters: '',
            Method: 'Post',
            Note: 'Cancel the user account.',
            Handler: function(req, res) {
                var username = req.session.username;
                log('Deleting user "'+username+'"');
                this.storage.users.get(username, function(e, user) {
                    if (e || !user) {
                        return res.serverError(e || 'Could not remove "'+username+'"');
                    }
                    user.destroy();
                    req.session.destroy();
                    return res.send('account for "'+username+'" has been deleted');
                });
            }
        },
        {
            Service: 'logout',
            Parameters: '',
            Method: 'Get',
            Note: '',
            Handler: function(req, res) {
                log(req.session.username+' has logged out');
                req.session.destroy();
                return res.status(200).send('you have been logged out');
            }
        },
        {
            Service: 'changePassword',
            Parameters: 'OldPassword,NewPassword',
            Method: 'Post',
            Note: '',
            Handler: function(req, res) {
                var oldPassword = req.body.OldPassword,
                    username = req.session.username,
                    newPassword = req.body.NewPassword;

                info('Changing password for '+username);
                console.log('Changing password for '+username);
                // Verify that the old password is correct
                this.storage.users.get(username, (e, user) => {
                        if (e) {
                            return res.serverError('ERROR: ' + e);
                        }
                        if (!user || user.hash !== oldPassword) {
                            return res.status(403).send('ERROR: incorrect login');
                        }
                        user.hash = newPassword;
                        user.save();
                        return res.send('Password has been updated!');
                });
            }
        }
    ]
    .map(function(api) {
        // Set the URL to be the service name
        api.URL = api.Service;
        return api;
    });
