/* eslint-disable no-console*/
var Command = require('commander').Command,
    Storage = require('../src/server/storage/Storage'),
    Logger = require('../src/server/logger'),
    Query = require('../src/common/data-query'),
    logger = new Logger('NetsBlox:CLI'),
    storage = new Storage(logger),
    program = new Command();

program
    .arguments('[sessionIds...]')
    .option('--json', 'Print actions in json')
    .parse(process.argv);

storage.connect()
    .then(() => Query.printSessions(program.args, program))
    .then(() => storage.disconnect())
    .catch(err => console.err(err));
/* eslint-enable no-console*/
