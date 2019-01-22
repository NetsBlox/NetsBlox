/* eslint-disable no-console*/
require('epipebomb')();  // Allow piping to 'head'

var Command = require('commander').Command,
    Storage = require('../src/server/storage/storage'),
    Logger = require('../src/server/logger'),
    Projects = require('../src/server/storage/projects'),
    logger = new Logger('netsblox:cli:projects'),
    storage = new Storage(logger),
    program = new Command();

program
    .arguments('[username]', 'Print projects for the given user')
    .option('-a,--all', 'Include transient projects')
    .parse(process.argv);

const buffer = (word, len) => {
    let padSize = len - word.length;
    if (padSize > 0) {
        word += new Array(padSize+1).join(' ');
    }
    return word;
};
storage.connect()
    .then(() => {
        logger.trace('About to print projects for ' + program.args[0]);

        return Projects.getAllRawUserProjects(program.args[0]);
    })
    .then(projects => {
        projects = projects
            .filter(project => {
                if (!project) {
                    logger.warn(`invalid project found: ${JSON.stringify(project)}`);
                    return false;
                }
                if (!project.name) {
                    logger.warn(`invalid project name: ${JSON.stringify(project)}`);
                    return false;
                }
                return true;
            });
        const longestName = Math.max.apply(
            null,
            projects.map(project => project.name.length)
        );
        projects.forEach(project => console.log(
            [
                project.owner,
                buffer(project.name, longestName),
                project.transient ? '<transient>' : '<saved>',
                project.lastUpdatedAt
            ].join('\t')
        ));
    })
    .then(() => storage.disconnect())
    .catch(err => {
        console.error(err);
        return storage.disconnect();
    });
/* eslint-enable no-console*/
