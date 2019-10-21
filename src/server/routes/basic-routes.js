'use strict';
var _ = require('lodash'),
    Q = require('q'),
    Utils = _.extend(require('../utils'), require('../server-utils.js')),
    PublicProjects = require('../storage/public-projects'),
    UserAPI = require('./users'),
    RoomAPI = require('./rooms'),
    ProjectAPI = require('./projects'),
    Logger = require('../logger'),
    logger = new Logger('netsblox:api:basic'),
    middleware = require('./middleware');

const NetworkTopology = require('../network-topology');
const BugReporter = require('../bug-reporter');
const Storage = require('../storage/storage');
const Messages = require('../storage/messages');
const Projects = require('../storage/projects');
const DEFAULT_ROLE_NAME = 'myRole';

const ExternalAPI = {};
UserAPI.concat(ProjectAPI, RoomAPI)
    .filter(api => api.Service)
    .map(desc => _.omit(desc, ['Handler', 'middleware']))
    .forEach(endpoint => {
        const name = endpoint.Service;
        const service = {};
        Object.keys(endpoint).forEach(key => {
            service[key.toLowerCase()] = endpoint[key];
        });

        if (service.parameters) {
            service.parameters = service.parameters.split(',');
        }
        ExternalAPI[name] = service;
    });

module.exports = [
    {
        Method: 'get',
        URL: 'ResetPW',
        Handler: function(req, res) {
            logger.log('password reset request:', req.query.Username);
            const username = req.query.Username;

            // Look up the email
            Storage.users.get(username)
                .then(user => {
                    if (user) {
                        delete user.hash;  // force tmp password creation
                        user.save();
                        return res.sendStatus(200);
                    } else {
                        logger.log('Could not find user to reset password (user "'+username+'")');
                        return res.status(400).send('ERROR: could not find user "'+username+'"');
                    }
                })
                .catch(e => {
                    logger.log('Server error when looking for user: "'+username+'". Error:', e);
                    return res.status(500).send('ERROR: ' + e);
                });
        }
    },
    {
        Method: 'post',  // post would make more sense...
        URL: 'SignUp',
        Handler: function(req, res) {
            logger.log('Sign up request:', req.body.Username, req.body.Email);
            var uname = req.body.Username,
                password = req.body.Password,
                email = req.body.Email;

            // Must have an email and username
            if (!email || !uname) {
                logger.log('Invalid request to /SignUp');
                return res.status(400).send('ERROR: need both username and email!');
            }

            // validate username
            const nameRegex = /[^a-zA-Z0-9][a-zA-Z0-9_\-\(\)\.]*/;
            if (uname[0] === '_' || nameRegex.test(uname)) {
                return res.status(400).send('ERROR: invalid username');
            }

            return Storage.users.get(uname)
                .then(user => {
                    if (!user) {
                        var newUser = Storage.users.new(uname, email);
                        newUser.hash = password || null;
                        newUser.save();
                        return res.send('User Created!');
                    }
                    logger.log('User "'+uname+'" already exists. Could not make new user.');
                    return res.status(401).send('ERROR: user exists');
                });
        }
    },
    {
        Method: 'post',
        URL: 'SignUp/validate',
        Handler: function(req, res) {
            logger.log('Signup/validate request:', req.body.Username, req.body.Email);
            var uname = req.body.Username,
                email = req.body.Email;

            // Must have an email and username
            if (!email || !uname) {
                logger.log('Invalid request to /SignUp/validate');
                return res.status(400).send('ERROR: need both username and email!');
            }

            Storage.users.get(uname)
                .then(user => {
                    if (!user) {
                        return res.send('Valid User Signup Request!');
                    }
                    logger.log('User "'+uname+'" already exists.');
                    return res.status(401).send('ERROR: user exists');
                });
        }
    },
    {
        Service: 'setClientState',
        Parameters: 'clientId,projectId,roomName,roleName,actionId',
        URL: 'setClientState',
        Method: 'Post',
        Note: '',
        Handler: function(req, res) {
            // Look up the projectId
            const {clientId} = req.body;
            let {roleName, roomName, roleId, projectId} = req.body;
            let userId = clientId;
            let user = null;

            roomName = roomName || 'untitled';

            const setUserAndId = middleware.login(req, res)
                .then(() => {
                    user = req.session.user;
                    userId = user.username;
                })
                .catch(err => {
                    this._logger.info(`could not log in client ${clientId}: ${err.message}`);
                });


            // Get the room by projectId and have the socket join the role
            return setUserAndId
                .then(() => Projects.getById(projectId))
                .then(project => {
                    if (project) {
                        if (project.owner === clientId && req.loggedIn) {
                            return user.getNewName(roomName)
                                .then(name => project.setName(name))
                                .then(() => project.setOwner(userId))
                                .then(() => project.getId());
                        }
                        return project.getId();
                    } else {
                        return Projects.new({owner: userId})
                            .then(project => {
                                roleName = roleName || DEFAULT_ROLE_NAME;
                                const content = Utils.getEmptyRole(roleName);
                                return project.setRoleById(roleId, content)
                                    .then(() => user ? user.getNewName(roomName) : roomName)
                                    .then(name => project.setName(name))
                                    .then(() => project.getId());
                            });
                    }
                })
                .then(id => {
                    projectId = id;
                    NetworkTopology.setClientState(clientId, projectId, roleId, userId);
                    return res.send({api: ExternalAPI, projectId, roleId});
                });
        }
    },
    {
        Method: 'post',
        URL: '',  // login method
        Handler: async function(req, res) {
            const projectId = req.body.projectId;
            let username = req.body.__u;
            let user = null;

            // Should check if the user has a valid cookie. If so, log them in with it!
            // Explicit login
            try {
                await middleware.login(req, res);
            } catch (err) {
                logger.log(`Login failed for "${username}": ${err}`);
                if (req.body.silent) {
                    return res.sendStatus(204);
                } else {
                    return res.status(403).send(err.message);
                }
            }

            username = req.session.username;
            user = req.session.user;

            // Update the project if logging in from the netsblox app
            if (projectId) {  // update project owner
                const project = await Projects.getById(projectId);

                // Update the project owner, if needed
                if (project && Utils.isSocketUuid(project.owner)) {
                    const name = await user.getNewName(project.name);
                    await project.setName(name);
                    await project.setOwner(username);
                    await NetworkTopology.onRoomUpdate(projectId);
                }
            }

            if (req.body.return_user) {
                return res.status(200).json({
                    username: username,
                    admin: user.admin,
                    email: user.email
                });
            } else {
                return res.status(200).json(ExternalAPI);
            }
        }
    },
    // get start/end network traces
    {
        Method: 'get',
        URL: 'trace/start/:projectId/:clientId',
        Handler: function(req, res) {
            const {projectId, clientId} = req.params;

            return Projects.getById(projectId)
                .then(project => project.startRecordingMessages(clientId))
                .then(time => res.json(time));
        }
    },
    {
        Method: 'get',
        URL: 'trace/end/:projectId/:clientId',
        Handler: function(req, res) {
            const {projectId, clientId} = req.params;

            return Projects.getById(projectId)
                .then(project => {
                    if (!project) {
                        this._logger.error('trying to get trace end for non existing project', projectId, clientId);
                        throw new Error('project not found');
                    }
                    const endTime = Date.now();
                    return project.stopRecordingMessages(clientId)
                        .then(startTime => startTime && Messages.get(projectId, startTime, endTime));
                })
                .then(messages => {
                    messages = messages || [];
                    this._logger.trace(`Retrieved ${messages.length} messages for ${projectId}`);
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

            const socket = NetworkTopology.getSocket(report.clientUuid);
            BugReporter.reportClientBug(socket, report);

            return res.sendStatus(200);
        }
    }
];
