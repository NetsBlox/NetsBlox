/* eslint-disable no-console*/
require('epipebomb')();  // Allow piping to 'head'

var Command = require('commander').Command,
    storage = require('../src/server/storage/storage'),
    Logger = require('../src/server/logger'),
    Query = require('../src/common/data-query'),
    logger = new Logger('netsblox:cli:session'),
    program = new Command();

program
    .arguments('[sessionIds...]')
    .option('--json', 'Print actions in json')
    .parse(process.argv);

Query.init(logger);
storage.connect()
    .then(() => {
        logger.trace('About to print sessions');
        return Query.printSessions(program.args, program);
    })
    .then(() => storage.disconnect())
    .catch(err => console.err(err));
/* eslint-enable no-console*/
