(function(ProjectActions) {
    const Q = require('q');
    let logger, collection, actionIdCollection;

    ProjectActions.getCollection = function() {
        return collection;
    };

    ProjectActions.init = function(_logger, db) {
        logger = _logger.fork('project-actions');
        collection = db.collection('project-actions');
        actionIdCollection = db.collection('latest-action-ids');

        collection.createIndex({'action.id': 1});
        collection.createIndex({
            projectId: 1,
            roleId: 1,
            notSaved: 1,
            'action.id': 1,
        });
        const oneDay = 3600 * 24;
        collection.createIndex({ time: 1 }, { expireAfterSeconds: oneDay });
    };

    ProjectActions.store = function(action) {
        action.time = new Date();
        // TODO: Should this store it in the blob? It's not ok to just lose large actions...
        if (action.args) { // check if the arguments take too much space
            let argsSize = JSON.stringify(action.args).length * 2 / 1e+6;
            if (argsSize > 14) throw new Error('Action too big to save in mongo.');
        }
        return Q(collection.save(action))
            .catch(err => {
                action = JSON.stringify(action);
                logger.error(`Could not save action ${action}: ${err}`);
            });
    };

    ProjectActions.getActionsAfter = async function(projectId, roleId, actionId) {
        logger.trace(`getting actions after ${actionId} in ${projectId} at role: ${roleId}`);
        let cursor = collection.find({
            projectId: projectId,
            roleId: roleId,
            notSaved: {$ne: true},
            'action.id': {$gt: actionId}
        });

        const actions = await cursor.sort({'action.id': 1}).toArray();
        if (!actions.length) {
            throw new Error(`No project actions found (requested actions after ${actionId}).`);
        }

        const earliestId = actions[0].action.id;
        if (earliestId > actionId + 1) {
            throw new Error(`Could not retrieve actions before ${earliestId} (requested actions after ${actionId}).`);
        }
        return actions;
    };

    ProjectActions.clearActionsAfter = function(projectId, roleId, actionId, endTime) {
        let ctx = `after ${actionId} in ${projectId} at role: ${roleId}`;
        let query = {
            projectId: projectId,
            roleId: roleId,
            time: {$lte: endTime},
            'action.id': {$gt: actionId}
        };

        logger.trace(`clearing actions ${ctx}`);
        return Q(collection.updateMany(query, {$set: {notSaved: true}}))
            .then(res => {
                let count = res.result.n;
                logger.trace(`cleared ${count} action(s) ${ctx}`);
                return count;
            });
    };

    ProjectActions.getLatestActionId = function(projectId, roleId) {
        const query = {projectId, roleId};
        return Q(actionIdCollection.findOne(query))
            .then(doc => doc ? doc.actionId : 0);
    };

    ProjectActions.setLatestActionId = function(projectId, roleId, actionId) {
        const query = {projectId, roleId};
        return Q(actionIdCollection.updateOne(query, {$set: {actionId}}, {upsert: true}));
    };

    ProjectActions.getProjectActionIdInfo = function(projectId) {
        return Q(actionIdCollection.find({projectId}).toArray());
    };

})(exports);
