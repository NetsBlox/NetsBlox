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
        return project.getRoles()
            .then(roles => {
                // parse the service usage
                let sourceCodes = roles.map(role => role.SourceCode);
                let services = [];
                sourceCodes.forEach(srcCode => {
                    services = services.concat(extractRpcs(srcCode));
                });

                // collect the rest of the metadata
                var activeRole = roles.find(role => role.ProjectName === project.activeRole),
                    metadata = {
                        owner: project.owner,
                        projectName: project.name,
                        primaryRoleName: project.activeRole,
                        roleNames: Object.keys(project.roles),
                        thumbnail: null,
                        notes: null,
                        services: _.uniq(services)
                    };

                if (activeRole) {
                    metadata.thumbnail = activeRole.Thumbnail instanceof Array ?
                        activeRole.Thumbnail[0] : activeRole.Thumbnail;
                    metadata.notes = activeRole.notes instanceof Array ?
                        activeRole.notes[0] : activeRole.notes;
                }

                logger.trace(`Publishing project ${project.name} from ${project.owner}`);

                return collection.update({
                    owner: project.owner,
                    projectName: project.name
                }, metadata, {upsert: true});
            });
    };

    PublicProjectStore.update = PublicProjectStore.publish;

    PublicProjectStore.unpublish = function(project) {
        logger.trace(`Unpublishing project ${project.name} from ${project.owner}`);
        return collection.deleteOne({owner: project.owner, projectName: project.name});
    };

})(exports);
