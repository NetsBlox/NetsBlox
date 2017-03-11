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
    //.option('--clear', 'Clear the user data records')
    .parse(process.argv);

storage.connect()
    .then(() => {
        logger.trace('About to request sessions');
        var header = Query.getSessionHeader(program),
            transform = Query.sessionPrintFn(program);

        if (header) {
            console.log(header);
        }
        return UserActions.sessions()
            .transform(session => {
                console.log(transform(session));
            });
    })
    .catch(err => console.err(err))
    .then(() => storage.disconnect());
/* eslint-enable no-console*/
