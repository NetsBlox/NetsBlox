'use strict';

var _ = require('lodash'),
    Utils = _.extend(require('../Utils'), require('../ServerUtils.js')),

    debug = require('debug'),
    log = debug('NetsBlox:API:Tables:log'),
    warn = debug('NetsBlox:API:Tables:warn'),
    error = debug('NetsBlox:API:Tables:error'),
    info = debug('NetsBlox:API:Tables:info');

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
                if (socket.username !== username) {
                    resp[socket.username] = uuids[i];
                }
            }
            log(Utils.serialize(resp));
            return res.send(Utils.serialize(resp));
            //this.storage.users.get(username, function(e, user) {
                //if (e) {
                    //return res.serverError(e);
                //}
                //if (user) {
                    //// If it is the ghost user, provide a list of all project/tables
                    //// TODO

                    //// Get the projects
                    //user.projects = user.projects || [];
                    //info('Projects for '+username +' are '+JSON.stringify(
                        //R.map(R.partialRight(Utils.getAttribute, 'ProjectName'),
                            //projects)
                        //)
                    //);
                    //return res.send(Utils.serializeArray(projects));
                //}
                //return res.status(404);
            //});
        }
    },
    {
        Service: 'evictUser',
        Parameters: 'userId,seatId,tableId',
        Method: 'post',
        Note: '',
        Handler: function(req, res) {
            var seatId = req.body.seatId,
                tableId = req.body.tableId,
                userId = req.body.userId,
                socket,
                table = this.tables[tableId];

            // Get the socket at the given table seat
            socket = table.seats[seatId];
            if (socket.username === userId) {
                // TODO: provide the option for userId to fork the table
                // user at least needs SOME table FIXME FIXME
                log(`${userId} is evicted from table ${tableId}`);
                socket.leave();
            } else {
                var err = `${userId} is not at ${seatId} at table ${tableId}`;
                error(err);
                return res.status(400).send(err);
            }
        }
    },
    {
        Service: 'inviteToTable',
        Parameters: 'invitee,tableId,seatId',
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
                tableId = req.body.tableId,
                seatId = req.body.seatId,
                inviteId = [inviter, invitee, tableId, seatId].join('-'),
                inviteeSockets = this.socketsFor(invitee);

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
                // Should the invitation have an id?
                var msg = [
                    'table-invitation',
                    inviteId,
                    tableId,
                    seatId
                ].join(' ');
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
            console.log('req.body:', req.body);
            var username = req.session.username,
                inviteId = req.body.inviteId,
                response = req.body.response === 'true',
                socketId = req.body.socketId,
                socket = this.sockets[socketId],
                invite = invites[inviteId],  // FIXME: Use the database
                table;


            console.log('response:', response);
            // Ignore if the invite no longer exists
            if (!invite) {
                return res.status(404).send('ERROR: invite no longer exists');
            }

            log(`${username} ${!!response ? 'accepted' : 'denied'} ` +
                `invitation for ${invite.seat} at ${invite.table}`);

            // Remove the invite from the database
            // TODO
            delete invites[inviteId];

            if (response) {
                // Add the seatId to the table (if doesn't exist)
                table = this.tables[invite.table];
                if (!table) {
                    // TODO: Create table
                }

                if (table.seats[invite.seat]) {
                    return res.status(400).send('ERROR: seat is occupied');
                }

                // Add the user to the table
                socket.join(table, invite.seat);

                // Persist this in the database
                // TODO
            }
            res.status(200).send('ok');
        }
    }
].map(function(api) {
    // Set the URL to be the service name
    api.URL = api.Service;
    return api;
});
