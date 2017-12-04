(function(ProjectActions) {
    const Q = require('q');
    let logger, collection;

    ProjectActions.init = function(_logger, db) {
        logger = _logger.fork('project-actions');
        collection = db.collection('project-actions');
    };

    ProjectActions.store = function(action) {
        return Q(collection.save(action));
    };

    ProjectActions.getActionsAfter = function(projectId, actionId) {
        logger.trace(`getting actions after ${actionId} in ${projectId}`);
        let cursor = collection.find({projectId: projectId, 'action.id': {$gt: actionId}});
        return Q(cursor.sort({'action.id': 1}).toArray());
    };

})(exports);
