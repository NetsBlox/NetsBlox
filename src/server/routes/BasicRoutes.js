'use strict';
var R = require('ramda'),
    _ = require('lodash'),
    Utils = _.extend(require('../Utils'), require('../ServerUtils.js')),
    UserAPI = require('./Users'),
    RoomAPI = require('./Rooms'),
    ProjectAPI = require('./Projects'),
    EXTERNAL_API = UserAPI
        .concat(ProjectAPI)
        .concat(RoomAPI)
        .filter(api => api.Service)
        .map(R.omit.bind(R, 'Handler'))
        .map(R.omit.bind(R, 'middleware')),
    GameTypes = require('../GameTypes'),

    debug = require('debug'),
    log = debug('NetsBlox:API:log'),
    fs = require('fs'),
    path = require('path'),
    EXAMPLES = require('../examples'),
    middleware = require('./middleware'),
    saveLogin = middleware.saveLogin,

    // PATHS
    PATHS = [
        'Costumes',
        'Sounds',
        'libraries',
        'Backgrounds'
    ],
    CLIENT_ROOT = path.join(__dirname, '..', '..', 'client', 'Snap--Build-Your-Own-Blocks');

var createIndexFor = function(name, list) {
    return list
        .filter(item => item.toUpperCase() !== name.toUpperCase())
        .map(function(item) {
            return [item, item, item].join('\t');
        }).join('\n');
};


// Create the paths
var resourcePaths = PATHS.map(function(name) {
    var resPath = path.join(CLIENT_ROOT, name);

    return { 
        Method: 'get', 
        URL: name + '/:filename',
        Handler: function(req, res) {
            if (req.params.filename === name.toUpperCase()) {  // index
                // Load the costumes and create rough HTML content...
                fs.readdir(resPath, function(err, resources) {
                    if (err) {
                        return res.send(err);
                    }

                    var result = createIndexFor(name, resources);
                    return res.send(result);
                });
            } else {  // retrieve a file
                res.sendFile(path.join(resPath, req.params.filename));
            }
        }
    };
});

// Add importing tools to the resource paths
var toolRoute = { 
    Method: 'get', 
    URL: 'tools.xml',
    Handler: function(req, res) {
        // Load the costumes and create rough HTML content...
        res.sendFile(path.join(CLIENT_ROOT, 'tools.xml'));
    }
};
resourcePaths.push(toolRoute);

// Add importing rpcs to the resource paths
var rpcRoute = { 
    Method: 'get', 
    URL: 'rpc/:filename',
    Handler: function(req, res) {
        var RPC_ROOT = path.join(__dirname, '..', 'rpc', 'libs');
        res.sendFile(path.join(RPC_ROOT, req.params.filename));
    }
};
resourcePaths.push(rpcRoute);



module.exports = [
    { 
        Method: 'get', 
        URL: 'ResetPW',
        Handler: function(req, res) {
            log('password reset request:', req.query.Username);
            var self = this,
                username = req.query.Username;

            // Look up the email
            self.storage.users.get(username, function(e, user) {
                if (e) {
                    log('Server error when looking for user: "'+username+'". Error:', e);
                    return res.status(500).send('ERROR: ' + e);
                }

                if (user) {
                    delete user.hash;  // force tmp password creation
                    user.save();
                    return res.sendStatus(200);
                } else {
                    log('Could not find user to reset password (user "'+username+'")');
                    return res.status(400).send('ERROR: could not find user "'+username+'"');
                }
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

            self.storage.users.get(uname, function(e, user) {
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
            var self = this,
                uname = req.body.Username,
                password = req.body.Password,
                email = req.body.Email;

            // Must have an email and username
            if (!email || !uname) {
                log('Invalid request to /SignUp/validate');
                return res.status(400).send('ERROR: need both username and email!');
            }

            self.storage.users.get(uname, function(e, user) {
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
        URL: '',  // login/SignUp method
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
                    log(`"passive" login failed - no session found!`);
                    return res.sendStatus(403);
                }

                // Explicit login
                log(`Logging in as ${username}`);
                this.storage.users.get(username, (e, user) => {
                    if (e) {
                        log(`Could not find user "${username}": ${e}`);
                        return res.status(500).send('ERROR: ' + e);
                    }

                    if (user && (loggedIn || user.hash === hash)) {  // Sign in 
                        if (!isUsingCookie) {
                            saveLogin(res, user, req.body.remember);
                        }

                        log(`"${user.username}" has logged in.`);

                        // Associate the websocket with the username
                        socket = this.sockets[req.body.socketId];
                        if (socket) {  // websocket has already connected
                            socket.onLogin(user);
                        }

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
                            return res.status(403).send(`Incorrect password`);
                        }
                        log(`Could not find user "${username}"`);
                        return res.status(403).send(`Could not find user "${username}"`);
                    }
                });
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
    },
    // index
    {
        Method: 'get',
        URL: 'Examples/EXAMPLES',
        Handler: function(req, res) {
            // if no name requested, get index
            var result = Object.keys(EXAMPLES)
                .map(name => `${name}\t${name}\t  `)
                .join('\n');
            return res.send(result);
        }
    },
    // individual example
    {
        Method: 'get',
        URL: 'Examples/:name',
        middleware: ['hasSocket'],
        Handler: function(req, res) {
            var name = req.params.name,
                uuid = req.query.socketId,
                isPreview = req.query.preview,
                socket,
                example;

            if (!EXAMPLES.hasOwnProperty(name)) {
                this._logger.warn(`ERROR: Could not find example "${name}`);
                return res.status(500).send('ERROR: Could not find example.');
            }

            // This needs to...
            //  + create the room for the socket
            example = _.cloneDeep(EXAMPLES[name]);
            socket = this.sockets[uuid];
            var role,
                room,
                result;

            if (!isPreview) {
                // Check if the room already exists
                room = this.rooms[Utils.uuid(socket.username, name)];

                if (!room) {  // Create the room
                    room = this.createRoom(socket, name);
                    room = _.extend(room, example);
                    // Check the room in 10 seconds
                    setTimeout(this.checkRoom.bind(this, room), 10000);
                }

                // Get an open role or create a new one
                role = Object.keys(room.roles)
                    .filter(role => !room.roles[role])  // not occupied
                    .shift();

                if (!role) {  // If no open role, create a new one
                    let i = 2,
                        base;

                    role = base = 'new role';
                    while (room.hasOwnProperty(role)) {
                        role = `${base} (${i++})`;
                    }

                    room.createRole(role);
                    room.cachedProjects[role] = {
                        ProjectName: role,
                        SourceCode: null,
                        SourceSize: 0
                    };
                }

                log(`adding ${socket.username} to role "${role}" at ` +
                    `"${name}"`);
            } else {
                room = example;
                room.owner = socket;
                //  + customize and return the room for the socket
                room = _.extend(room, example);
                role = Object.keys(room.roles).shift();
            }

            result = {
                src: room.cachedProjects[role],
                roomName: room.RoomName,
                ownerId: room.owner.username,
                role: role
            };

            return res.json(result);
        }
    }
].concat(resourcePaths);
