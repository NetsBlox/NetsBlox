'use strict';

var _ = require('lodash'),
    Q = require('q'),
    Utils = _.extend(require('../utils'), require('../server-utils.js')),
    middleware = require('./middleware'),
    RoomManager = require('../rooms/room-manager'),
    SocketManager = require('../socket-manager'),
    PublicProjects = require('../storage/public-projects'),
    EXAMPLES = require('../examples'),
    debug = require('debug'),
    log = debug('netsblox:api:projects:log'),
    info = debug('netsblox:api:projects:info'),
    trace = debug('netsblox:api:projects:trace'),
    Jimp = require('jimp'),
    error = debug('netsblox:api:projects:error');

const Projects = require('../storage/projects');


/**
 * Find and set the given project's public value.
 *
 * @param {String} name
 * @param {User} user
 * @param {Boolean} value
 * @return {Boolean} success
 */
var setProjectPublic = function(name, user, value) {

    return user.getProject(name)
        .then(project => {
            if (project) {
                return project.setPublic(value).then(() => {
                    if (value) {
                        PublicProjects.publish(project);
                    } else {
                        PublicProjects.unpublish(project);
                    }
                });
            }

            throw Error('project not found');
        });
};

// Select a preview from a project (retrieve them from the roles)
var getProjectInfo = function(project) {

    const roles = Object.keys(project.roles).map(k => project.roles[k]);
    const preview = {
        ProjectName: project.name,
        Public: !!project.public
    };

    let role;
    for (var i = roles.length; i--;) {
        role = roles[i];
        // Get the most recent time
        preview.Updated = Math.max(
            preview.Updated || 0,
            new Date(role.Updated).getTime()
        );

        // Notes
        preview.Notes = preview.Notes || role.Notes;
        preview.Thumbnail = preview.Thumbnail ||
            (role.Thumbnail instanceof Array ? role.Thumbnail[0] : role.Thumbnail);
    }
    preview.Updated = new Date(preview.Updated);
    preview.Public = project.Public;
    preview.Owner = project.owner;
    return preview;
};

var getProjectMetadata = function(project, origin='') {
    let metadata = getProjectInfo(project);
    metadata.Thumbnail = `${origin}/api/projects/${project.owner}/${project.name}/thumbnail`;
    return metadata;
};

var getProjectThumbnail = function(project) {
    return getProjectInfo(project).Thumbnail;
};

////////////////////// Project Helpers //////////////////////
var getRoomsNamed = function(name, user, owner) {
    owner = owner || user.username;
    const uuid = Utils.uuid(owner, name);

    trace(`looking up projects ${uuid} for ${user.username}`);
    let getProject = user.username === owner ? user.getProject(name) :
        user.getSharedProject(owner, name);

    return getProject.then(project => {
        const activeRoom = RoomManager.getExistingRoom(owner, name);
        const areSame = !!activeRoom && !!project &&
            activeRoom.getProjectId().equals(project.getId());


        if (project) {
            trace(`found project ${uuid} for ${user.username}`);
        } else {
            trace(`no ${uuid} project found for ${user.username}`);
        }

        if (areSame) {
            project = activeRoom.getProject() || project;
        }

        return {
            active: activeRoom,
            stored: project,
            areSame: areSame
        };
    });
};

var sendProjectTo = function(project, res) {
    return project.getLastUpdatedRole()
        .then(role => {
            const uuid = Utils.uuid(project.owner, project.name);
            trace(`project ${uuid} is not active. Selected role "${role.ProjectName}"`);

            let serialized = Utils.serializeRole(role, project);
            return res.send(serialized);
        })
        .catch(err => res.status(500).send('ERROR: ' + err));
};

var padImage = function (buffer, ratio) {  // Pad the image to match the given aspect ratio
    return Jimp.read(buffer)
        .then(image => {
            var width = image.bitmap.width,
                height = image.bitmap.height,
                pad = Utils.computeAspectRatioPadding(width, height, ratio);
            // round paddings to behave like lwip
            let wDiff = parseInt((2*pad.left));
            let hDiff = parseInt((2*pad.top));
            image = image.contain(width + wDiff, height + hDiff);
            return Q.ninvoke(image, 'getBuffer', Jimp.AUTO);
        });
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
        Service: 'newProject',
        Parameters: 'clientId,name',
        Method: 'Post',
        Note: '',
        Handler: function(req, res) {
            const {clientId, name} = req.body;
            const socket = SocketManager.getSocket(clientId);

            // TODO: Remove the dependency on the websocket connection
            return Q.nfcall(middleware.trySetUser, req, res)
                .then(loggedIn => {
                    if (socket) {
                        if (loggedIn) {
                            socket.onLogin(req.session.user);
                        }
                        return socket.newRoom({role: name})
                            .then(() => socket.getRoom());
                    } else {
                        let username = req.session.username || clientId;
                        return RoomManager.createRoom({username}, 'untitled')
                            .then(room => {
                                return room.createRole('myRole')
                                    .then(() => room.changeName(null, false, true))
                                    .then(() => room);
                            });
                    }
                })
                .then(room => {
                    console.log();
                    console.log();
                    console.log(room.name);
                    const roleName = socket ? socket.role : 'myRole';
                    const projectId = room.getProjectId();
                    this._logger.trace(`Created new project: ${projectId} (${roleName})`);
                    return res.send({
                        projectId,
                        roleName
                    });
                });
        }
    },
    {  // TODO: Should this be updated to be included in all requests?
        Service: 'setClientState',
        Parameters: 'clientId,projectId,roomName,roleName,owner,actionId',
        Method: 'Post',
        Note: '',
        Handler: function(req, res) {
            // Look up the projectId
            const {clientId, owner, roleName, roomName, actionId} = req.body;
            let {projectId} = req.body;
            // TODO: Remove the dependency on the websocket connection
            const socket = SocketManager.getSocket(clientId);

            // Get the room by projectId and have the socket join the role
            return Q.nfcall(middleware.trySetUser, req, res)
                .then(loggedIn => {
                    if (socket && loggedIn) {
                        socket.onLogin(req.session.user);
                    }
                })
                .then(() => Projects.getById(projectId))
                .then(project => {
                    if (project) {
                        return RoomManager.getRoomForProject(project);
                    } else {
                        return RoomManager.createRoom(socket, roomName, owner)
                            .then(room => {
                                projectId = room.getProjectId();
                                return room;
                            });
                    }
                })
                .then(room => {
                    if (!room.hasRole(roleName)) {
                        this._logger.trace(`created role ${roleName} in ${owner}/${roomName}`);
                        return room.createRole(roleName)
                            .then(() => room.add(socket, roleName));
                    }
                    return room.add(socket, roleName);
                })
                .then(() => socket.requestActionsAfter(actionId))
                .then(() => res.send({projectId}))
                .catch(err => {
                    res.status(500).send(err.message);
                });
        }
    },
    {  // TODO: Should this be updated to be included in all requests?
        Service: 'importProject',
        Parameters: 'clientId,projectId,name,role,roles',
        Method: 'Post',
        Note: '',
        Handler: function(req, res) {
            const {clientId, projectId, name, role, roles} = req.body;
            const socket = SocketManager.getSocket(clientId);

            return RoomManager.createRoom(socket, 'untitled')
                .then(room => {
                    return room.createRole(role)
                        .then(() => room.changeName(name, false, true))
                        .then(() => room.add(socket, role));
                })
                .then(() => socket.importRoom(roles))
                .then(room => {
                    const projectId = room.getProjectId();
                    return room.changeName(name, false, true)
                        .then(() => res.send({projectId}));
                });
        }
    },
    {
        Service: 'saveProject',
        Parameters: 'roleName,projectName,projectId,ownerId,overwrite,srcXml,mediaXml',
        Method: 'Post',
        Note: '',
        middleware: ['isLoggedIn', 'setUser'],
        Handler: function(req, res) {
            // Check permissions
            // TODO
            const {user, username} = req.session;
            const {roleName, ownerId, projectId, overwrite} = req.body;
            let {projectName} = req.body;
            const {srcXml, mediaXml} = req.body;

            // Get any projects with colliding name
            //   - if they are currently opened
            //     - rename room
            //     - set to transient
            //   - else
            //     - delete
            //
            // Get the project
            //   - set the name
            //   - set the role content
            //   - persist
            //
            let project = null;
            trace(`Saving ${roleName} from ${projectName} (${projectId})`);
            return Projects.getById(projectId)
                .then(_project => {
                    // if project name is different from save name,
                    // it is "Save as" (make a copy)

                    project = _project;
                    // Sometimes the project isn't found...
                    // How can this happen? TODO
                    // what if they are using a tmp id?
                    const isSaveAs = project.name !== projectName;

                    if (isSaveAs) {
                        // Only copy original if it has already been saved
                        trace(`Detected "save as". Saving ${project.name} as ${projectName}`);
                        return project.isTransient()
                            .then(isTransient => {
                                if (!isTransient) {
                                    trace(`Original project already saved. Copying original ${project.name}`);
                                    return project.getCopy()  // save the original
                                        .then(copy => copy.persist());
                                }
                            })
                            .then(() => Projects.get(ownerId, projectName))
                            .then(existingProject => {  // overwrite or rename any collisions
                                if (!existingProject || existingProject.getId().toString() === projectId) {
                                    return null;
                                }
                                const collision = existingProject;
                                const room = RoomManager.getExistingRoomById(collision.getId());
                                if (room) {
                                    trace(`found name collision with open project. Renaming and unpersisting.`);
                                    return room.changeName(null, true, true)
                                        .then(() => collision.unpersist());
                                } else if (overwrite) {
                                    trace(`found name collision with project. Overwriting ${project.name}.`);
                                    return collision.destroy();
                                } else {  // rename the project
                                    const activeRoomNames = RoomManager.getAllActiveFor(username);
                                    return user.getNewName(projectName, activeRoomNames)
                                        .then(name => projectName = name);
                                }
                            });
                    }
                })
                .then(() => {  // update room name
                    return project.setName(projectName)
                        .then(() => {
                            const room = RoomManager.getExistingRoomById(projectId);
                            if (room) {
                                return room.update(projectName);
                            }
                        });
                })
                .then(() => project.archive())
                .then(() => {
                    const roleData = {
                        SourceCode: srcXml,
                        Media: mediaXml
                    };
                    return project.setRole(roleName, roleData);
                })
                .then(() => project.persist())
                .then(() => res.status(200).send({projectId}))
                .catch(err => {
                    error(`Error saving ${projectId}:`, err);
                    return res.status(500).send(err);
                });
        }
    },
    {
        Service: 'saveProjectCopy',
        Parameters: 'socketId',
        Method: 'Post',
        Note: '',
        middleware: ['hasSocket', 'isLoggedIn', 'setUser'],
        Handler: function(req, res) {
            // Save the latest role content (include xml in the req)
            // TODO
            var {user, username} = req.session,
                {socketId} = req.body,
                socket = SocketManager.getSocket(socketId),

                activeRoom = socket._room;

            if (!activeRoom) {
                error(`Could not find active room for "${username}" - cannot save!`);
                return res.status(500).send('ERROR: active room not found');
            }

            // make a copy of the project for the given user and save it!
            let name = `Copy of ${activeRoom.name}`;
            let project = null;
            return user.getNewName(name)
                .then(_name => name = _name)
                .then(() => activeRoom.getProject().getCopyFor(user))
                .then(_project => project = _project)
                .then(() => project.setName(name))
                .then(() => project.persist())
                .then(() => {
                    trace(`${username} saved a copy of project: ${name}`);
                    return res.status(200).send(`projectId=${project.getId()}`);
                });
        }
    },
    {
        Service: 'getSharedProjectList',
        Parameters: '',
        Method: 'Get',
        Note: '',
        middleware: ['isLoggedIn', 'noCache'],
        Handler: function(req, res) {
            const origin = `${process.env.SERVER_PROTOCOL || req.protocol}://${req.get('host')}`;
            var username = req.session.username;
            log(`${username} requested shared project list from ${origin}`);

            return this.storage.users.get(username)
                .then(user => {
                    if (user) {
                        return user.getSharedProjects()
                            .then(projects => {
                                trace(`found shared project list (${projects.length}) ` +
                                    `for ${username}: ${projects.map(proj => proj.name)}`);

                                const previews = projects.map(project => getProjectMetadata(project, origin));
                                const names = JSON.stringify(previews.map(preview =>
                                    preview.ProjectName));

                                info(`shared projects for ${username} are ${names}`);

                                if (req.query.format === 'json') {
                                    return res.json(previews);
                                } else {
                                    return res.send(Utils.serializeArray(previews));
                                }
                            });
                    }
                    return res.status(404);
                })
                .catch(e => {
                    this._logger.error(`could not find user ${username}: ${e}`);
                    return res.status(500).send('ERROR: ' + e);
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
            const origin = `${req.protocol}://${req.get('host')}`;
            var username = req.session.username;
            log(`${username} requested project list from ${origin}`);

            return this.storage.users.get(username)
                .then(user => {
                    if (user) {
                        return user.getProjects()
                            .then(projects => {
                                trace(`found project list (${projects.length}) ` +
                                    `for ${username}: ${projects.map(proj => proj.name)}`);

                                const previews = projects.map(project => getProjectMetadata(project, origin));
                                info(`Projects for ${username} are ${JSON.stringify(
                                    previews.map(preview => preview.ProjectName)
                                )}`
                                );

                                if (req.query.format === 'json') {
                                    return res.json(previews);
                                } else {
                                    return res.send(Utils.serializeArray(previews));
                                }
                            });
                    }
                    return res.status(404);
                })
                .catch(e => {
                    this._logger.error(`Could not find user ${username}: ${e}`);
                    return res.status(500).send('ERROR: ' + e);
                });
        }
    },
    {
        Service: 'hasConflictingStoredProject',
        Parameters: 'projectId,name',
        Method: 'post',
        Note: '',
        middleware: ['isLoggedIn', 'noCache', 'setUser'],
        Handler: function(req, res) {
            const {projectId, name} = req.body;
            const user = req.session.user;

            // Check if the name will conflict with any currently saved projects
            return user.getRawProjects()
                .then(projects => {
                    const conflict = projects
                        .find(project => project.name === name && project._id !== projectId);

                    log(`${user.username} is checking if "${name}" conflicts w/ any saved names (${!!conflict})`);
                    return res.send(`hasConflicting=${!!conflict}`);
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
                user = req.session.user;

            return getRoomsNamed.call(this, roomName, user).then(rooms => {

                log(`${user.username} is checking if project "${req.body.ProjectName}" is active (${rooms.areSame})`);
                // Check if it is actually the same - do the originTime's match?
                return res.send(`active=${rooms.areSame}`);
            });
        }
    },
    {
        Service: 'joinActiveProject',
        Parameters: 'ProjectName,owner',
        Method: 'post',
        Note: '',
        middleware: ['isLoggedIn', 'noCache', 'setUser'],
        Handler: function(req, res) {
            var roomName = req.body.ProjectName,
                user = req.session.user,
                owner = req.body.owner || user.username;

            log(`${user.username} joining active ${owner}/${roomName}`);
            return getRoomsNamed.call(this, roomName, user, owner).then(rooms => {
                // Get the active project and join it
                if (rooms.active) {
                    // Join the project
                    Utils.joinActiveProject(user.username, rooms.active, res);
                } else if (rooms.stored) {  // else, getProject w/ the stored version
                    sendProjectTo(rooms.stored, res);
                } else {  // if there is no stored version, ERROR!
                    res.send('ERROR: Project not found');
                }
            });
        }
    },
    {
        Service: 'getProject',
        Parameters: 'owner,projectName,socketId',
        Method: 'post',
        Note: '',
        middleware: ['isLoggedIn', 'noCache', 'setUser'],
        Handler: function(req, res) {
            var {owner, projectName, socketId} = req.body,
                user = req.session.user,
                socket = socketId && SocketManager.getSocket(socketId);

            if (socket) {
                socket.leave();
            }

            // Get the projectName
            trace(`${user.username} opening project ${owner}/${projectName}`);
            return getRoomsNamed.call(this, projectName, user, owner).then(rooms => {
                if (rooms.active) {
                    trace(`room with name ${projectName} already open. Are they the same? ${rooms.areSame}`);
                    if (rooms.areSame) {
                        // Clone, change the room name, and send!
                        // Since they are the same, we assume the user wants to create
                        // a copy of the active room
                        return rooms.stored.getCopyFor(user)
                            .then(copy => sendProjectTo(copy, res));
                    } else {
                        // not the same; simply change the name of the active room
                        // (the active room must be newer since it hasn't been saved
                        // yet)
                        trace(`active room is ${projectName} already open`);
                        rooms.active.changeName();
                        sendProjectTo(rooms.stored, res);
                    }
                } else if (rooms.stored) {
                    trace(`no active room with name ${projectName}. Proceeding normally`);
                    sendProjectTo(rooms.stored, res);
                } else {
                    res.send('ERROR: Project not found');
                }
            });
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
                project = req.body.ProjectName;

            log(user.username +' trying to delete "' + project + '"');

            // Get the project and call "destroy" on it
            return user.getProject(project)
                .then(project => {
                    if (!project) {
                        error(`project ${project} not found`);
                        return res.status(400).send(`${project} not found!`);
                    }

                    const active = RoomManager.isActiveRoom(project.getId());

                    if (active) {
                        return project.unpersist()
                            .then(() => {
                                trace(`project ${project.name} set to transient. will be deleted on users exit`);
                                return res.send('project deleted!');
                            });
                    } else {
                        return project.destroy()
                            .then(() => {
                                trace(`project ${project.name} deleted`);
                                return res.send('project deleted!');
                            });
                    }
                });
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
            return setProjectPublic(name, user, true)
                .then(() => res.send(`"${name}" is shared!`))
                .catch(err => res.send(`ERROR: ${err}`));
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

            return setProjectPublic(name, user, false)
                .then(() => res.send(`"${name}" is no longer shared`))
                .catch(err => res.send(`ERROR: ${err}`));
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
            return Projects.getRawProject(req.params.owner, name)
                .then(project => {
                    if (project) {
                        const thumbnail = getProjectThumbnail(project);
                        if (!thumbnail) {
                            const err = `could not find thumbnail for ${name}`;
                            this._logger.error(err);
                            return res.status(400).send(err);
                        }
                        this._logger.trace(`Applying aspect ratio for ${req.params.owner}'s ${name}`);
                        return applyAspectRatio(
                            thumbnail,
                            aspectRatio
                        ).then(buffer => {
                            this._logger.trace(`Sending thumbnail for ${req.params.owner}'s ${name}`);
                            res.contentType('image/png');
                            res.end(buffer, 'binary');
                        });
                    } else {
                        const err = `could not find project ${name}`;
                        this._logger.error(err);
                        return res.status(400).send(err);
                    }
                })
                .catch(err => {
                    this._logger.error(`padding image failed: ${err}`);
                    res.serverError(err);
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
            return example.getRoleNames()
                .then(names => example.getRole(names.shift()))
                .then(content => {
                    const thumbnail = Utils.xml.thumbnail(content.SourceCode);
                    return applyAspectRatio(thumbnail, aspectRatio);
                })
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
            return this.storage.users.get(username)
                .then(user => {
                    if (!user) {
                        log(`Could not find user ${username}`);
                        return res.status(400).send('ERROR: User not found');
                    }
                    return user.getProject(projectName);
                })
                .then(project => {
                    if (project && project.Public) {
                        return Utils.getRoomXML(project)
                            .then(xml => res.send(xml));
                    } else {
                        return res.status(400).send('ERROR: Project not available');
                    }
                })
                .catch(err => res.status(500).send(`ERROR: ${err}`));
        }
    }

].map(function(api) {
    // Set the URL to be the service name
    api.URL = api.URL || api.Service;
    return api;
});
