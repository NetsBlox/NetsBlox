// Vantage support for the server object
'use strict';

var vantage = require('vantage')(),
    chalk = require('chalk'),
    repl = require('vantage-repl'),
    R = require('ramda'),
    banner,
    CONNECTED_STATE = [
        'CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'
    ],
    CONSTANTS = require('../../common/Constants'),
    NO_USER_LABEL = '<vacant>';

// Set the banner
banner = ['\n'+
    '#####################################################',
    '#                                                   #',
    '#                 NetsBlox Server                   #',
    '#                                                   #',
    '#####################################################']
    .join('\n');

var NetsBloxVantage = function(server) {
    this.initGroupManagement(server);

    vantage
        .command('ghost', 'Get info about ghost user')
        .action( (args, cb) => {
            console.log(`username: ${CONSTANTS.GHOST.USER}\n` +
                `password: ${CONSTANTS.GHOST.PASSWORD}\n` +
                `email: ${CONSTANTS.GHOST.EMAIL}`);
            return cb();
        });

    // set DEBUG level FIXME
    vantage
        .command('debug <level>', 'Set the debug level')
        .action(function(args, cb) {
            var level = args.level;
            if (level === 'on') {
                level = 'NetsBlox:*';
            } else if (level === 'off') {
                level = '';
            }

            process.env.DEBUG = level;
            return cb();
        });

    // Expose variables for easy debugging
    global.server = server;
    global.com = server.groupManager;
};

NetsBloxVantage.prototype.initGroupManagement = function(server) {
    vantage
        .command('tables', 'List all tables')
        .alias('t')
        //.option('--with-names', 'Include the group names')
        .action(function(args, cb) {
            // Get all groups
            var header = '* * * * * * * Tables * * * * * * * \n',
                tables = R.values(server.tables.tables),
                text = tables.map(function(table) {
                    var clients = Object.keys(table.seats)
                        .map(seat => {
                            let client = table.seats[seat],
                                username = NO_USER_LABEL;
                            if (client) {
                                username = client.isVirtualUser() ? '<virtual user>' : client.username;
                            }

                            return `\t${seat}: ${username}`;
                        });

                    return `${table.uuid}:\n${clients.join('\n')}\n`;
                }).join('\n');
            console.log(header+text);
            return cb();
        });

    // Check socket status
    vantage
        .command('check <uuid>', 'Check the connectivity of the given socket')
        .alias('c')
        .option('-d, --domain', 'Get the domain of the given socket')
        .option('-s, --state', 'Get the state of the given socket')
        .option('-a, --all-keys', 'Dump all keys of the given socket')
        .option('-k, --key', 'Get the key value of the given socket')
        .action(function(args, cb) {
            // Get all groups
            var result = '',
                checkSocket = NetsBloxVantage.checkSocket.bind(null, args);

            if (args.uuid === 'all') {
                result = server.groupManager.sockets.map(function(socket) {
                    var uuid = server.groupManager.socket2Uuid[socket.id];
                    return uuid + ':  ' + checkSocket(socket);
                }).join('\n');
            } else {
                var socket = server.groupManager.uuid2Socket[args.uuid];
                result = checkSocket(socket);
            }
            console.log(result);
            return cb();
        });

    vantage
        .command('update sockets', 'Update the sockets')
        .alias('us')
        .action(function(args, cb) {
            var comm = server.groupManager;
            comm.sockets.forEach(comm.updateSocket, comm);
            console.log('Updated sockets');
            return cb();
        });
};

NetsBloxVantage.checkSocket = function(args, socket) {
    var result = null;

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
        .banner(banner)
        .delimiter(chalk.white('netsblox~$'))
        .listen(port || 1234)
        .use(repl)
        .show();
};

module.exports = NetsBloxVantage;
