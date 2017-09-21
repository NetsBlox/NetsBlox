/* eslint-disable no-console*/
var Storage = require('../src/server/storage/storage'),
    Logger = require('../src/server/logger'),
    extractRpcs = require('../src/server/server-utils.js').extractRpcs,
    Q = require('q'),
    blob = require('../src/server/storage/blob-storage.js'),
    Projects = require('../src/server/storage/projects'),
    logger = new Logger('netsblox:cli:projects'),
    storage = new Storage(logger);

// in: project obj
// out: promise of used services
const checkForServices = project => {
    
    // project.betterRoles = Object.keys(project.roles).map(roleName => {
    //     let role = project.roles[roleName];
    //     role.Thumbnail = null; // remove thumbnails TEMP
    //     role.name = roleName;
    //     return role;
    // })
    // console.log(Object.keys(project));

    return project.getRoles().then(roles => {
        // find services
        let services = roles.map(role => {
            return extractRpcs(role.SourceCode);
        });
        services = services.reduce((agr, cur) => agr.concat(cur));

        let triple = {
            projectName: project.name,
            owner: project.owner,
            services,
        };
        
        // return services and metadata
        return triple;
    });
};


storage.connect()
    .then(() => {
        logger.trace('going through all projects');
        return Projects.map({}, checkForServices);
    })
    .then(mapResults => {
        return Q.allSettled(mapResults).then(promiseResults => {
            let triples = promiseResults.filter(promise => promise.state === 'fulfilled').map(promise => promise.value);
            console.log('successfull calls', `${triples.length} / ${promiseResults.length}`);
            // log to console
            triples.forEach(triple => {
                console.log(JSON.stringify(triple));
            });
            return triples;
        });
    })
    .then(() => storage.disconnect())
    .catch(err => {
        console.error(err);
        return storage.disconnect();
    });
/* eslint-enable no-console*/
