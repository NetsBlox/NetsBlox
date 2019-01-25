/* eslint-disable no-console*/
require('epipebomb')();  // Allow piping to 'head'

var Command = require('commander').Command,
    Logger = require('../src/server/logger'),
    Projects = require('../src/server/storage/projects'),
    logger = new Logger('netsblox:cli:export-user-projects'),
    fs = require('fs'),
    program = new Command(),
    runWithStorage = require('./utils').runWithStorage;

program
    .arguments('<owner> <includeUnsaved>')
    .parse(process.argv);

if (program.args.length !== 2) {
    console.log('usage: netsblox export-user-projects <owner> <bool:includeUnsaved>');
    process.exit(1);
}

var [owner, includeUnsaved] = program.args;
includeUnsaved = (includeUnsaved === 'true');

async function exportUserProjects(owner, includeUnsaved) {
    logger.trace(`About to get user projects project: ${owner}`);
    let projects;
    if (includeUnsaved) {
        projects = await Projects.getAllUserProjects(owner);
    } else {
        projects = await Projects.getUserProjects(owner);
    }

    for (let project of projects) {
        logger.trace('About to export project', project.name);
        const xml = await project.toXML();
        const filename = `${owner}-${project.name}.xml`;
        fs.writeFileSync(filename, xml);
        console.log(`exported project to ${filename}`);
    }
}


runWithStorage(exportUserProjects, [owner, includeUnsaved]);
// /* eslint-enable no-console*/
