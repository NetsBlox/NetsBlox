'use strict';

var _ = require('lodash'),
    Utils = _.extend(require('../utils'), require('../server-utils.js')),
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
                    var resp = {};
                    sockets.forEach(socket => resp[socket.username] = socket.uuid);

                    log(Utils.serialize(resp));
                    return res.send(Utils.serialize(resp));
                });
        }
    },
    {
        Service: 'getCollaborators',
        Parameters: 'socketId',
        Method: 'post',
        middleware: ['isLoggedIn', 'hasSocket', 'setUser'],
        Handler: function(req, res) {
            const socket = SocketManager.getSocket(req.body.socketId);
            let room = null;

            return socket.getRoom()
                .then(_room => {
                    room = _room;
                    return getFriendSockets(req.session.user);
                })
                .then(friends => {
                    const collaborators = room.getCollaborators();
                    const resp = {};
                    let username;

                    friends.forEach(socket => {
                        username = socket.username;

                        if (collaborators.includes(username)) {
                            resp[socket.username] = socket.uuid;
                        } else {
                            resp[socket.username] = false;
                        }
                    });
                    return res.send(Utils.serialize(resp));
                });

        }
    },
    {
        Service: 'evictCollaborator',
        Parameters: 'socketId,userId',
        Method: 'post',
        middleware: ['hasSocket', 'isLoggedIn'],
        Handler: function(req, res) {
            var {socketId, userId} = req.body,
                socket = SocketManager.getSocket(socketId);

            return socket.getRoom().then(room => {
                // Remove all sockets with the given username
                log(`removing collaborator ${userId} from room ${room.uuid}`);
                room.removeCollaborator(userId);
                return res.sendStatus(200);
            });
        }
    },
    {
        Service: 'evictUser',
        Parameters: 'userId,role,ownerId,roomName',
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            let {role, roomName, ownerId, userId} = req.body,
                roomId = Utils.uuid(ownerId, roomName);

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
        Parameters: 'role,ownerId,roomName',
        Method: 'post',
        Note: '',
        middleware: ['isLoggedIn'],
        Handler: function(req, res) {
            var username = req.session.username,
                role = req.body.role,
                ownerId = req.body.ownerId,
                roomName = req.body.roomName,
                roomId = utils.uuid(ownerId, roomName);

            const room = RoomManager.getExistingRoom(ownerId, roomName);
                    //  Get the room
            if (!room) {
                this._logger.error(`Could not find room ${roomId} for ${username}`);
                return res.status(404).send('ERROR: Could not find room');
            }

            //  Verify that the username is either the ownerId
            this._logger.trace(`ownerId is ${room.owner.username} and username is ${username}`);
            if (!room.isEditableFor(username)) {
                this._logger.error(`${username} does not have permission to edit ${role} at ${roomId}`);
                return res.status(403).send(`ERROR: You do not have permission to delete ${role}`);
            }

            // Disallow deleting roles without evicting the users first
            const sockets = room.getSocketsAt(role) || [];
            if (sockets.length) {
                return res.status(403).send('ERROR: Cannot delete occupied role. Remove the occupants first.');
            }

            //  Remove the given role
            return room.removeRole(role)
                .then(() => room.getState())
                .then(state => res.json(state));
        }
    },
    {
        Service: 'moveToRole',
        Parameters: 'projectId,dstId,socketId',
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            const {dstId, socketId, projectId} = req.body;
            const socket = SocketManager.getSocket(socketId);

            const room = RoomManager.getExistingRoomById(projectId);
            if (!socket) {
                this._logger.error('Could not find socket for ' + socketId);
                return res.status(404).send('ERROR: Not fully connected... Please try again or try a different browser (and report this issue to the netsblox maintainers!)');
            }

            if (!socket.canEditRoom()) {
                return res.status(403).send('ERROR: permission denied');
            }

            return room.getRole(dstId)
                .then(project => {
                    if (project) {
                        project = Utils.serializeRole(project, room.getProject());
                    }
                    // Update the room state
                    room.add(socket, dstId);

                    res.send(project);
                })
                .catch(err => res.status(500).send('ERROR: ' + err));
        }
    },
    {  // Create a new role
        Service: 'renameRole',
        Parameters: 'roleId,name,socketId,projectId',
        middleware: ['hasSocket', 'isLoggedIn'],
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            const {roleId, name} = req.body;
            const socket = SocketManager.getSocket(req.body.socketId);

            if (!socket.canEditRoom()) {
                this._logger.error(`${socket.username} tried to rename role... DENIED`);
                return res.status(403).send('ERROR: Guests can\'t rename roles');
            }

            const room = socket.getRoomSync();
            const project = room.getProject();
            return project.getRoleName(roleId)
                .then(oldName => room.renameRole(oldName, name))
                .then(() => room.getState())
                .then(state => res.json(state))
                .catch(err => {
                    this._logger.error(`Rename role failed: ${err}`);
                    res.send(`ERROR: ${err.message}`);
                });
        }
    },
    {  // Create a new role
        Service: 'addRole',
        Parameters: 'name,socketId,projectId',
        middleware: ['hasSocket', 'isLoggedIn'],
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            const {name, projectId} = req.body;
            const socket = SocketManager.getSocket(req.body.socketId);

            if (!socket.canEditRoom()) {
                this._logger.error(`${socket.username} tried to create role... DENIED`);
                return res.status(403).send('ERROR: Guests can\'t create roles');
            }

            const room = RoomManager.getExistingRoomById(projectId);
            return room.createRole(name)
                .then(() => room.getState())
                .then(state => res.json(state))
                .catch(err => {
                    this._logger.error(`Add role failed: ${err}`);
                    res.send(`ERROR: ${err.message}`);
                });
        }
    },
    {  // Create a new role and copy this project's blocks to it
        Service: 'cloneRole',
        Parameters: 'role,socketId',
        middleware: ['hasSocket'],
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            // Check that the requestor is the owner
            var socket = SocketManager.getSocket(req.body.socketId),
                role = req.body.role,
                room = socket._room;

            if (!socket.canEditRoom()) {
                this._logger.error(`${socket.username} tried to clone role... DENIED`);
                return res.status(403).send('ERROR: Guests can\'t clone roles');
            }

            return room.cloneRole(role)
                .then(() => room.getState())
                .then(state => res.json(state))
                .catch(err => {
                    this._logger.error(`Clone role failed: ${err}`);
                    res.send(`ERROR: ${err}`);
                });
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
                        ProjectID: projectId,
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
                .filter(socket => {
                    return socket.username !== user.username &&
                        socket.loggedIn && inGroup[socket.username];
                });
        });
}

function acceptInvitation (invite, socketId) {
    const socket = SocketManager.getSocket(socketId);
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

