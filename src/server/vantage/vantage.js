/* eslint-disable no-console*/
// Vantage support for the server object
'use strict';

var vantage = require('vantage')(),
    chalk = require('chalk'),
    repl = require('vantage-repl'),
    Query = require('../../common/data-query'),
    CONNECTED_STATE = [
        'CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'
    ],
    RoomManager = require('../rooms/room-manager'),
    NO_USER_LABEL = '<vacant>';

var NetsBloxVantage = function(server) {
    this.initRoomManagement(server);

    // get user info
    vantage
        .command('user [username]', 'Get info about a specific user')
        .option('-r, --rooms', 'Get the user\'s saved rooms')
        .option('-j, --json', 'Print as json')
        .option('-a, --admin', 'Toggle admin status')
        .option('-u, --update', 'Update the user\'s schema')
        .option('--delete', 'Delete the user')
        .option('--force', 'Force the given command')
        .option('-p, --password <password>', 'Set the user password')
        .alias('u')
        .action((args, cb) => {
            var username = args.username;

            if (!username) {  // print all usernames
                console.log('All known users:');
                server.storage.users.names()
                    .then(names => console.log(names.sort()
                        // Should not have multiple counts for a user!
                        .reduce((counts, name) => {
                            var pair = counts[0];
                            if (pair && pair[0] === name) {
                                pair[1]++;
                            } else {
                                counts.unshift([name, 1]);
                            }
                            return counts;
                        }, [])
                        .map(pair => pair[0] + (pair[1] > 1 ? ` (${pair[1]})` : ''))
                        .join('\n')))
                    .then(cb);
            } else {
                server.storage.users.get(username).then(user => {
                    if (!user) {
                        console.log('user does not exist!');
                        return cb();
                    }
                    if (args.options.rooms) {
                        if (args.options.json) {
                            console.log(JSON.stringify(user.pretty().rooms, null, 2));
                        } else {
                            console.log(user.pretty().rooms);
                        }
                    } else if (args.options.admin) {
                        user.admin = !user.admin;
                        user.save();
                        console.log(`User "${user.username}" ${user.admin ? 'now has' :
                            'no longer has'} admin priviledges!`);
                    } else if (args.options.password) {
                        delete user.hash;
                        user.password = args.options.password;
                        user.save()
                            .then(() => console.log('saved ' + user.username))
                            .catch(err => console.error(err));
                        console.log(`Set password to "${args.options.password}"`);
                    } else if (args.options.delete) {
                        if (args.options.force) {
                            user.destroy();
                            console.log(`${user.username} has been deleted!`);
                        } else {
                            console.log(`Are you sure you want to delete ${user.username}? If so, add the --force flag`);
                        }
                    } else if (args.options.json) {
                        console.log(JSON.stringify(user.pretty()));
                    } else {
                        console.log(user.pretty());
                    }
                    cb();
                })
                    .catch(err => cb(err));
            }
        });

    // set DEBUG level FIXME
    vantage
        .command('debug <level>', 'Set the debug level')
        .action(function(args, cb) {
            var level = args.level;
            if (level === 'on') {
                level = 'netsblox:*';
            } else if (level === 'off') {
                level = '';
            }

            process.env.DEBUG = level;
            return cb();
        });

    // Expose variables for easy debugging
    global.server = server;

    // User Action Data
    vantage
        .command('sessions', 'Query the recorded user sessions')
        .option('-l, --long', 'List additional metadata about the sessions')
        .action((args, cb) => {
            Query.listSessions(args.options)
                .then(() => cb());
        });
};

NetsBloxVantage.prototype.initRoomManagement = function(server) {
    vantage
        .command('rooms', 'List all active rooms')
        .option('-e, --entries', 'List the entries from the manager')
        .option('-l, --long', 'Display long format')
        .alias('rs')
        //.option('--with-names', 'Include the group names')
        .action(function(args, cb) {
            // Get all groups
            var header = '* * * * * * * Rooms * * * * * * * \n';
            const rooms = RoomManager.getActiveRooms();
            let text = rooms.map(function(room) {
                var clients = room.getRoleNames()
                    .map(role => {
                        let clients = room.getSocketsAt(role),
                            names = clients.length ?
                                clients.map(c => c.username) : [NO_USER_LABEL];

                        return `\t${role}: ${names.join(',')}`;
                    });

                const collabs = room.getCollaborators().join(' ');
                return [
                    `${room.uuid}:`,
                    `projectId: ${room.getProjectId()}`,
                    `collabs: ${collabs}`,
                    `roles:\n${clients.join('\n')}\n`
                ].join('\n   ');
            }).join('\n');

            if (args.options.entries) {
                text = rooms.map(room => room.uuid).join('\n');
            }
            console.log(header+text);
            return cb();
        });

    vantage
        .command('ruuids', 'Get all room uuids')
        .action((a, cb) => {
            let uuids = RoomManager.getActiveRoomIds();
            console.log(uuids);
            cb();
        });

    vantage
        .command('room <uuid>', 'Look up room info from global database')
        .alias('r')
        .action((args, cb) => {
            server.storage.rooms.get(args.uuid, (err, room) => {
                if (err || !room) {
                    return cb(err || 'Room not found');
                }
                var prettyRoom = room.pretty();
                console.log(prettyRoom);
                cb();
            });
        });

};


NetsBloxVantage.checkSocket = function(args, nbSocket) {
    var socket = nbSocket._socket,
        result = null;

    if (!socket) {
        result = 'socket not found';
    } else {
        if (args.options.domain) {
            result = socket.domain;
        } else if (args.options.allkeys) {
            result = Object.keys(socket);
        } else if (args.options.key) {
            result = socket[args.options.key];
        } else {  // default to state
            var state = socket.readyState;
            result = CONNECTED_STATE[state];
        }
    }
    return result;
};

NetsBloxVantage.prettyPrintGroup = function(group) {
    var text = group.name+':\n'+
        group.groups
            .map(function(group) {
                return '  '+group.join(' ');
            })
            .join('\n');
    return text;
};

NetsBloxVantage.prototype.start = function(port) {
    vantage
        .delimiter(chalk.white('netsblox~$'))
        .listen(port || 1234)
        .use(repl)
        .show();
};

module.exports = NetsBloxVantage;
/* eslint-enable no-console*/
