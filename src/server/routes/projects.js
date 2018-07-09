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

const DEFAULT_ROLE_NAME = 'myRole';
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
    preview.ID = project._id.toString();
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
            // TODO: remove dependency on RoomManager
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
        Service: 'setProjectName',
        Parameters: 'projectId,name',
        Method: 'Post',
        Note: '',
        Handler: function(req, res) {
            const {projectId} = req.body;
            let {name} = req.body;

            // TODO: remove dependency on RoomManager
            const room = RoomManager.getExistingRoomById(projectId);
            if (room) {
                return room.changeName(name, false, true)
                    .then(name => res.send({name}));
            } else {
                return Projects.getById(projectId)
                    .then(project => {
                        if (project) {
                            // Get a valid name
                            Projects.getAllRawUserProjects(project.owner)
                                .then(projects => {
                                    const nameToID = {};
                                    projects
                                        .forEach(project => nameToID[project.name] = project._id.toString());
                                    const basename = name;
                                    let i = 2;
                                    while (nameToID[name] && nameToID[name] !== projectId) {
                                        name = `${basename} (${i})`;
                                        i++;
                                    }
                                    return project.setName(name);
                                })
                                .then(() => res.send({name}));
                        } else {
                            res.status(400).send(`Project Not Found`);
                        }
                    });
            }
        }
    },
    {
        Service: 'newProject',
        Parameters: 'clientId,roleName',
        Method: 'Post',
        Note: '',
        Handler: function(req, res) {
            const {clientId} = req.body;
            let {roleName} = req.body;

            const name = 'untitled';
            let user = null;
            let userId = clientId;

            roleName = roleName || DEFAULT_ROLE_NAME;

            let project = null;
            return Q.nfcall(middleware.trySetUser, req, res)
                .then(loggedIn => {
                    if (loggedIn) {
                        user = req.session.user;
                        userId = req.session.username;
                    }

                    return Projects.new({owner: userId})
                        .then(newProject => {
                            project = newProject;
                            const projectId = project._id.toString();
                            return project.setRole(roleName, Utils.getEmptyRole(roleName))
                                .then(() => user ? user.getNewNameFor(name, projectId) : name)
                                .then(name => project.setName(name));
                        });
                })
                .then(() => project.getRoleId(roleName))
                .then(roleId => {
                    const projectId = project.getId();
                    this._logger.trace(`Created new project: ${projectId} (${roleName})`);
                    return SocketManager.setClientState(clientId, projectId, roleId, userId)
                        .then(() => res.send({
                            projectId,
                            roleId,
                            name: project.name,
                            roleName
                        }));
                });
        }
    },
    {
        Service: 'importProject',
        Parameters: 'clientId,projectId,name,role,roles',
        Method: 'Post',
        Note: '',
        Handler: function(req, res) {
            const {clientId, name, role, roles} = req.body;
            const socket = SocketManager.getSocket(clientId);

            return RoomManager.createRoom(socket, name)
                .then(room => {
                    return room.createRole(role)
                        .then(() => room.changeName(name, false, true))
                        .then(() => room.add(socket, role));
                })
                .then(() => socket.importRoom(roles))
                .then(room => {
                    const projectId = room.getProjectId();
                    return room.changeName(name, false, true)
                        .then(() => room.getProject().getRoleId(role))
                        .then(roleId => res.send({projectId, roleId}));
                });
        }
    },
    {
        Service: 'saveProject',
        Parameters: 'roleId,roleName,projectName,projectId,ownerId,overwrite,srcXml,mediaXml',
        Method: 'Post',
        Note: '',
        middleware: ['isLoggedIn', 'setUser'],
        Handler: function(req, res) {
            // Check permissions
            // TODO
            const {user, username} = req.session;
            const {roleId, ownerId, projectId, overwrite, roleName} = req.body;
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
            trace(`Saving ${roleId} from ${projectName} (${projectId})`);
            return Projects.getById(projectId)
                .then(_project => {
                    // if project name is different from save name,
                    // it is "Save as" (make a copy)

                    project = _project;
                    if (!project) {
                        throw new Error(`Project not found.`);
                    }

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
            // TODO: remove dependency on RoomManager
                                const room = RoomManager.getExistingRoomById(collision.getId());
                                if (room) {
                                    trace(`found name collision with open project. Renaming and unpersisting.`);
                                    return room.changeName(null, true, true)
                                        .then(() => collision.unpersist());
                                } else if (overwrite) {
                                    trace(`found name collision with project. Overwriting ${project.name}.`);
                                    return collision.destroy();
                                } else {  // rename the project
            // TODO: remove dependency on RoomManager
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
            // TODO: remove dependency on RoomManager
                            const room = RoomManager.getExistingRoomById(projectId);
                            if (room) {
                                return room.update(projectName);
                            }
                        });
                })
                .then(() => project.archive())
                .then(() => {
                    const roleData = {
                        ProjectName: roleName,
                        SourceCode: srcXml,
                        Media: mediaXml
                    };
                    return project.setRoleById(roleId, roleData);
                })
                .then(() => project.persist())
                .then(() => res.status(200).send({name: projectName, projectId, roleId}))
                .catch(err => {
                    error(`Error saving ${projectId}:`, err);
                    return res.status(500).send(err.message);
                });
        }
    },
    {
        Service: 'saveProjectCopy',
        Parameters: 'clientId,projectId',
        Method: 'Post',
        Note: '',
        middleware: ['isLoggedIn', 'setUser'],
        Handler: function(req, res) {
            // Save the latest role content (include xml in the req)
            // TODO
            const {user} = req.session;
            const {projectId} = req.body;

            // make a copy of the project for the given user and save it!
            let name = null;
            let project = null;
            return user.getNewName(name)
                .then(_name => {
                    name = _name;
                    return Projects.getById(projectId);
                })
                .then(project => {
                    if (!project) {
                        throw new Error(`Project not found.`);
                    }
                    name = `Copy of ${project.name || 'untitled'}`;
                    return project.getCopyFor(user);
                })
                .then(_project => project = _project)
                .then(() => project.setName(name))
                .then(() => project.persist())
                .then(() => {
                    trace(`${user.username} saved a copy of project: ${name}`);
                    const result = {
                        name,
                        projectId: project.getId()
                    };
                    return res.status(200).send(result);
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
        Method: 'Get',
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
                        .find(project => project.name === name && project._id.toString() !== projectId);

                    log(`${user.username} is checking if "${name}" conflicts w/ any saved names (${!!conflict})`);
                    return res.send(`hasConflicting=${!!conflict}`);
                });
        }
    },
    {
        Service: 'isProjectActive',
        Parameters: 'clientId,projectId',
        Method: 'post',
        Note: '',
        middleware: ['isLoggedIn', 'noCache'],
        Handler: function(req, res) {
            const {clientId, projectId} = req.body;
            // TODO: remove dependency on RoomManager
            const room = RoomManager.getExistingRoomById(projectId);
            let active = !!room;

            if (room) {
                const userCount = room.sockets().filter(socket => socket.uuid !== clientId).length;
                active = userCount > 0;
            }

            return res.json({active});
        }
    },
    {
        Service: 'joinActiveProject',
        Parameters: 'projectId',
        Method: 'post',
        Note: '',
        middleware: ['isLoggedIn', 'noCache', 'setUser'],
        Handler: function(req, res) {
            const {projectId} = req.body;
            const {user} = req.session;

            log(`${user.username} joining project ${projectId}`);
            // Join the given project
            // TODO: remove dependency on RoomManager
            const room = RoomManager.getExistingRoomById(projectId);
            if (room) {
                Utils.joinActiveProject(user.username, room, res);
            } else {
                return Projects.getById(projectId)
                    .then(project => {
                        if (project) {
                            return sendProjectTo(project, res);
                        } else {
                            return res.send('ERROR: Project not found');
                        }
                    });
            }
        }
    },
    {
        Service: 'getProjectByName',
        Parameters: 'owner,projectName',
        Method: 'post',
        Note: '',
        middleware: ['isLoggedIn', 'noCache', 'setUser'],
        Handler: function(req, res) {
            const {owner, projectName} = req.body;
            const {user, username} = req.session;

            // Check permissions
            // TODO

            // Verify that the project names are not colliding?
            // TODO
            trace(`${username} opening project ${owner}/${projectName}`);
            return Projects.get(owner, projectName)
                .then(project => {
                    if (project) {
                        if (username !== owner) {  // send a copy
                            return project.getCopyFor(user)
                                .then(copy => sendProjectTo(copy, res));
                        }

                        return sendProjectTo(project, res);
                    } else {
                        res.send('ERROR: Project not found');
                    }
                });

            // Check if the project is currently open
            // TODO
            // If open, create a copy and open it
            // Ensure no name collisions
        }
    },
    {
        Service: 'getProject',
        Parameters: 'projectId',
        Method: 'post',
        Note: '',
        middleware: ['isLoggedIn', 'noCache', 'setUser'],
        Handler: function(req, res) {
            const {projectId} = req.body;
            const {username} = req.session;

            // Get the projectName
            // TODO: update this so it doesn't depend on the ws connection!
            trace(`${username} opening project ${projectId}`);
            return Projects.getById(projectId)
                .then(project => {
                    // auth!
                    // TODO
                    return sendProjectTo(project, res);
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

            // TODO: remove dependency on RoomManager
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
