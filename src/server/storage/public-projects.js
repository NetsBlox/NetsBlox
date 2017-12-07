
(function(PublicProjectStore) {
    const Q = require('q');
    const utils = require('../server-utils');
    var _ = require('lodash'),
        logger, collection;

    PublicProjectStore.init = function(_logger, db) {
        logger = _logger.fork('public-projects');
        collection = db.collection('public-projects');
    };

    PublicProjectStore.get = function(username, projectName) {
        return Q(collection.findOne({owner: username, projectName: projectName}));
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
        let roles = null;
        return project.getRoles()
            .then(roles => {
                // parse the service usage
                roles = utils.sortByDateField(roles, 'Updated', -1);
                let activeRole = roles[0];
                let sourceCodes = roles.map(role => role.SourceCode);
                let services = [];
                sourceCodes.forEach(srcCode => {
                    services = services.concat(utils.extractRpcs(srcCode));
                });

                // collect the rest of the metadata
                let metadata = {
                    owner: project.owner,
                    projectName: project.name,
                    primaryRoleName: activeRole.ProjectName,
                    roleNames: Object.keys(project.roles),
                    thumbnail: null,
                    notes: null,
                    services: _.uniq(services)
                };

                metadata.thumbnail = activeRole.Thumbnail instanceof Array ?
                    activeRole.Thumbnail[0] : activeRole.Thumbnail;
                metadata.notes = activeRole.notes instanceof Array ?
                    activeRole.notes[0] : activeRole.notes;

                logger.trace(`Publishing project ${project.name} from ${project.owner}`);

                return collection.update({
                    owner: project.owner,
                    projectName: project.name
                }, metadata, {upsert: true});
            });
    };

    PublicProjectStore.update = PublicProjectStore.publish;

    PublicProjectStore.rename = function(owner, name, newName) {
        const query = {$set: {projectName: newName}};
        return collection.update({
            owner: owner,
            projectName: name
        }, query);
    };

    PublicProjectStore.unpublish = function(project) {
        logger.trace(`Unpublishing project ${project.name} from ${project.owner}`);
        return collection.deleteOne({owner: project.owner, projectName: project.name});
    };

})(exports);
