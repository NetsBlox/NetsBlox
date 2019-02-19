/* eslint-disable no-console*/
require('epipebomb')();  // Allow piping to 'head'

var Command = require('commander').Command,
    Logger = require('../src/server/logger'),
    Projects = require('../src/server/storage/projects'),
    logger = new Logger('netsblox:cli:export'),
    fs = require('fs'),
    program = new Command(),
    runWithStorage = require('./utils').runWithStorage;

program
    .arguments('<owner> <project>')
    .parse(process.argv);

if (program.args.length !== 2) {
    console.log('usage: netsblox export-project <owner> <project>');
    process.exit(1);
}

var [owner, name] = program.args;

async function exportProject(owner, projectName) {
    logger.trace(`About to get project: ${owner} ${projectName}`);
    const project = await Projects.get(owner, projectName);
    if (!project) {
        console.error(`project not found`);
        return;
    }
    logger.trace('About to export project');
    console.log('loaded project');
    const xml = await project.toXML();
    const filename = `${owner}-${projectName}.xml`;
    fs.writeFileSync(filename, xml);
    console.log(`exported project to ${filename}`);
}


runWithStorage(exportProject, [owner, name]);
// /* eslint-enable no-console*/
