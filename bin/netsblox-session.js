var Command = require('commander').Command,
    UserActions = require('../src/server/storage/UserActions'),
    Storage = require('../src/server/storage/Storage'),
    Logger = require('../src/server/logger'),
    Query = require('../src/common/data-query'),
    logger = new Logger('NetsBlox:CLI'),
    storage = new Storage(logger),
    program = new Command();

program
    .arguments('[sessionIds...]')
    .option('-l, --long', 'List additional metadata about the sessions')
    .option('--clear', 'Clear the user data records')
    .parse(process.argv);

storage.connect()
    .then(() => Query.printSessions(program.args))
    .then(() => storage.disconnect())
    .catch(err => console.err(err));
