'use strict';

var _ = require('lodash'),
    Utils = _.extend(require('../utils'), require('../server-utils.js')),

    debug = require('debug'),
    log = debug('netsblox:api:rooms:log'),
    warn = debug('netsblox:api:rooms:warn'),
    error = debug('netsblox:api:rooms:error'),
    utils = require('../server-utils'),
    RoomManager = require('../rooms/room-manager'),
    SocketManager = require('../socket-manager'),
    ProjectStorage = require('../storage/projects'),
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
                const collaborators = room.collaborators;
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
                socket,
                room = RoomManager.rooms[roomId];

            // Get the socket at the given room role
            log(`roomId is ${roomId}`);
            log(`roleId is ${roleId}`);
            log(`userId is ${userId}`);
            socket = room.roles[roleId];

            if (!socket) {  // user is not online
                this._logger.warn(`Cannot remove role ${roleId} - no associated socket!`);
                return res.send('user has been evicted!');
            }

            if (socket.username === userId) {
                // Remove the user from the room!
                log(`${userId} is evicted from room ${roomId}`);
                if (userId === ownerId) {  // removing another instance of self
                    socket.newRoom();
                } else {  // Fork the room
                    RoomManager.forkRoom({room, socket});
                }
                room.onRolesChanged();
            } else {
                var err = `${userId} is not at ${roleId} at room ${roomId}`;
                error(err);
                return res.status(400).send(err);
            }
        }
    },
    {
        // TODO: update this!
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
                inviteId = req.body.inviteId,
                response = req.body.response === 'true',
                invitee = invites[inviteId].invitee,
                socketId = req.body.socketId,
                closeInvite = {
                    type: 'close-invite',
                    id: inviteId
                };

            // Notify other clients of response
            SocketManager.socketsFor(invitee)
                .filter(socket => socket.uuid !== socketId)
                .forEach(socket => socket.send(closeInvite));

            acceptInvitation.call(this,
                username,
                inviteId,
                response,
                socketId,
                (err, project) => {
                    if (err) {
                        return res.status(500).send(err);
                    }
                    res.status(200).send(project);
                }
            );
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
            //      or the owner of the role
            this._logger.trace(`ownerId is ${room.owner.username} and username is ${username}`);
            if (room.owner.username !== username && !!room.roles[roleId] &&
                room.roles[roleId].username !== username) {

                this._logger.error(`${username} does not have permission to edit ${roleId} at ${roomId}`);
                return res.status(403).send(`ERROR: You do not have permission to delete ${roleId}`);
            }

            //  Get the socket and join a different room (if not the owner)
            //  TODO: Check that it isn't the owner
            //  TODO: Check that the owner doesn't remove the last role
            // If the role has an owner...
            if (room.roles[roleId]) {
                RoomManager.forkRoom({room, roleId});
            }

            //  Remove the given role
            room.removeRole(roleId);
            res.send('ok');
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
            room.cache(roleId, err => {
                if (err) {
                    return res.status(500).send('ERROR: ' + err);
                }

                // Update the room state
                room.move({src: roleId, dst: dstId});

                // Reply w/ the new role code
                var project = room.cachedProjects[dstId] || null;
                if (project) {
                    project = Utils.serializeRole(project, room.name);
                }
                res.send(project);
            });
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
                room = socket._room,
                newRole;

            if (!socket.canEditRoom()) {
                this._logger.error(`${socket.username} tried to clone role... DENIED`);
                return res.status(403).send('ERROR: Guests can\'t clone roles');
            }

            // Create the new role
            var count = 2;
            while (room.roles.hasOwnProperty(newRole = `${roleId} (${count++})`));
            room.createRole(newRole);

            // Get the project json
            if (room.roles[roleId]) {  // Request via ws
                room.cache(roleId, err => {
                    if (!err) {
                        room.cachedProjects[newRole] = room.cachedProjects[roleId];
                        room.cachedProjects[newRole].ProjectName = newRole;
                    }
                    res.send(encodeURIComponent(newRole));
                });
            } else {  // use the current cached value
                room.cachedProjects[newRole] = room.cachedProjects[roleId];
                res.send(encodeURIComponent(newRole));
            }
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
                    return ProjectStorage.getProject(invite.owner, invite.project)
                        .then(project => {
                            project.addCollaborator(username);
                            project.save();
                            return res.sendStatus(200);
                        });
                }
                project.addCollaborator(username);
                return res.sendStatus(200);
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

function acceptInvitation (username, id, response, socketId, callback) {
    var socket = SocketManager.getSocket(socketId),
        invite = invites[id];

    // Ignore if the invite no longer exists
    if (!invite) {
        return callback('ERROR: invite no longer exists');
    }

    log(`${username} ${response ? 'accepted' : 'denied'} ` +
        `invitation (${id}) for ${invite.role} at ${invite.room}`);

    delete invites[id];

    if (response) {
        // Add the roleId to the room (if doesn't exist)
        let room = RoomManager.rooms[invite.room],
            project;

        if (!room) {
            warn(`room no longer exists "${invite.room} ${JSON.stringify(invites)}`);
            return callback('ERROR: project is no longer open');
        }

        if (room.roles[invite.role]) {
            return callback('ERROR: role is occupied');
        }

        if (socket) {
            socket.join(room, invite.role);
        } else {
            room.onRolesChanged();
        }

        project = room.cachedProjects[invite.role] || null;
        if (project) {
            project = Utils.serializeRole(project, room.name);
        }
        callback(null, project);
    }
}

