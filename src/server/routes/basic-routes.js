'use strict';
var R = require('ramda'),
    _ = require('lodash'),
    Q = require('q'),
    useragent = require('useragent'),
    Utils = _.extend(require('../utils'), require('../server-utils.js')),
    PublicProjects = require('../storage/public-projects'),
    UserAPI = require('./users'),
    RoomAPI = require('./rooms'),
    ProjectAPI = require('./projects'),
    EXTERNAL_API = UserAPI
        .concat(ProjectAPI)
        .concat(RoomAPI)
        .filter(api => api.Service)
        .map(R.omit.bind(R, 'Handler'))
        .map(R.omit.bind(R, 'middleware')),

    debug = require('debug'),
    log = debug('netsblox:api:log'),
    middleware = require('./middleware'),
    SocketManager = require('../socket-manager'),
    saveLogin = middleware.saveLogin;

const BugReporter = require('../bug-reporter');
const Messages = require('../storage/messages');

module.exports = [
    { 
        Method: 'get', 
        URL: 'ResetPW',
        Handler: function(req, res) {
            log('password reset request:', req.query.Username);
            var self = this,
                username = req.query.Username;

            // Look up the email
            self.storage.users.get(username)
                .then(user => {
                    if (user) {
                        delete user.hash;  // force tmp password creation
                        user.save();
                        return res.sendStatus(200);
                    } else {
                        log('Could not find user to reset password (user "'+username+'")');
                        return res.status(400).send('ERROR: could not find user "'+username+'"');
                    }
                })
                .catch(e => {
                    log('Server error when looking for user: "'+username+'". Error:', e);
                    return res.status(500).send('ERROR: ' + e);
                });
        }
    },
    { 
        Method: 'post',  // post would make more sense...
        URL: 'SignUp',
        Handler: function(req, res) {
            log('Sign up request:', req.body.Username, req.body.Email);
            var self = this,
                uname = req.body.Username,
                password = req.body.Password,
                email = req.body.Email;

            // Must have an email and username
            if (!email || !uname) {
                log('Invalid request to /SignUp');
                return res.status(400).send('ERROR: need both username and email!');
            }

            // validate username
            if (uname[0] === '_') {
                return res.status(400).send('ERROR: invalid username');
            }

            self.storage.users.get(uname)
                .then(user => {
                    if (!user) {
                        var newUser = self.storage.users.new(uname, email);
                        newUser.hash = password || null;
                        newUser.save();
                        return res.send('User Created!');
                    }
                    log('User "'+uname+'" already exists. Could not make new user.');
                    return res.status(401).send('ERROR: user exists');
                });
        }
    },
    { 
        Method: 'post',
        URL: 'SignUp/validate',
        Handler: function(req, res) {
            log('Signup/validate request:', req.body.Username, req.body.Email);
            var uname = req.body.Username,
                email = req.body.Email;

            // Must have an email and username
            if (!email || !uname) {
                log('Invalid request to /SignUp/validate');
                return res.status(400).send('ERROR: need both username and email!');
            }

            this.storage.users.get(uname)
                .then(user => {
                    if (!user) {
                        return res.send('Valid User Signup Request!');
                    }
                    log('User "'+uname+'" already exists.');
                    return res.status(401).send('ERROR: user exists');
                });
        }
    },
    { 
        Method: 'post', 
        URL: '',  // login method
        Handler: function(req, res) {
            var hash = req.body.__h,
                isUsingCookie = !req.body.__u,
                socket;

            // Should check if the user has a valid cookie. If so, log them in with it!
            middleware.tryLogIn(req, res, (err, loggedIn) => {
                let username = req.body.__u || req.session.username;
                if (err) {
                    return res.status(500).send(err);
                }

                if (!username) {
                    log('"passive" login failed - no session found!');
                    if (req.body.silent) {
                        return res.sendStatus(204);
                    } else {
                        return res.sendStatus(403);
                    }
                }

                // Explicit login
                log(`Logging in as ${username}`);
                return this.storage.users.get(username)
                    .then(user => {
                        if (user && (loggedIn || user.hash === hash)) {  // Sign in 
                            if (!isUsingCookie) {
                                saveLogin(res, user, req.body.remember);
                            }

                            log(`"${user.username}" has logged in.`);

                            // Associate the websocket with the username
                            socket = SocketManager.getSocket(req.body.socketId);
                            if (socket) {  // websocket has already connected
                                socket.onLogin(user);
                            }

                            user.recordLogin();
                            if (req.body.return_user) {
                                return res.status(200).json({
                                    username: username,
                                    admin: user.admin,
                                    email: user.email,
                                    api: req.body.api ? Utils.serializeArray(EXTERNAL_API) : null
                                });
                            } else {
                                return res.status(200).send(Utils.serializeArray(EXTERNAL_API));
                            }
                        } else {
                            if (user) {
                                log(`Incorrect password attempt for ${user.username}`);
                                return res.status(403).send('Incorrect password');
                            }
                            log(`Could not find user "${username}"`);
                            return res.status(403).send(`Could not find user "${username}"`);
                        }
                    })
                    .catch(e => {
                        log(`Could not find user "${username}": ${e}`);
                        return res.status(500).send('ERROR: ' + e);
                    });
            });
        }
    },
    // get start/end network traces
    {
        Method: 'get',
        URL: 'trace/start/:socketId',
        Handler: function(req, res) {
            let {socketId} = req.params;

            let socket = SocketManager.getSocket(socketId);
            if (!socket) return res.status(401).send('ERROR: Could not find socket');

            let room = socket.getRawRoom();
            if (!room) {
                this._logger.error(`Could not find active room for "${socket.username}" - cannot get messages!`);
                return res.status(500).send('ERROR: room not found');
            }

            const project = room.getProject();
            return project.startRecordingMessages(socketId)
                .then(time => res.json(time));
        }
    },
    {
        Method: 'get',
        URL: 'trace/end/:socketId',
        Handler: function(req, res) {
            let {socketId} = req.params;

            let socket = SocketManager.getSocket(socketId);
            if (!socket) return res.status(401).send('ERROR: Could not find socket');

            let room = socket.getRawRoom();
            if (!room) {
                this._logger.error(`Could not find active room for "${socket.username}" - cannot get messages!`);
                return res.status(500).send('ERROR: room not found');
            }

            const project = room.getProject();
            const projectId = project.getId();
            const endTime = Date.now();
            return project.stopRecordingMessages(socketId)
                .then(startTime => startTime && Messages.get(projectId, startTime, endTime))
                .then(messages => {
                    messages = messages || [];
                    this._logger.trace(`Retrieved ${messages.length} network messages for ${projectId}`);
                    return res.json(messages);
                });
        }
    },
    // public projects
    {
        Method: 'get',
        URL: 'Projects/PROJECTS',
        Handler: function(req, res) {
            var start = +req.query.start || 0,
                end = Math.min(+req.query.end, start+1);

            return PublicProjects.list(start, end)
                .then(projects => res.send(projects));
        }
    },
    {
        Method: 'get',
        URL: 'Examples/EXAMPLES',
        Handler: function(req, res) {
            const isJson = req.query.metadata === 'true';
            return Q(this.getExamplesIndex(isJson))
                .then(result => {
                    if (isJson) {
                        let agentType = useragent.is(req.headers['user-agent']);
                        if (agentType.safari) {
                            result = result.filter(ex => ex.roleNames.length == 1);
                        }
                        return res.json(result);
                    } else {
                        return res.send(result);
                    }
                });
        }
    },
    // Bug reporting
    {
        Method: 'post',
        URL: 'BugReport',
        Handler: function(req, res) {
            var user = req.body.user,
                report = req.body;

            if (user) {
                this._logger.info(`Received bug report from ${user}`);
            } else {
                this._logger.info('Received anonymous bug report');
            }

            const socket = SocketManager.getSocket(report.clientUuid);
            BugReporter.reportClientBug(socket, report);

            return res.sendStatus(200);
        }
    }
];
