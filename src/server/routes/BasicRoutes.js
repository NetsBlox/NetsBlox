'use strict';
var R = require('ramda'),
    Utils = require('../ServerUtils.js'),
    API = require('./Users'),
    EXTERNAL_API = R.map(R.partial(R.omit,['Handler']), API),
    GameTypes = require('./GameTypes'),

    debug = require('debug'),
    log = debug('NetsBlox:API:log'),
    hash = require('../../client/sha512').hex_sha512;

module.exports = [
    { 
        Method: 'get', 
        URL: '/ResetPW',
        Handler: function(req, res) {
            console.log('password reset request:', req.query.Username);
            // Change the password
            // TODO
            // Look up the email
            // TODO
            // Email the user the temporary password
            // TODO
            res.status(200).send('ok');
        }
    },
    { 
        Method: 'get', 
        URL: '/SignUp',
        Handler: function(req, res) {
            console.log('Sign up request:', req.query.Username, req.query.Email);
            var uname = req.query.Username,
                email = req.query.Email,
                tmpPassword = 'password';

            // Must have an email and username
            if (!email || !uname) {
                log('Invalid request to /SignUp');
                return res.status(400).send('ERROR: need both username and email!');
            }

            this._users.findOne({username: uname}, function(e, user) {
                if (!user) {
                    // Default password is "password". Change server to update password
                    // and email it to the user 
                    // FIXME
                    var newUser = {username: uname, 
                                   email: email,
                                   hash: hash(tmpPassword),
                                   projects: []};

                    this.emailPassword(newUser, tmpPassword);
                    this._users.insert(newUser, function (err, result) {
                        if (err) {
                            return res.serverError(err);
                        }
                        log('Created new user: "'+uname+'"');
                        return res.sendStatus(200);
                    });
                    return;
                }
                log('User "'+uname+'" already exists. Could not make new user.');
                return res.status(401).send('ERROR: user exists');
            });
        }
    },
    { 
        Method: 'post', 
        URL: '/',
        Handler: function(req, res) {
            this._users.findOne({username: req.body.__u, hash: req.body.__h}, function(e, user) {
                console.log('error is', e);
                if (e) {
                    return res.serverError(e);
                }
                if (user) {  // Sign in 
                    req.session.username = req.body.__u;
                    return res.send(Utils.serializeArray(EXTERNAL_API));
                }

                return res.sendStatus(403);
            });
        }
    },
    // Add game types query
    { 
        Method: 'get', 
        URL: '/GameTypes',
        Handler: function(req, res) {
            return res.status(200).json(GameTypes);
        }
    }
];
