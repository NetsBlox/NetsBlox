/* eslint-disable no-console*/
require('epipebomb')();  // Allow piping to 'head'

var Command = require('commander').Command,
    storage = require('../src/server/storage/storage'),
    Logger = require('../src/server/logger'),
    Projects = require('../src/server/storage/projects'),
    logger = new Logger('netsblox:cli:persist'),
    program = new Command();

program
    .arguments('<user> <project>')
    .parse(process.argv);

if (!program.args.length === 2) {
    console.log('usage: netsblox persist <user> <project>');
    process.exit(1);
}

storage.connect()
    .then(() => {
        logger.trace('About to print projects for ' + program.args[0]);

        return Projects.get(program.args[0], program.args[1]);
    })
    .then(project => {
        if (!project) {
            console.error(`project not found`);
            return storage.disconnect();
        }
        logger.trace('About to persist project');
        return project.persist();
    })
    .then(() => storage.disconnect())
    .catch(err => {
        console.error(err);
        return storage.disconnect();
    });
/* eslint-enable no-console*/
