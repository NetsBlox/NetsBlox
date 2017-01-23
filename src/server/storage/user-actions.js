(function(UserActionData) {
    var GenStorage = require('./generic-storage'),
        storage;

    UserActionData.init = function(logger, db) {
        storage = new GenStorage(logger, db, 'user-actions');
    };

    UserActionData.record = function(action) {
        if (!action.sessionId) {
            storage.logger.error('No sessionId found for action:', action);
            return;
        }

        storage.logger.trace(`about to store action from session: ${action.sessionId}`);
        return storage.get(action.sessionId)
            .then(actions => {
                if (!actions) {
                    actions = [];
                }
                actions.push(action);
                return storage.save(action.sessionId, actions);
            })
            .then(() => storage.logger.trace(`successfully added action to session ${action.sessionId}`));
    };

    // query-ing
    UserActionData.sessions = function() {
        return storage.all()
            .then(sessions => sessions.map(session => {
                return {
                    id: session._id,
                    actions: session.value
                };
            }));
    };

    UserActionData.sessionIds = function() {
        // Get a list of all sessionIds
        return storage.all()
            .then(sessions => sessions.map(session => session._id));
    };

    UserActionData.session = function(sessionId) {
        // TODO: Use a stream
        return storage.get(sessionId);
    };

    UserActionData.clear = function() {
        return storage.clearAll();
    };

})(exports);
