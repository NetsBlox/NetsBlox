'use strict';

var _ = require('lodash'),
    Utils = _.extend(require('../Utils'), require('../ServerUtils.js')),

    debug = require('debug'),
    log = debug('NetsBlox:API:Tables:log'),
    warn = debug('NetsBlox:API:Tables:warn'),
    error = debug('NetsBlox:API:Tables:error'),
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
        `invitation for ${invite.seat} at ${invite.table}`);

    delete invites[id];

    if (response) {
        // Add the seatId to the table (if doesn't exist)
        let table = this.tables[invite.table],
            project;

        if (!table) {
            warn(`table no longer exists "${invite.table}`);
            return callback('ERROR: project is no longer open');
        }

        if (table.seats[invite.seat]) {
            return callback('ERROR: seat is occupied');
        }

        if (socket) {
            socket.join(table, invite.seat);
        } else {
            table.onSeatsChanged();
        }

        project = table.cachedProjects[invite.seat] || null;
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
        Handler: function(req, res) {
            var username = req.session.username,
                uuids = Object.keys(this.sockets),
                socket,
                table,
                resp = {};

            log(username +' requested friend list');

            warn('returning ALL active sockets');
            for (var i = uuids.length; i--;) {
                socket = this.sockets[uuids[i]];
                // FIXME: We should be able to invite ourselves somehow...
                if (socket.username !== username && socket.loggedIn &&
                    !socket.isVirtualUser()) {
                    resp[socket.username] = uuids[i];
                }
            }
            log(Utils.serialize(resp));
            return res.send(Utils.serialize(resp));
        }
    },
    {
        Service: 'evictUser',
        Parameters: 'userId,seatId,ownerId,tableName',
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            var seatId = req.body.seatId,
                tableName = req.body.tableName,
                ownerId = req.body.ownerId,
                tableId = Utils.uuid(ownerId, tableName),
                userId = req.body.userId,
                socket,
                table = this.tables[tableId];

            // Get the socket at the given table seat
            log(`tableId is ${tableId}`);
            log(`seatId is ${seatId}`);
            log(`userId is ${userId}`);
            socket = table.seats[seatId];
            if (!socket) {  // user is not online
                this._logger.info(`Removing seat ${seatId}`);
                // Remove the user from the table!
                // TODO
                return res.send('user has been evicted!');
            }

            if (socket.username === userId) {
                // Remove the user from the table!
                // TODO
                // Fork the table
                log(`${userId} is evicted from table ${tableId}`);
                this.forkTable({table, socket});
                table.onSeatsChanged();
            } else {
                var err = `${userId} is not at ${seatId} at table ${tableId}`;
                error(err);
                return res.status(400).send(err);
            }
        }
    },
    {
        Service: 'inviteToTable',
        Parameters: 'socketId,invitee,ownerId,tableName,seatId',
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            // Require:
            //  inviter
            //  invitee
            //  tableId
            //  seatId
            var inviter = req.session.username,
                invitee = req.body.invitee,
                tableName = req.body.tableName,
                tableId = utils.uuid(req.body.ownerId, tableName),
                seatId = req.body.seatId,
                inviteId = [inviter, invitee, tableId, seatId].join('-'),
                inviteeSockets = this.socketsFor(invitee);

            log(`${inviter} is inviting ${invitee} to ${seatId} at ${tableId}`);

            // Record the invitation
            invites[inviteId] = {
                table: tableId,
                seat: seatId,
                invitee
            };

            // If the user is online, send the invitation via ws to the browser
            inviteeSockets
                .filter(socket => socket.uuid !== req.body.socketId)
                .forEach(socket => {
                    // Send the invite to the sockets
                    var msg = {
                        type: 'table-invitation',
                        id: inviteId,
                        tableName: tableName,
                        table: tableId,
                        inviter,
                        seat: seatId
                    };
                    socket.send(msg);
            });
            res.send('ok');
        }
    },
    {
        Service: 'invitationResponse',
        Parameters: 'inviteId,response,socketId',
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            // Require:
            //  inviter
            //  invitee
            //  tableId
            //  seatId
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
        Service: 'deleteSeat',
        Parameters: 'seatId,ownerId,tableName',
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            var username = req.session.username,
                seatId = req.body.seatId,
                ownerId = req.body.ownerId,
                tableName = req.body.tableName,
                tableId = Utils.uuid(ownerId, tableName),
                table = this.tables[tableId];

            //  Get the table
            if (!table) {
                this._logger.error(`Could not find table ${tableId} for ${username}`);
                return res.status(404).send('ERROR: Could not find table');
            }
            
            //  Verify that the username is either the ownerId
            //      or the owner of the seat
            this._logger.trace(`ownerId is ${table.owner.username} and username is ${username}`);
            if (table.owner.username !== username && !!table.seats[seatId] &&
                table.seats[seatId].username !== username) {

                this._logger.error(`${username} does not have permission to edit ${seatId} at ${tableId}`);
                return res.status(403).send(`ERROR: You do not have permission to delete ${seatId}`);
            }

            //  Get the socket and join a different table (if not the owner)
            //  TODO: Check that it isn't the owner
            //  TODO: Check that the owner doesn't remove the last seat
            // If the seat has an owner...
            if (table.seats[seatId]) {
                this.forkTable({table, seatId});
            }

            //  Remove the given seat
            table.removeSeat(seatId);
            res.send('ok');
        }
    },
    {
        Service: 'moveToSeat',
        Parameters: 'dstId,seatId,ownerId,tableName',
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            var username = req.session.username,
                seatId = req.body.seatId,
                dstId = req.body.dstId,
                ownerId = req.body.ownerId,
                tableName = req.body.tableName,
                tableId = Utils.uuid(ownerId, tableName),
                table = this.tables[tableId];

            //  Cache the current state in the active table
            table.cache(seatId, err => {
                if (err) {
                    return res.status(500).send('ERROR: ' + err);
                }

                // Update the table state
                table.move({src: seatId, dst: dstId})

                // Reply w/ the new seat code
                var project = table.cachedProjects[dstId] || null;
                if (project) {
                    project = Utils.serializeProject(project);
                }
                res.send(project);
            });
        }
    },
    {  // Create a new seat and copy this project's blocks to it
        Service: 'cloneSeat',
        Parameters: 'seatId,socketId',
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            // Check that the requestor is the owner
            var socket = this.sockets[req.body.socketId],
                seatId = req.body.seatId,
                table = socket._table,
                newSeat;

            if (!socket.isOwner()) {
                this._logger.error(`${socket.username} tried to clone seat... DENIED`);
                return res.status(403).send('ERROR: Only owners can clone seats');
            }

            // Create the new seat
            var count = 2;
            while (table.seats.hasOwnProperty(newSeat = `${seatId} (${count++})`));
            table.createSeat(newSeat);

            // Get the project json
            if (table.seats[seatId]) {  // Request via ws
                table.cache(seatId, err => {
                    if (!err) {
                        table.cachedProjects[newSeat] = table.cachedProjects[seatId];
                    }
                    res.send(encodeURIComponent(newSeat));
                });
            } else {  // use the current cached value
                table.cachedProjects[newSeat] = table.cachedProjects[seatId];
                res.send(encodeURIComponent(newSeat));
            }
        }
    }
].map(function(api) {
    // Set the URL to be the service name
    api.URL = api.Service;
    return api;
});
