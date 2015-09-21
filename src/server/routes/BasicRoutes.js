'use strict';
var R = require('ramda'),
    Utils = require('../ServerUtils.js'),
    UserAPI = require('./Users'),
    ProjectAPI = require('./Projects'),
    EXTERNAL_API = R.map(R.partial(R.omit,['Handler']), UserAPI.concat(ProjectAPI)),
    GameTypes = require('./GameTypes'),

    debug = require('debug'),
    log = debug('NetsBlox:API:log'),
    hash = require('../../client/sha512').hex_sha512,
    randomString = require('just.randomstring'),
    fs = require('fs'),
    path = require('path'),

    // PATHS
    COSTUMES_PATH = path.join(__dirname, '..', '..', 'client', 'Costumes'),
    SOUNDS_PATH = path.join(__dirname, '..', '..', 'client', 'Sounds'),
    EXAMPLES_PATH = path.join(__dirname, '..', '..', 'client', 'Examples');

var generateRandomPassword = randomString.bind(null, 8),
    makeDummyHtml = function(list) {
        return list.map(function(item) {
            return '<a href="'+item+'">'+item+'</a><br/>';
        }).join('\n');
    };

module.exports = [
    { 
        Method: 'get', 
        URL: 'ResetPW',
        Handler: function(req, res) {
            log('password reset request:', req.query.Username);
            var self = this,
                username = req.query.Username,
                email,
                password;

            // Look up the email
            self._users.findOne({username: username}, function(e, user) {
                if (e) {
                    log('Could not find user to reset password. Error: '+e);
                    return res.serverError(e);
                }

                if (user) {
                    email = user.email;
                    password = generateRandomPassword();
                    // Change the password
                    self._users.update({username: username}, {$set: {hash: hash(password)}}, function(e, data) {
                        var result = data.result;

                        if (result.nModified === 0 || e) {
                            log('Could not set temp password for "'+username+'"');
                            return res.status(403).send('ERROR: could not set temporary password');
                        }

                        // Email the user the temporary password
                        self.emailPassword(user, password);
                        return res.send('A temporary password has been emailed to you');
                    });
                } else {
                    return res.status(404).send('ERROR: could not find user "'+username+'"');
                }
            });
        }
    },
    { 
        Method: 'get', 
        URL: 'SignUp',
        Handler: function(req, res) {
            log('Sign up request:', req.query.Username, req.query.Email);
            var self = this,
                uname = req.query.Username,
                email = req.query.Email,
                tmpPassword = generateRandomPassword();

            // Must have an email and username
            if (!email || !uname) {
                log('Invalid request to /SignUp');
                return res.status(400).send('ERROR: need both username and email!');
            }

            self._users.findOne({username: uname}, function(e, user) {
                if (!user) {
                    // Default password is "password". Change server to update password
                    // and email it to the user 
                    var newUser = {username: uname, 
                                   email: email,
                                   hash: hash(tmpPassword),
                                   projects: []};

                    self.emailPassword(newUser, tmpPassword);
                    self._users.insert(newUser, function (err, result) {
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
        URL: '',
        Handler: function(req, res) {
            this._users.findOne({username: req.body.__u, hash: req.body.__h}, function(e, user) {
                if (e) {
                    log('Could not find user "'+req.body.__u+'": ' +e);
                    return res.serverError(e);
                }
                if (user) {  // Sign in 
                    req.session.username = req.body.__u;
                    log('"'+req.session.username+'" has logged in.');
                    return res.send(Utils.serializeArray(EXTERNAL_API));
                }
                log('Could not find user "'+req.body.__u+'"');

                return res.sendStatus(403);
            });
        }
    },
    // Costumes
    { 
        Method: 'get', 
        URL: 'Costumes',
        Handler: function(req, res) {
            // Load the costumes and create rough HTML content...
            fs.readdir(COSTUMES_PATH, function(err, costumes) {
                if (err) {
                    return res.send(err);
                }

                var result = costumes.map(function(costume) {
                    return '<a href="'+costume+'">'+costume+'</a><br/>';
                }).join('\n');
                return res.send(result);
            });
        }
    },
    // Sounds
    { 
        Method: 'get', 
        URL: 'Sounds',
        Handler: function(req, res) {
            // Load the costumes and create rough HTML content...
            fs.readdir(SOUNDS_PATH, function(err, sounds) {
                if (err) {
                    return res.send(err);
                }

                var result = makeDummyHtml(sounds);
                return res.send(result);
            });
        }
    },
    // Examples
    { 
        Method: 'get', 
        URL: 'Examples',
        Handler: function(req, res) {
            // Load the examples
            fs.readdir(EXAMPLES_PATH, function(err, examples) {
                if (err) {
                    return res.send(err);
                }

                var result = makeDummyHtml(examples);
                return res.send(result);
            });
        }
    },
    // Add game types query
    { 
        Method: 'get', 
        URL: 'GameTypes',
        Handler: function(req, res) {
            return res.status(200).json(GameTypes);
        }
    }
];
