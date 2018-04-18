/* eslint-disable no-console*/
require('epipebomb')();  // Allow piping to 'head'

var Command = require('commander').Command,
    Storage = require('../src/server/storage/storage'),
    Logger = require('../src/server/logger'),
    Projects = require('../src/server/storage/projects'),
    ActiveRoom = require('../src/server/rooms/active-room'),
    logger = new Logger('netsblox:cli:export'),
    fs = require('fs'),
    storage = new Storage(logger),
    program = new Command();

program
    .arguments('<owner> <project>')
    .parse(process.argv);

if (program.args.length !== 2) {
    console.log('usage: netsblox export-project <owner> <project>');
    process.exit(1);
}

var [owner, name] = program.args;
storage.connect()
    .then(() => {
        logger.trace(`About to get project: ${owner} ${name}`);

        return Projects.get(owner, name);
    })
    .then(project => {
        if (!project) {
            console.error(`project not found`);
            return storage.disconnect();
        }
        logger.trace('About to export project');
        return ActiveRoom.fromStore(logger, project);
    })
    .then(room => room.serialize())
    .then(xml => {
        var filename = `${owner}-${name}.xml`;
        fs.writeFileSync(filename, xml);
        console.log(`exported project to ${filename}`);
    })
    .then(() => storage.disconnect())
    .catch(err => {
        console.error(err);
        return storage.disconnect();
    });
/* eslint-enable no-console*/
