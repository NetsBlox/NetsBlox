/* eslint-disable no-console*/
require('epipebomb')();  // Allow piping to 'head'

var Command = require('commander').Command,
    Storage = require('../src/server/storage/storage'),
    Logger = require('../src/server/logger'),
    Query = require('../src/common/data-query'),
    logger = new Logger('netsblox:cli:sessions'),
    storage = new Storage(logger),
    program = new Command();

// TODO: print the users in either regular or long format
program
    .option('-l, --long', 'List additional metadata about the users')
    .parse(process.argv);

Query.init(logger);
storage.connect()
    .then(() => {
        logger.trace('About to request users');
        return Query.listUsers(program);
    })
    .catch(err => console.err(err))
    .then(() => storage.disconnect());
/* eslint-enable no-console*/
