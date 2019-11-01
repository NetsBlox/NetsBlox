/* eslint-disable no-console*/
require('epipebomb')();  // Allow piping to 'head'

var Command = require('commander').Command,
    storage = require('../src/server/storage/storage'),
    Logger = require('../src/server/logger'),
    Query = require('../src/common/data-query'),
    logger = new Logger('netsblox:cli:sessions'),
    program = new Command();

program
    .option('-l, --long', 'List additional metadata about the users')
    .option('-h, --human', 'Print in human-readable format')
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
