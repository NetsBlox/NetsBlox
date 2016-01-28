'use strict';

var _ = require('lodash'),
    Utils = _.extend(require('../Utils'), require('../ServerUtils.js')),

    debug = require('debug'),
    log = debug('NetsBlox:API:Tables:log'),
    warn = debug('NetsBlox:API:Tables:warn'),
    error = debug('NetsBlox:API:Tables:error'),
    info = debug('NetsBlox:API:Tables:info'),
    utils = require('../ServerUtils');

var acceptInvitation = function(username, id, response, socketId, callback) {
    var socket = this.sockets[socketId],
        invite = invites[id];  // FIXME: Use the database

    // Ignore if the invite no longer exists
    if (!invite) {
        return callback('ERROR: invite no longer exists');
    }

    log(`${username} ${!!response ? 'accepted' : 'denied'} ` +
        `invitation for ${invite.seat} at ${invite.table}`);

    // Remove the invite from the database
    // TODO
    delete invites[id];

    if (response) {
        // Add the seatId to the table (if doesn't exist)
        let table = this.tables[invite.table];
        if (!table) {
            // TODO: Create table
        }

        if (table.seats[invite.seat]) {
            return callback('ERROR: seat is occupied');
        }

        // Add the user to the table
        table.seatOwners[invite.seat] = username;

        if (socket) {
            socket.join(table, invite.seat);
        } else {
            table.onSeatsChanged();
        }

        // Persist this in the database
        // TODO

        callback(null);
    }
};

// REMOVE
var invites = {};

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
        Parameters: 'userId,seatId,leaderId,tableName',
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            var seatId = req.body.seatId,
                tableName = req.body.tableName,
                leaderId = req.body.leaderId,
                tableId = Utils.uuid(leaderId, tableName),
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
                delete table.seatOwners[seatId];
                // Fork the user's stored table
                // TODO
                return res.send('user has been evicted!');
            }

            if (socket.username === userId) {
                // Fork the table
                log(`${userId} is evicted from table ${tableId}`);
                this.forkTable({table, socket});
                table.seatOwners[socket._seatId] = null;
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
        Parameters: 'invitee,tableLeaderId,tableName,seatId',
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
                tableId = utils.uuid(req.body.tableLeaderId, tableName),
                seatId = req.body.seatId,
                inviteId = [inviter, invitee, tableId, seatId].join('-'),
                inviteeSockets = this.socketsFor(invitee);

            if (invitee === 'myself') {  // TODO: Make this more flexible
                let socketId = inviteeSockets[0] ? inviteeSockets[0].uuid : null;

                invitee = inviter;
                invites[inviteId] = {
                    table: tableId,
                    seat: seatId,
                    invitee
                };

                // no invitation msg, just accept it
                this._logger.info(`${inviter} is adding self to ${seatId}`);
                acceptInvitation.call(this,
                    inviter,
                    inviteId,
                    true,
                    socketId,
                    (err) => {
                        if (err) {
                            this._logger.error(err);
                            return res.status(500).send(err);
                        }
                        this._logger.info('success!');
                        res.status(200).send('ok');
                    }
                );
                return;
            }
            log(`${inviter} is inviting ${invitee} to ${seatId} at ${tableId}`);
            // Verify that the inviter is the table leader
            // TODO

            // Verify that the seat is available
            // TODO

            // Store the invitation in the database
            // TODO
            invites[inviteId] = {
                table: tableId,
                seat: seatId,
                invitee
            };

            // If the user is online, send the invitation via ws to the browser
            inviteeSockets.forEach(socket => {
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
                socketId = req.body.socketId;

            acceptInvitation.call(this,
                username,
                inviteId,
                response,
                socketId,
                (err) => {
                    if (err) {
                        return res.status(500).send(err);
                    }
                    res.status(200).send('ok');
                }
            );
        }
    },
    {
        Service: 'deleteSeat',
        Parameters: 'seatId,leaderId,tableName',
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            var username = req.session.username,
                seatId = req.body.seatId,
                leaderId = req.body.leaderId,
                tableName = req.body.tableName,
                tableId = Utils.uuid(leaderId, tableName),
                table = this.tables[tableId];

            //  Get the table
            if (!table) {
                this._logger.error(`Could not find table ${tableId} for ${username}`);
                return res.status(404).send('ERROR: Could not find table');
            }
            
            //  Verify that the username is either the leaderId
            //      or the owner of the seat
            if (table.leaderId !== username && table.seatOwners[seatId] !== username) {
                this._logger.error(`${username} does not have permission to edit ${seatId} at ${tableId}`);
                return res.status(403).send(`ERROR: You do not have permission to delete ${seatId}`);
            }

            //  Get the socket and join a different table (if not the leader)
            //  TODO: Check that it isn't the leader
            //  TODO: Check that the leader doesn't remove the last seat
            this.forkTable({table, seatId});

            //  Remove the given seat
            table.removeSeat(seatId);
            res.send('ok');
        }
    },
    {
        Service: 'moveToSeat',
        Parameters: 'dstId,seatId,leaderId,tableName',
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            var username = req.session.username,
                seatId = req.body.seatId,
                dstId = req.body.dstId,
                leaderId = req.body.leaderId,
                tableName = req.body.tableName,
                tableId = Utils.uuid(leaderId, tableName),
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
    }
].map(function(api) {
    // Set the URL to be the service name
    api.URL = api.Service;
    return api;
});
