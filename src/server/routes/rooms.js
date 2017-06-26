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
        middleware: ['isLoggedIn'],
        Handler: function(req, res) {
            var sockets = getFriendSockets(req.session.username),
                resp = {};

            sockets.forEach(socket => resp[socket.username] = socket.uuid);

            log(Utils.serialize(resp));
            return res.send(Utils.serialize(resp));
        }
    },
    {
        Service: 'getCollaborators',
        Parameters: 'socketId',
        Method: 'post',
        middleware: ['isLoggedIn', 'hasSocket'],
        Handler: function(req, res) {
            const socket = SocketManager.getSocket(req.body.socketId);

            return socket.getRoom().then(room => {
                const friends = getFriendSockets(req.session.username);
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
        Parameters: 'userId,roleId,ownerId,roomName',
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            var roleId = req.body.roleId,
                roomName = req.body.roomName,
                ownerId = req.body.ownerId,
                roomId = Utils.uuid(ownerId, roomName),
                userId = req.body.userId,
                room = RoomManager.rooms[roomId];

            // Get the socket at the given room role
            log(`roomId is ${roomId}`);
            log(`roleId is ${roleId}`);
            log(`userId is ${userId}`);

            const socket = room.getSocketsAt(roleId)
                .find(socket => socket.username === userId);

            if (!socket) {  // user is not online
                var err = `${userId} is not at ${roleId} at room ${roomId}`;
                this._logger.warn(err);
                return res.send('user has been evicted!');
            }

            // Remove the user from the room!
            log(`${userId} is evicted from room ${roomId}`);
            if (userId === ownerId) {  // removing another instance of self
                socket.newRoom();
            } else {  // Fork the room
                RoomManager.forkRoom(room, socket);
            }
            room.onRolesChanged();
        }
    },
    {
        Service: 'inviteGuest',
        Parameters: 'socketId,invitee,ownerId,roomName,roleId',
        middleware: ['hasSocket', 'isLoggedIn'],
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            // Require:
            //  inviter
            //  invitee
            //  roomId
            //  roleId
            var inviter = req.session.username,
                invitee = req.body.invitee,
                roomName = req.body.roomName,
                roomId = utils.uuid(req.body.ownerId, roomName),
                roleId = req.body.roleId,
                inviteId = ['room', inviter, invitee, roomId, roleId].join('-'),
                inviteeSockets = SocketManager.socketsFor(invitee);

            log(`${inviter} is inviting ${invitee} to ${roleId} at ${roomId}`);

            // Record the invitation
            invites[inviteId] = {
                room: roomId,
                role: roleId,
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
                        role: roleId
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
            //  roleId
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
        Parameters: 'roleId,ownerId,roomName',
        Method: 'post',
        Note: '',
        middleware: ['isLoggedIn'],
        Handler: function(req, res) {
            var username = req.session.username,
                roleId = req.body.roleId,
                ownerId = req.body.ownerId,
                roomName = req.body.roomName,
                roomId = utils.uuid(ownerId, roomName),
                room = RoomManager.rooms[roomId];

            //  Get the room
            if (!room) {
                this._logger.error(`Could not find room ${roomId} for ${username}`);
                return res.status(404).send('ERROR: Could not find room');
            }
            
            //  Verify that the username is either the ownerId
            this._logger.trace(`ownerId is ${room.owner.username} and username is ${username}`);
            if (!room.isEditableFor(username)) {
                this._logger.error(`${username} does not have permission to edit ${roleId} at ${roomId}`);
                return res.status(403).send(`ERROR: You do not have permission to delete ${roleId}`);
            }

            // Disallow deleting roles without evicting the users first
            const sockets = room.getSocketsAt(roleId) || [];
            if (sockets.length) {
                return res.status(403).send('ERROR: Cannot delete occupied role. Remove the occupants first.');
            }

            //  Remove the given role
            return room.removeRole(roleId)
                .then(() => res.send('ok'));
        }
    },
    {
        Service: 'moveToRole',
        Parameters: 'dstId,roleId,ownerId,roomName,socketId',
        middleware: ['hasSocket'],
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            var socketId = req.body.socketId;
            var socket = SocketManager.getSocket(socketId),
                roleId = req.body.roleId,
                dstId = req.body.dstId,
                ownerId = req.body.ownerId,
                roomName = req.body.roomName,
                roomId = Utils.uuid(ownerId, roomName),
                room = RoomManager.rooms[roomId];

            if (!socket) {
                this._logger.error('Could not find socket for ' + socketId);
                return res.status(404).send('ERROR: Not fully connected... Please try again or try a different browser (and report this issue to the netsblox maintainers!)');
            }

            if (!socket.canEditRoom()) {
                return res.status(403).send('ERROR: permission denied');
            }

            //  Cache the current state in the active room
            return room.saveRole(roleId)
                .then(() => {
                    // Reply w/ the new role code
                    return room.getRole(dstId);
                })
                .then(project => {
                    if (project) {
                        project = Utils.serializeRole(project, room.name);
                    }
                    // Update the room state
                    room.add(socket, dstId);

                    res.send(project);
                })
                .catch(err => res.status(500).send('ERROR: ' + err));
        }
    },
    {  // Create a new role and copy this project's blocks to it
        Service: 'cloneRole',
        Parameters: 'roleId,socketId',
        middleware: ['hasSocket'],
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            // Check that the requestor is the owner
            var socket = SocketManager.getSocket(req.body.socketId),
                roleId = req.body.roleId,
                room = socket._room;

            if (!socket.canEditRoom()) {
                this._logger.error(`${socket.username} tried to clone role... DENIED`);
                return res.status(403).send('ERROR: Guests can\'t clone roles');
            }

            return room.cloneRole(roleId)
                .then(newRole => res.send(encodeURIComponent(newRole)))
                .catch(err => {
                    this._logger.error(`Clone role failed: ${err}`);
                    res.send(`ERROR: ${err}`);
                });
        }
    },
    {  // Collaboration
        Service: 'inviteToCollaborate',
        Parameters: 'socketId,invitee,ownerId,roomName',
        middleware: ['hasSocket', 'isLoggedIn'],
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            var inviter = req.session.username,
                invitee = req.body.invitee,
                roomName = req.body.roomName,
                roomId = utils.uuid(req.body.ownerId, roomName),
                roleId = req.body.roleId,
                inviteId = ['collab', inviter, invitee, roomId, roleId].join('-'),
                inviteeSockets = SocketManager.socketsFor(invitee);

            log(`${inviter} is inviting ${invitee} to ${roomId}`);

            // Record the invitation
            invites[inviteId] = {
                owner: req.body.ownerId,
                project: roomName,  // TODO: This would be nice to be an id...
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
                        room: roomId,
                        inviter,
                        role: roleId
                    };
                    socket.send(msg);
                }
            );
            res.send('ok');
        }
    },
    {
        Service: 'inviteCollaboratorResponse',
        Parameters: 'inviteId,response,socketId,collabId',
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
                const uuid = Utils.uuid(invite.owner, invite.project);
                let project = RoomManager.rooms[uuid];

                if (!project) {
                    // TODO: Look up the room
                    warn(`room no longer exists "${uuid}`);
                    return Projects.getProject(invite.owner, invite.project)
                        .then(project => project.addCollaborator(username))
                        .then(() => res.sendStatus(200));
                }
                project.addCollaborator(username).then(() => res.sendStatus(200));
            }
        }
    }
].map(function(api) {
    // Set the URL to be the service name
    api.URL = api.Service;
    return api;
});

function getFriendSockets(username) {
    log(username +' requested friend list');
    warn('returning ALL active sockets');

    var allSockets = SocketManager.sockets()
        .filter(socket => socket.username !== username && socket.loggedIn);

    return allSockets;
}

function acceptInvitation (invite, socketId) {
    const socket = SocketManager.getSocket(socketId);
    const room = RoomManager.rooms[invite.room];

    if (!room) {
        warn(`room no longer exists "${invite.room} ${JSON.stringify(invites)}`);
        throw 'project is no longer open';
    }

    if (room.isOccupied(invite.role)) {
        throw 'role is occupied';
    }

    return room.getRole(invite.role)
        .then(project => {
            if (socket) {
                socket.join(room, invite.role);
            } else {
                room.onRolesChanged();
            }

            return Utils.serializeRole(project, room.name);
        });
}

