(function(UserActionData) {
    var Q = require('q'),
        logger,
        collection;

    UserActionData.init = function(_logger, db) {
        logger = _logger.fork('user-actions');
        collection = db.collection('netsblox:storage:user-actions');
    };

    UserActionData.record = function(action) {
        if (!action.sessionId) {
            logger.error('No sessionId found for action:', action);
            return;
        }

        logger.trace(`about to store action from session: ${action.sessionId}`);
        return collection.save(action)
            .then(() => logger.trace(`successfully recorded action from session ${action.sessionId}`));
    };

    // query-ing
    UserActionData.sessions = function() {
        // Get a list of all sessionIds
        var cursor = collection.find({}).stream(),
            sessionIdDict = {},
            deferred = Q.defer();

        cursor.on('data', event => {
            var id = event.sessionId;

            if (!sessionIdDict[id]) {
                sessionIdDict[id] = {
                    id: id,
                    actionCount: 0,
                    minTime: Infinity,
                    maxTime: -Infinity
                };
            }
            sessionIdDict[id].username = sessionIdDict[id].username ||
                event.username;

            sessionIdDict[id].projectId = event.projectId;
            sessionIdDict[id].actionCount++;
            sessionIdDict[id].minTime = Math.min(sessionIdDict[id].minTime,
                event.action.time);
            sessionIdDict[id].maxTime = Math.max(sessionIdDict[id].maxTime,
                event.action.time);

        });

        cursor.once('end', () => {
            var sessions = Object.keys(sessionIdDict).sort()
                .map(id => sessionIdDict[id]);

            deferred.resolve(sessions);
        });

        return deferred.promise;
    };

    UserActionData.sessionIds = function() {
        return UserActionData.sessions()
            .then(sessions => {
                return sessions.map(session => session.id);
            });
    };

    UserActionData.session = function(sessionId) {
        return collection.find({sessionId: sessionId}).toArray()
            .sort((a, b) => a.action.time < b.action.time ? -1 : 1);
    };

    UserActionData.clear = function() {
        return collection.deleteMany({});
    };

})(exports);
