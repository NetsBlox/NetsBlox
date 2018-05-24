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
        Service: 'saveProject',
        Parameters: 'roleName,projectName,currentProjectName,ownerId,overwrite,srcXml,mediaXml',
        Method: 'Post',
        Note: '',
        middleware: ['isLoggedIn'],
        Handler: function(req, res) {
            const username = req.session.username;
            const {projectName, roleName, ownerId, currentProjectName, overwrite} = req.body;
            const {srcXml, mediaXml} = req.body;


            const saveAs = () => {
                const roleData = {
                    SourceCode: srcXml,
                    Media: mediaXml
                };
                activeRoom.changeName(projectName)
                    .then(() => activeRoom.getProject().archive())
                    .then(() => activeRoom.setRole(roleName, roleData))
                    .then(() => activeRoom.getProject().persist())
                    .then(() => res.status(200).send('saved'))
                    .catch(err => {
                        const msg = `could not save ${currentProjectName} for ${ownerId}: ${err}`;
                        error(msg);
                        throw err;
                    });
            };

            // If we are going to overwrite the project
            //   - set the name
            //   - if the other project is open, rename it
            //   - ow, delete it
            //
            // If we are not overwriting the project, just name it and save!

            trace(`Saving ${roleName} from ${currentProjectName} (${ownerId})`);

            // Check that the user can edit the project?
            const activeRoom = RoomManager.getExistingRoom(ownerId, currentProjectName);
            if (overwrite && projectName !== currentProjectName) {
                trace(`overwriting ${projectName} with ${currentProjectName} for ${username}`);

                const otherRoom = RoomManager.getExistingRoom(username, projectName);
                const isSame = otherRoom === activeRoom;
                if (otherRoom && !isSame) {  // rename the existing, active room
                    trace(`Renaming existing open project: ${projectName}`);
                    return otherRoom.changeName(projectName, true).then(saveAs);
                } else {  // delete the existing
                    return Projects.get(username, projectName)
                        .then(project => {
                            if (project) {
                                return project.destroy();
                            }
                        })
                        .then(saveAs);
                }
            } else {
                return saveAs();
            }
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
            var {user, username} = req.session.username,
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
                .then(() => activeRoom.save())
                .then(() => activeRoom.getProject().getCopy(user))
                .then(_project => project = _project)
                .then(() => project.setName(name))
                .then(() => project.persist())
                .then(() => {
                    trace(`${username} saved a copy of project: ${name}`);
                    res.sendStatus(200);
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
        Parameters: 'socketId',
        Method: 'post',
        Note: '',
        middleware: ['isLoggedIn', 'hasSocket', 'noCache', 'setUser'],
        Handler: function(req, res) {
            var socket = SocketManager.getSocket(req.body.socketId),
                roomName = socket._room.name,
                user = req.session.user;

            return getRoomsNamed.call(this, roomName, user).then(rooms => {

                var hasConflicting = rooms.stored && !rooms.areSame;

                log(`${user.username} is checking if project "${roomName}" conflicts w/ any saved names (${hasConflicting})`);
                // Check if it is actually the same - do the originTime's match?
                return res.send(`hasConflicting=${!!hasConflicting}`);
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
                        return rooms.stored.getCopy(user)
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
