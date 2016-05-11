'use strict';

var _ = require('lodash'),
    Utils = _.extend(require('../Utils'), require('../ServerUtils.js')),

    debug = require('debug'),
    log = debug('NetsBlox:API:Rooms:log'),
    warn = debug('NetsBlox:API:Rooms:warn'),
    error = debug('NetsBlox:API:Rooms:error'),
    utils = require('../ServerUtils'),
    invites = {};


var acceptInvitation = function(username, id, response, socketId, callback) {
    var socket = this.sockets[socketId],
        invite = invites[id];

    // Ignore if the invite no longer exists
    if (!invite) {
        return callback('ERROR: invite no longer exists');
    }

    log(`${username} ${response ? 'accepted' : 'denied'} ` +
        `invitation for ${invite.role} at ${invite.room}`);

    delete invites[id];

    if (response) {
        // Add the roleId to the room (if doesn't exist)
        let room = this.rooms[invite.room],
            project;

        if (!room) {
            warn(`room no longer exists "${invite.room}`);
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
            project = Utils.serializeProject(project);
        }
        callback(null, project);
    }
};

module.exports = [
    // Friends
    {
        Service: 'getFriendList',
        Parameters: '',
        Method: 'Get',
        Note: '',
        middleware: ['isLoggedIn'],
        Handler: function(req, res) {
            var username = req.session.username,
                uuids = Object.keys(this.sockets),
                socket,
                resp = {};

            log(username +' requested friend list');

            warn('returning ALL active sockets');
            for (var i = uuids.length; i--;) {
                socket = this.sockets[uuids[i]];
                if (socket.username !== username && socket.loggedIn) {
                    resp[socket.username] = uuids[i];
                }
            }
            log(Utils.serialize(resp));
            return res.send(Utils.serialize(resp));
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
                room = this.rooms[roomId];

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
                    this.forkRoom({room, socket});
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
        Service: 'inviteToRoom',
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
                inviteId = [inviter, invitee, roomId, roleId].join('-'),
                inviteeSockets = this.socketsFor(invitee);

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
            this.socketsFor(invitee)
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
                room = this.rooms[roomId];

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
                this.forkRoom({room, roleId});
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
            var socket = this.sockets[socketId],
                roleId = req.body.roleId,
                dstId = req.body.dstId,
                ownerId = req.body.ownerId,
                roomName = req.body.roomName,
                roomId = Utils.uuid(ownerId, roomName),
                room = this.rooms[roomId];

            if (!socket) {
                this._logger.error('Could not find socket for ' + socketId);
                return res.status(404).send('ERROR: Not fully connected... Please try again or try a different browser (and report this issue to the netsblox maintainers!)');
            }

            if (!socket.isOwner()) {
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
                    project = Utils.serializeProject(project);
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
            var socket = this.sockets[req.body.socketId],
                roleId = req.body.roleId,
                room = socket._room,
                newRole;

            if (!socket.isOwner()) {
                this._logger.error(`${socket.username} tried to clone role... DENIED`);
                return res.status(403).send('ERROR: Only owners can clone roles');
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
                    }
                    res.send(encodeURIComponent(newRole));
                });
            } else {  // use the current cached value
                room.cachedProjects[newRole] = room.cachedProjects[roleId];
                res.send(encodeURIComponent(newRole));
            }
        }
    }
].map(function(api) {
    // Set the URL to be the service name
    api.URL = api.Service;
    return api;
});
