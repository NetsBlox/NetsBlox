let extractRpcs = require('../server-utils').extractRpcs;

(function(PublicProjectStore) {
    var _ = require('lodash'),
        logger, collection;

    PublicProjectStore.init = function(_logger, db) {
        logger = _logger.fork('public-projects');
        collection = db.collection('public-projects');
    };

    PublicProjectStore.get = function(username, projectName) {
        return collection.findOne({owner: username, projectName: projectName});
    };

    PublicProjectStore.list = function(start, end) {
        start = start || 0;
        end = end || start + 25;
        var opts = {
            limit: end-start,
            skip: start
        };
        logger.trace(`Requesting public projects from ${start} to ${end}`);
        return collection.find({}, opts).toArray()
            .then(projects => projects.map(project => _.omit(project, '_id')));
    };

    PublicProjectStore.publish = function(project) {
        // grab all the sourcecodes for diff roles and extracts rpcs for each
        let sourceCodes = Object.keys(project.roles).map(rId => project.roles[rId].SourceCode);
        let services = [];
        sourceCodes.forEach(srcCode => {
            services = services.concat(extractRpcs(srcCode));
        });
        var activeRole = project.roles[project.activeRole],
            metadata = {
                owner: project.owner,
                projectName: project.name,
                primaryRoleName: project.activeRole,
                roleNames: Object.keys(project.roles),
                thumbnail: activeRole && activeRole.Thumbnail[0],
                notes: activeRole && activeRole.Notes[0],
                services: _.uniq(services)
            };

        logger.trace(`Publishing project ${project.name} from ${project.owner}`);

        return collection.update({
            owner: project.owner,
            projectName: project.name
        }, metadata, {upsert: true});
    };

    PublicProjectStore.update = PublicProjectStore.publish;

    PublicProjectStore.unpublish = function(project) {
        logger.trace(`Unpublishing project ${project.name} from ${project.owner}`);
        return collection.deleteOne({owner: project.owner, projectName: project.name});
    };

})(exports);
