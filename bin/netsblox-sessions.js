/* eslint-disable no-console*/
require('epipebomb')();  // Allow piping to 'head'

var Command = require('commander').Command,
    UserActions = require('../src/server/storage/user-actions'),
    Storage = require('../src/server/storage/storage'),
    Logger = require('../src/server/logger'),
    Query = require('../src/common/data-query'),
    logger = new Logger('netsblox:cli'),
    storage = new Storage(logger),
    program = new Command();

program
    .option('-l, --long', 'List additional metadata about the sessions')
    .option('--clear', 'Clear the user data records')
    .parse(process.argv);

storage.connect()
    .then(() => {
        logger.trace('About to request sessions');
        return UserActions.sessions();
    })
    .then(sessions => Query.listSessions(sessions, program))
    .catch(err => console.err(err))
    .then(() => storage.disconnect());
/* eslint-enable no-console*/
