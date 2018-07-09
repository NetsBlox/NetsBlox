'use strict';

const _ = require('lodash');
var Utils = _.extend(require('../utils'), require('../server-utils.js')),
    Q = require('q'),

    debug = require('debug'),
    log = debug('netsblox:api:rooms:log'),
    warn = debug('netsblox:api:rooms:warn'),
    utils = require('../server-utils'),
    RoomManager = require('../rooms/room-manager'),
    SocketManager = require('../socket-manager'),
    Projects = require('../storage/projects'),
    invites = {};

module.exports = [
    // Friends
    {
        Service: 'getFriendList',
        Parameters: '',
        Method: 'Get',
        Note: '',
        middleware: ['isLoggedIn', 'setUser'],
        Handler: function(req, res) {
            return getFriendSockets(req.session.user)
                .then(sockets => {
                    const usernames = _.uniq(sockets.map(socket => socket.username));
                    return res.send(usernames);
                });
        }
    },
    {
        Service: 'getCollaborators',
        Parameters: 'projectId',
        Method: 'post',
        middleware: ['isLoggedIn', 'setUser'],
        Handler: function(req, res) {
            const {projectId} = req.body;
            let collaborators = null;

            return Projects.getRawProjectById(projectId)
                .then(metadata => {
                    collaborators = metadata.collaborators;
                    return getFriendSockets(req.session.user);
                })
                .then(friends => {
                    const usernames = _.uniq(friends.map(socket => socket.username));

                    return usernames.map(username => {
                        return {
                            username,
                            collaborating: collaborators.includes(username)
                        };
                    });
                })
                .then(users => res.send(users));
        }
    },
    {
        Service: 'evictCollaborator',
        Parameters: 'userId,projectId',
        Method: 'post',
        middleware: ['isLoggedIn'],
        Handler: function(req, res) {
            const {userId, projectId} = req.body;

            // Add better auth!
            // TODO
            return Projects.getById(projectId)
                .then(project => {
                    log(`removing collaborator ${userId} from project ${project.uuid()}`);
                    return project.removeCollaborator(userId);
                })
                .then(() => res.sendStatus(200));
        }
    },
    {
        Service: 'evictUser',
        Parameters: 'userId,role,ownerId,roomName',
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            // TODO: update this so it doesn't depend on the ws connection!
            let {role, roomName, ownerId, userId} = req.body,
                roomId = Utils.uuid(ownerId, roomName);

            // TODO: remove dependency on RoomManager
            const room = RoomManager.getExistingRoom(ownerId, roomName);

            // Get the socket at the given room role
            log(`roomId is ${roomId}`);
            log(`role is ${role}`);
            log(`userId is ${userId}`);

            const socket = room.getSocketsAt(role)
                .find(socket => socket.uuid === userId);

            if (!socket) {  // user is not online
                var err = `${userId} is not at ${role} at room ${roomId}`;
                this._logger.warn(err);
                return res.send('user has been evicted!');
            }

            // Remove the user from the room!
            log(`${userId} is evicted from room ${roomId}`);
            if (socket.username === ownerId) {  // removing another instance of self
                socket.newRoom();
            } else {  // Fork the room
            // TODO: remove dependency on RoomManager
                RoomManager.forkRoom(room, socket);
            }
            room.onRolesChanged();

            return room.getState()
                .then(state => res.json(state));
        }
    },
    {
        Service: 'inviteGuest',
        Parameters: 'socketId,invitee,ownerId,roomName,role',
        middleware: ['hasSocket', 'isLoggedIn'],
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            // TODO: update this so it doesn't depend on the ws connection!
            // Require:
            //  inviter
            //  invitee
            //  roomId
            //  role
            var inviter = req.session.username,
                {ownerId, roomName, invitee} = req.body,
                roomId = utils.uuid(ownerId, roomName),
                role = req.body.role,
                inviteId = ['room', inviter, invitee, roomId, role].join('-'),
                inviteeSockets = SocketManager.socketsFor(invitee);

            log(`${inviter} is inviting ${invitee} to ${role} at ${roomId}`);

            // Record the invitation
            // add projectId?
            // TODO
            invites[inviteId] = {
                owner: ownerId,
                roomName: roomName,
                room: roomId,
                role: role,
                invitee
            };

            // If the user is online, send the invitation via ws to the browser
            inviteeSockets
                .filter(socket => socket.uuid !== req.body.socketId)
                .forEach(socket => {
                    // Send the invite to the sockets
                    // add projectId?
                    // TODO
                    var msg = {
                        type: 'room-invitation',
                        id: inviteId,
                        roomName: roomName,
                        room: roomId,
                        inviter,
                        role: role
                    };
                    socket.send(msg);
                }
                );
            res.send('ok');
        }
    },
    {
        Service: 'invitationResponse',
        Parameters: 'inviteId,response,socketId',
        middleware: ['hasSocket', 'isLoggedIn'],
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            // Require:
            //  inviter
            //  invitee
            //  roomId
            //  role
            var username = req.session.username,
                id = req.body.inviteId,
                response = req.body.response === 'true',
                // TODO: store these in the database
                invitee = invites[id].invitee,
                socketId = req.body.socketId,
                closeInvite = {
                    type: 'close-invite',
                    id: id
                };

            // Notify other clients of response
            SocketManager.socketsFor(invitee)
                .filter(socket => socket.uuid !== socketId)
                .forEach(socket => socket.send(closeInvite));


            const invite = invites[id];
            delete invites[id];

            // Ignore if the invite no longer exists
            if (!invite && response) return res.status(400).send('ERROR: invite no longer exists');

            if (invite) {
                log(`${username} ${response ? 'accepted' : 'denied'} ` +
                    `invitation (${id}) for ${invite.role} at ${invite.room}`);
            }

            if (response) {
                return Q(acceptInvitation(invite, socketId))
                    .then(project => res.status(200).send(project))
                    .fail(err => res.status(500).send(`ERROR: ${err}`));
            } else {
                res.sendStatus(200);
            }
        }
    },
    {
        Service: 'deleteRole',
        Parameters: 'roleId,projectId',
        Method: 'post',
        Note: '',
        middleware: ['isLoggedIn'],
        Handler: function(req, res) {
            const {roleId, projectId} = req.body;

            const clients = SocketManager.getSocketsAt(projectId, roleId);
            if (clients.length) {
                return res.status(403).send('ERROR: Cannot delete occupied role. Remove the occupants first.');
            }

            // Add better auth
            // TODO
            return Projects.getById(projectId)
                .then(project => project.removeRoleById(roleId))
                .then(() => SocketManager.onRoomUpdate(projectId))
                .then(state => res.json(state));
        }
    },
    {
        Service: 'moveToRole',
        Parameters: 'projectId,roleId,clientId',
        middleware: ['isLoggedIn'],
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            const {roleId, projectId, clientId} = req.body;
            const {username} = req.session;

            // Add auth
            // TODO
            return Projects.getById(projectId)
                .then(project => {
                    if (!project.roles[roleId]) {
                        // Better error message!
                        // FIXME
                        return res.status(400).send(`Invalid Role ID: ${roleId}`);
                    }

                    // room update only sent via ws here...
                    // TODO
                    return SocketManager.setClientState(clientId, projectId, roleId, username)
                        .then(() => project.getRoleById(roleId))
                        .then(role => utils.serializeRole(role, project));
                })
                .then(xml => res.send(xml));
        }
    },
    {  // Create a new role
        Service: 'renameRole',
        Parameters: 'roleId,name,projectId',
        middleware: ['isLoggedIn'],
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            const {roleId, name, projectId} = req.body;
            // Add better auth!
            // TODO

            return Projects.getById(projectId)
                .then(project => project.setRoleName(roleId, name))
                .then(() => SocketManager.onRoomUpdate(projectId))
                .then(state => res.json(state));
        }
    },
    {  // Create a new role
        Service: 'addRole',
        Parameters: 'name,socketId,projectId',
        middleware: ['isLoggedIn'],
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            const {name, projectId} = req.body;
            return Projects.getById(projectId)
                .then(project => {
                    // What if project is not found?
                    // TODO
                    // This should be moved to a single location...
                    // Maybe add a findById which may return null...
                    return project.setRole(name, utils.getEmptyRole(name));
                })
                .then(() => SocketManager.onRoomUpdate(projectId))
                .then(state => res.json(state))
                .catch(err => {
                    this._logger.error(`Add role failed: ${err}`);
                    res.send(`ERROR: ${err.message}`);
                });

            // Add better auth based on the username
            // TODO
        }
    },
    {  // Create a new role and copy this project's blocks to it
        Service: 'cloneRole',
        Parameters: 'role,projectId',
        middleware: ['isLoggedIn'],
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            // Better auth!
            // TODO
            const {role, projectId} = req.body;
            return Projects.getById(projectId)
                .then(project => project.cloneRole(role))
                .then(() => SocketManager.onRoomUpdate(projectId))
                .then(state => res.json(state));

        }
    },
    {  // Collaboration
        Service: 'inviteToCollaborate',
        Parameters: 'socketId,invitee,ownerId,roomName,projectId',
        middleware: ['hasSocket', 'isLoggedIn'],
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            const {invitee, projectId, role, roomName} = req.body;
            var inviter = req.session.username,
                inviteId = ['collab', inviter, invitee, projectId, Date.now()].join('-'),
                inviteeSockets = SocketManager.socketsFor(invitee);

            log(`${inviter} is inviting ${invitee} to ${projectId}`);

            // Record the invitation
            invites[inviteId] = {
                owner: req.body.ownerId,
                projectId: projectId,
                invitee
            };

            // If the user is online, send the invitation via ws to the browser
            inviteeSockets
                .filter(socket => socket.uuid !== req.body.socketId)
                .forEach(socket => {
                    // Send the invite to the sockets
                    var msg = {
                        type: 'collab-invitation',
                        id: inviteId,
                        roomName: roomName,
                        projectId: projectId,
                        inviter,
                        role: role
                    };
                    socket.send(msg);
                }
                );
            res.send('ok');
        }
    },
    {
        Service: 'inviteCollaboratorResponse',
        Parameters: 'inviteId,response,socketId',
        middleware: ['hasSocket', 'isLoggedIn'],
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            var username = req.session.username,
                inviteId = req.body.inviteId,
                response = req.body.response === 'true',
                invitee = invites[inviteId].invitee,
                socketId = req.body.socketId,
                closeInvite = {
                    type: 'close-invite',
                    id: inviteId
                };

            // Notify other clients of response
            var allSockets = SocketManager.socketsFor(invitee),
                invite = invites[inviteId];

            allSockets.filter(socket => socket.uuid !== socketId)
                .forEach(socket => socket.send(closeInvite));

            // Ignore if the invite no longer exists
            if (!invite) {
                return res.status(500).send('ERROR: invite no longer exists');
            }

            log(`${username} ${response ? 'accepted' : 'denied'} ` +
                `collab invitation for ${invite.role} at ${invite.room}`);

            delete invites[inviteId];

            if (response) {
                // TODO: update the inviter...
                // Add the given user as a collaborator
                const {projectId} = invite;
                // TODO: update this so it doesn't depend on the ws connection!
                const room = RoomManager.getExistingRoomById(projectId);
                if (!room) {
                    // TODO: Look up the room
                    log(`project is not open "${projectId}`);
                    return Projects.getById(projectId)
                        .then(project => {
                            if (project) {
                                return project.addCollaborator(username)
                                    .then(() => res.status(200).send({projectId}));
                            } else {
                                return res.status(400).send('Project no longer exists');
                            }
                        });
                }
                return room.addCollaborator(username)
                    .then(() => res.status(200).send({projectId: projectId}));
            }
        }
    }
].map(function(api) {
    // Set the URL to be the service name
    api.URL = api.Service;
    return api;
});

function getFriendSockets(user) {
    log(`${user.username} requested friend list`);

    return user.getGroupMembers()
        .then(usernames => {
            let inGroup = {};
            usernames.forEach(name => inGroup[name] = true);
            return SocketManager.sockets()
                .filter(socket => !Utils.isSocketUuid(socket.username))
                .filter(socket => {
                    return socket.username !== user.username &&
                        inGroup[socket.username];
                });
        });
}

function acceptInvitation (invite, socketId) {
    const socket = SocketManager.getSocket(socketId);
            // TODO: remove dependency on RoomManager
    const room = RoomManager.getExistingRoom(invite.owner, invite.roomName);

    if (!room) {
        warn(`room no longer exists "${invite.room} ${JSON.stringify(invites)}`);
        return Q.reject(new Error('project is no longer open'));
    }

    if (!socket) {
        warn(`could not find socket "${invite.room} ${JSON.stringify(invites)}`);
        return Q.reject(new Error('could not find connected user'));
    }

    return room.getRole(invite.role)
        .then(project => {
            room.add(socket, invite.role);
            return Utils.serializeRole(project, room.getProject());
        });
}

