(function(ProjectActions) {
    const Q = require('q');
    let logger, collection;

    ProjectActions.init = function(_logger, db) {
        logger = _logger.fork('project-actions');
        collection = db.collection('project-actions');
    };

    ProjectActions.store = function(action) {
        return Q(collection.save(action))
            .catch(err => {
                action = JSON.stringify(action);
                logger.error(`Could not save action ${action}: ${err}`);
            });
    };

    ProjectActions.getActionsAfter = function(projectId, roleId, actionId) {
        logger.trace(`getting actions after ${actionId} in ${projectId} at role: ${roleId}`);
        let cursor = collection.find({
            projectId: projectId,
            roleId: roleId,
            'action.id': {$gt: actionId}
        });
        return Q(cursor.sort({'action.id': 1}).toArray());
    };

})(exports);
