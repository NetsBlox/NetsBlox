'use strict';

var _ = require('lodash'),
    Utils = _.extend(require('../Utils'), require('../ServerUtils.js')),

    middleware = require('./middleware'),
    debug = require('debug'),
    log = debug('NetsBlox:API:Projects:log'),
    info = debug('NetsBlox:API:Projects:info'),
    trace = debug('NetsBlox:API:Projects:trace'),
    error = debug('NetsBlox:API:Projects:error');

var getProjectIndexFrom = function(name, user) {
    for (var i = user.rooms.length; i--;) {
        if (user.rooms[i].name === name) {
            return i;
        }
    }
    return -1;
};

/**
 * Find and set the given project's public value.
 *
 * @param {String} name
 * @param {User} user
 * @param {Boolean} value
 * @return {Boolean} success
 */
var setProjectPublic = function(name, user, value) {
    var index = getProjectIndexFrom(name, user);
    if (index === -1) {
        return false;
    }
    user.rooms[index].Public = value;
    user.save();
    return true;
};

// Select a preview from a project (retrieve them from the roles)
var getPreview = function(project) {
    var preview,
        roles,
        role;

    roles = Object.keys(project.roles);
    preview = {
        ProjectName: project.name,
        Public: !!project.public
    };

    for (var i = roles.length; i--;) {
        role = project.roles[roles[i]];
        if (role) {
            // Get the most recent time
            preview.Updated = Math.max(
                preview.Updated || 0,
                new Date(role.Updated).getTime()
            );

            // Notes
            preview.Notes = preview.Notes || role.Notes;
            preview.Thumbnail = preview.Thumbnail ||
                role.Thumbnail;
        }
    }
    preview.Updated = new Date(preview.Updated);  // to string
    preview.Public = project.Public;
    return preview;
};

////////////////////// Project Helpers ////////////////////// 
var getRoomsNamed = function(name, user) {
    var room = user.rooms.find(room => room.name === name),
        activeRoom;

    trace(`found room ${name} for ${user.username}`);

    if (room) {
        activeRoom = this.rooms[Utils.uuid(room.owner, room.name)];
    }

    return {
        active: activeRoom,
        stored: room,
        areSame: !!activeRoom && !!room && activeRoom.originTime === room.originTime
    };
};

var sendProjectTo = function(project, res) {
    var serialized,
        openRole,
        role;

    // If room is not active, pick a role arbitrarily
    openRole = project.activeRole || Object.keys(project.roles)[0];
    role = project.roles[openRole];

    if (!role) {
        error('Found room with no roles!');
        return res.status(500).send('ERROR: project has no roles');
    }

    trace(`room is not active. Selected role "${openRole}"`);
    serialized = Utils.serializeRole(role, project.name);
    return res.send(serialized);
};

var createCopyFrom = function(user, project) {
    var copy = _.cloneDeep(project);

    // Create copy from the project and rename it
    copy.name = user.getNewName(copy.name);
    copy.Public = false;

    return copy;
};

var joinActiveProject = function(user, room, res) {
    var serialized,
        openRole,
        role;

    // TODO: Send message to the client
    openRole = Object.keys(room.roles)
        .filter(role => !room.roles[role])  // not occupied
        .shift();

    trace(`room "${room.name}" is already active`);
    if (openRole && room.cachedProjects[openRole]) {  // Send an open role and add the user
        trace(`adding ${user.username} to open role "${openRole}" at "${room.name}"`);
        role = room.cachedProjects[openRole];
    } else {  // If no open role w/ cache -> make a new role
        let i = 2,
            base;

        if (!openRole) {
            openRole = base = 'new role';
            while (room.hasOwnProperty(openRole)) {
                openRole = `${base} (${i++})`;
            }
            trace(`creating new role "${openRole}" at "${room.name}" ` +
                `for ${user.username}`);
        } else {
            // TODO: This is bad. User could be losing data!
            error(`Found open role "${openRole}" but it is not cached!`);
        }

        info(`adding ${user.username} to new role "${openRole}" at ` +
            `"${room.name}"`);

        room.createRole(openRole);
        role = {
            ProjectName: openRole,
            SourceCode: null,
            SourceSize: 0
        };
        room.cachedProjects[openRole] = role;
    }
    serialized = Utils.serializeRole(role, room.name);
    return res.send(serialized);
};

module.exports = [
    {
        Service: 'saveProject',
        Parameters: 'socketId',
        Method: 'Post',
        Note: '',
        middleware: ['hasSocket', 'isLoggedIn'],
        Handler: function(req, res) {
            var username = req.session.username,
                socketId = req.body.socketId;

            info('Initiating room save for ' + username);
            this.storage.users.get(username, (e, user) => {
                var room,
                    socket = this.sockets[socketId],
                    activeRoom;

                if (e) {
                    error(`Could not retrieve user "${username}"`);
                    return res.status(500).send('ERROR: ' + e);
                }

                if (!user) {
                    error(`user not found: "${username}" - cannot save!`);
                    return res.status(400).send('ERROR: user not found');
                }

                // Look up the user's room
                activeRoom = socket._room;
                if (!activeRoom) {
                    error(`Could not find active room for "${username}" - cannot save!`);
                    return res.status(500).send('ERROR: active room not found');
                }

                // Save the entire room
                if (socket.isOwner()) {
                    log(`saving entire room for ${socket.username}`);
                    // Create the room object
                    room = this.storage.rooms.new(user, activeRoom);
                    room.setActiveRole(socket.roleId);
                    room.save(function(err) {
                        if (err) {
                            error(`room save failed for room "${activeRoom.name}" initiated by "${username}"`);
                            return res.status(500).send('ERROR: ' + err);
                        }
                        log(`room save successful for room "${activeRoom.name}" initiated by "${username}"`);
                        return res.send('room saved!');
                    });
                } else {  // just update the project cache for the given user
                    log(`caching ${socket.roleId} for ${socket.username}`);
                    activeRoom.cache(socket.roleId, err => {
                        if (err) {
                            error(`Could not cache the ${socket.roleId} for non-owner "${username}"`);
                            return res.status(500).send('ERROR: ' + err);
                        }
                        log(`cache of ${socket.roleId} successful for for non-owner "${username}"`);
                        return res.send('code saved!');
                    });
                }
            });
        }
    },
    {
        Service: 'getProjectList',
        Parameters: '',
        Method: 'Get',
        Note: '',
        middleware: ['isLoggedIn', 'noCache'],
        Handler: function(req, res) {
            var username = req.session.username;
            log(username +' requested project list');

            this.storage.users.get(username, (e, user) => {
                var previews,
                    rooms;

                if (e) {
                    this._logger.error(`Could not find user ${username}: ${e}`);
                    return res.status(500).send('ERROR: ' + e);
                }
                if (user) {
                    rooms = user.rooms || user.tables || [];

                    trace(`found project list (${rooms.length}) ` +
                        `for ${username}: ${rooms.map(room => room.name)}`);
                    // Return the following for each room:
                    //
                    //  + ProjectName
                    //  + Updated
                    //  + Notes
                    //  + Thumbnail
                    //  + Public?
                    //
                    // These values are retrieved from whatever role has notes
                    // or chosen arbitrarily (for now)

                    // Update this to parse the projects from the room list
                    previews = rooms.map(getPreview);

                    info(`Projects for ${username} are ${JSON.stringify(
                        previews.map(preview => preview.ProjectName)
                        )}`
                    );
                        
                    if (req.query.format === 'json') {
                        return res.json(previews);
                    } else {
                        return res.send(Utils.serializeArray(previews));
                    }
                }
                return res.status(404);
            });
        }
    },
    {
        Service: 'isProjectActive',
        Parameters: 'ProjectName',
        Method: 'post',
        Note: '',
        middleware: ['isLoggedIn', 'noCache', 'setUser'],
        Handler: function(req, res) {
            var roomName = req.body.ProjectName,
                user = req.session.user,
                rooms = getRoomsNamed.call(this, roomName, user);

            log(`${user.username} is checking if project "${req.body.ProjectName}" is active`);
            // Check if it is actually the same - do the originTime's match?
            return res.send(`active=${rooms.areSame}`);
        }
    },
    {
        Service: 'joinActiveProject',
        Parameters: 'ProjectName',
        Method: 'post',
        Note: '',
        middleware: ['isLoggedIn', 'noCache', 'setUser'],
        Handler: function(req, res) {
            var roomName = req.body.ProjectName,
                user = req.session.user,
                rooms = getRoomsNamed.call(this, roomName, user);

            // Get the active project and join it
            if (rooms.active) {
                // Join the project
                joinActiveProject(user, rooms.active, res);
            } else if (rooms.stored) {  // else, getProject w/ the stored version
                sendProjectTo(rooms.stored, res);
            } else {  // if there is no stored version, ERROR!
                res.send('ERROR: Project not found');
            }
        }
    },
    {
        Service: 'getProject',
        Parameters: 'ProjectName',
        Method: 'post',
        Note: '',
        middleware: ['isLoggedIn', 'noCache', 'setUser'],
        Handler: function(req, res) {
            var roomName = req.body.ProjectName,
                user = req.session.user,
                rooms = getRoomsNamed.call(this, roomName, user);

            // Get the project
            if (rooms.active) {
                if (rooms.areSame) {
                    // Clone, change the room name, and send!
                    // Since they are the same, we assume the user wants to create
                    // a copy of the active room
                    var projectCopy = createCopyFrom(user, rooms.stored);
                    sendProjectTo(projectCopy, res);
                } else {
                    // not the same; simply change the name of the active room
                    // (the active room must be newer since it hasn't been saved
                    // yet)
                    rooms.active.changeName();
                    sendProjectTo(rooms.stored, res);
                }
            } else if (rooms.stored) {
                sendProjectTo(rooms.stored, res);
            } else {
                res.send('ERROR: Project not found');
            }
        }
    },
    {
        Service: 'deleteProject',
        Parameters: 'ProjectName,RoomName',
        Method: 'Post',
        Note: '',
        middleware: ['isLoggedIn', 'setUser'],
        Handler: function(req, res) {
            var user = req.session.user,
                project = req.body.ProjectName,
                room;

            log(user.username +' trying to delete "' + project + '"');
            for (var i = user.rooms.length; i--;) {
                room = user.rooms[i];
                if (room.name === project) {
                    user.rooms.splice(i, 1);
                    trace(`project ${project} deleted`);
                    user.save();
                    return res.send('project deleted!');
                }

            }
            error(`project ${project} not found`);
            res.status(400).send(`${project} not found!`);
        }
    },
    {
        Service: 'publishProject',
        Parameters: 'ProjectName',
        Method: 'Post',
        Note: '',
        middleware: ['isLoggedIn', 'setUser'],
        Handler: function(req, res) {
            var name = req.body.ProjectName,
                user = req.session.user;

            log(`${user.username} is publishing project ${name}`);
            var success = setProjectPublic(name, user, true);
            if (success) {
                return res.send(`"${name}" is shared!`);
            }
            return res.send('ERROR: could not find the project');
        }
    },
    {
        Service: 'unpublishProject',
        Parameters: 'ProjectName',
        Method: 'Post',
        Note: '',
        middleware: ['isLoggedIn', 'setUser'],
        Handler: function(req, res) {
            var name = req.body.ProjectName,
                user = req.session.user;

            log(`${user.username} is unpublishing project ${name}`);
            var success = setProjectPublic(name, user, false);
            if (success) {
                return res.send(`"${name}" is no longer shared`);
            }
            return res.send('ERROR: could not find the project');
        }
    },

    // Methods for forum client
    {
        Method: 'get',
        URL: 'projects/:owner',
        middleware: ['setUsername'],
        Handler: function(req, res) {
            var publicOnly = req.params.owner !== req.session.username;

            // return the names of all projects owned by :owner
            middleware.loadUser(req.params.owner, res, user => res.json(
                user.rooms
                    .filter(room => !publicOnly || !!room.Public)
                    .map(room => room.name))
            );
            
        }
    },
    {
        Method: 'get',
        URL: 'projects/:owner/:project/thumbnail',
        middleware: ['setUsername'],
        Handler: function(req, res) {
            var name = req.params.project;

            // return the names of all projects owned by :owner
            middleware.loadUser(req.params.owner, res, user => {
                var project = user.rooms.find(room => room.name === name),
                    preview = getPreview(project),
                    buffer,
                    image,
                    err;

                if (!project) {
                    err = `could not find project ${name}`;
                    this._logger.error(err);
                    return res.status(400).send(err);
                }

                if (!preview || !preview.Thumbnail) {
                    err = `could not find thumbnail for ${name}`;
                    this._logger.error(err);
                    return res.status(400).send(err);
                }

                image = preview.Thumbnail[0]
                    .replace(/^data:image\/png;base64,|^data:image\/jpeg;base64,|^data:image\/jpg;base64,|^data:image\/bmp;base64,/, '');

                buffer = new Buffer(image, 'base64');
                this._logger.trace(`Sending thumbnail for ${req.params.owner}'s ${name}`);

                // send the image
                res.contentType('image/png');
                res.end(buffer, 'binary');
            });
            
        }
    },
    {
        Method: 'get',
        URL: 'RawPublic',
        Handler: function(req, res) {
            var username = req.query.Username,
                projectName = req.query.ProjectName;

            this._logger.trace(`Retrieving the public project: ${projectName} from ${username}`);
            this.storage.users.get(username, function(e, user) {
                if (e || !user) {
                    log(`Could not find user ${username}`);
                    return res.status(400).send('ERROR: User not found');
                }
                var project = user.rooms.find(room => room.name === projectName);
                if (project && project.Public) {
                    var openRole = project.activeRole || Object.keys(project.roles)[0],
                        role = project.roles[openRole];


                    return res.send(`<snapdata>${role.SourceCode + role.Media}</snapdata>`);
                } else {
                    return res.status(400).send('ERROR: Project not available');
                }
            });
        }
    }

].map(function(api) {
    // Set the URL to be the service name
    api.URL = api.URL || api.Service;
    return api;
});
