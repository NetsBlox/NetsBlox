'use strict';

var _ = require('lodash'),
    Q = require('q'),
    xml2js = require('xml2js'),
    Utils = _.extend(require('../utils'), require('../server-utils.js')),

    middleware = require('./middleware'),
    lwip = require('lwip'),
    RoomManager = require('../rooms/room-manager'),
    SocketManager = require('../socket-manager'),
    PublicProjects = require('../storage/public-projects'),
    EXAMPLES = require('../examples'),
    debug = require('debug'),
    log = debug('netsblox:api:projects:log'),
    info = debug('netsblox:api:projects:info'),
    trace = debug('netsblox:api:projects:trace'),
    error = debug('netsblox:api:projects:error');

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

    if (value) {
        PublicProjects.publish(user.rooms[index]);
    } else {
        PublicProjects.unpublish(user.rooms[index]);
    }

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
        activeRoom = RoomManager.rooms[Utils.uuid(room.owner, room.name)];
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

var saveRoom = function (activeRoom, socket, user, res) {
    log(`saving entire room for ${socket.username}`);
    // Create the room object
    var room = this.storage.rooms.new(user, activeRoom);
    room.setActiveRole(socket.roleId);
    room.save(function(err) {
        if (err) {
            error(`room save failed for room "${activeRoom.name}" initiated by "${user.username}"`);
            return res.status(500).send('ERROR: ' + err);
        }
        log(`room save successful for room "${activeRoom.name}" initiated by "${user.username}"`);

        trace('setting active room origin time to', activeRoom.originTime);
        return res.send('room saved!');
    });
};

const TRANSPARENT = [0,0,0,0];
var padImage = function (buffer, ratio) {  // Pad the image to match the given aspect ratio
    return Q.ninvoke(lwip, 'open', buffer, 'png')
        .then(image => {
            var width = image.width(),
                height = image.height(),
                pad = Utils.computeAspectRatioPadding(width, height, ratio);

            return Q.ninvoke(
                image,
                'pad',
                pad.left,
                pad.top,
                pad.right,
                pad.bottom,
                TRANSPARENT
            );
        })
        .then(image => Q.ninvoke(image, 'toBuffer', 'png'));
};

var applyAspectRatio = function (thumbnail, aspectRatio) {
    var image = thumbnail
        .replace(/^data:image\/png;base64,|^data:image\/jpeg;base64,|^data:image\/jpg;base64,|^data:image\/bmp;base64,/, '');
    var buffer = new Buffer(image, 'base64');

    if (aspectRatio) {
        trace(`padding image with aspect ratio ${aspectRatio}`);
        aspectRatio = Math.max(aspectRatio, 0.2);
        aspectRatio = Math.min(aspectRatio, 5);
        return padImage(buffer, aspectRatio);
    } else {
        return Q(buffer);
    }
};

module.exports = [
    {
        Service: 'saveProject',
        Parameters: 'socketId,overwrite',
        Method: 'Post',
        Note: '',
        middleware: ['hasSocket', 'isLoggedIn', 'setUser'],
        Handler: function(req, res) {
            var username = req.session.username,
                socketId = req.body.socketId,
                socket = SocketManager.getSocket(socketId),

                activeRoom = socket._room,
                user = req.session.user,
                roomName,
                rooms;

            if (!activeRoom) {
                error(`Could not find active room for "${username}" - cannot save!`);
                return res.status(500).send('ERROR: active room not found');
            }

            roomName = activeRoom.name;
            rooms = getRoomsNamed.call(this, roomName, user);

            if (socket.isOwner()) {
                info('Initiating room save for ' + username);

                // If we overwrite, we don't want to change the originTime
                if (rooms.stored) {
                    activeRoom.originTime = rooms.stored.originTime;
                }

                if (rooms.areSame) {  // overwrite
                    saveRoom.call(this, activeRoom, socket, user, res);
                } else if (req.body.overwrite === 'true') {  // overwrite
                    saveRoom.call(this, activeRoom, socket, user, res);
                } else {  // rename
                    activeRoom.changeName();
                    activeRoom.originTime = Date.now();
                    saveRoom.call(this, activeRoom, socket, user, res);
                }
            } else {
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
        Service: 'hasConflictingStoredProject',
        Parameters: 'socketId',
        Method: 'post',
        Note: '',
        middleware: ['isLoggedIn', 'hasSocket', 'noCache', 'setUser'],
        Handler: function(req, res) {
            var socket = SocketManager.getSocket(req.body.socketId),
                roomName = socket._room.name,
                user = req.session.user,
                rooms = getRoomsNamed.call(this, roomName, user),
                hasConflicting = rooms.stored && !rooms.areSame;

            log(`${user.username} is checking if project "${roomName}" conflicts w/ any saved names (${hasConflicting})`);
            // Check if it is actually the same - do the originTime's match?
            return res.send(`hasConflicting=${!!hasConflicting}`);
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

            log(`${user.username} is checking if project "${req.body.ProjectName}" is active (${rooms.areSame})`);
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
                Utils.joinActiveProject(user.username, rooms.active, res);
            } else if (rooms.stored) {  // else, getProject w/ the stored version
                sendProjectTo(rooms.stored, res);
            } else {  // if there is no stored version, ERROR!
                res.send('ERROR: Project not found');
            }
        }
    },
    {
        Service: 'getProject',
        Parameters: 'ProjectName,socketId',
        Method: 'post',
        Note: '',
        middleware: ['isLoggedIn', 'noCache', 'setUser'],
        Handler: function(req, res) {
            var roomName = req.body.ProjectName,
                user = req.session.user,
                rooms,
                socketId = req.body.socketId,
                socket = socketId && SocketManager.getSocket(socketId);

            if (socket) {
                socket.leave();
            }

            // Get the project
            rooms = getRoomsNamed.call(this, roomName, user);
            if (rooms.active) {
                trace(`room with name ${roomName} already open. Are they the same? ${rooms.areSame}`);
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
                    trace(`active room is ${roomName} already open`);
                    rooms.active.changeName();
                    sendProjectTo(rooms.stored, res);
                }
            } else if (rooms.stored) {
                trace(`no active room with name ${roomName}. Proceeding normally`);
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
            var name = req.params.project,
                aspectRatio = +req.query.aspectRatio || 0;

            // return the names of all projects owned by :owner
            middleware.loadUser(req.params.owner, res, user => {
                var project = user.rooms.find(room => room.name === name),
                    preview = getPreview(project),
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

                this._logger.trace(`Sending thumbnail for ${req.params.owner}'s ${name}`);
                return applyAspectRatio(preview.Thumbnail[0], aspectRatio)
                    .then(buffer => {
                        res.contentType('image/png');
                        res.end(buffer, 'binary');
                    })
                    .fail(err => {
                        this._logger.error(`padding image failed: ${err}`);
                        res.serverError(err);
                    });
            });
            
        }
    },
    {
        Method: 'get',
        URL: 'examples/:name/thumbnail',
        Handler: function(req, res) {
            var name = req.params.name,
                aspectRatio = +req.query.aspectRatio || 0;

            if (!EXAMPLES.hasOwnProperty(name)) {
                this._logger.warn(`ERROR: Could not find example "${name}`);
                return res.status(500).send('ERROR: Could not find example.');
            }

            // Get the thumbnail
            var example = EXAMPLES[name];
            var role = Object.keys(example.roles).shift();
            var src = example.cachedProjects[role].SourceCode;
            return Q.nfcall(xml2js.parseString, src)
                .then(result => result.project.thumbnail[0])
                .then(thumbnail => applyAspectRatio(thumbnail, aspectRatio))
                .then(buffer => {
                    res.contentType('image/png');
                    res.end(buffer, 'binary');
                })
                .fail(err => {
                    this._logger.error(`padding image failed: ${err}`);
                    res.serverError(err);
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
                    return res.send(Utils.getRoomXML(project));
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
