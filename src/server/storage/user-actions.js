(function(UserActionData) {
    var Q = require('q'),
        logger,
        collection;

    UserActionData.init = function(_logger, db) {
        logger = _logger.fork('user-actions');
        collection = db.collection('netsblox:storage:user-actions');
        logger.trace('initialized!');
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
        logger.trace('getting sessions');
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

        cursor.on('error', err => {
            logger.error(err);
            deferred.reject(err);
        });
        cursor.once('end', () => {
            var sessions = Object.keys(sessionIdDict).sort()
                .map(id => sessionIdDict[id]);

            deferred.resolve(sessions);
        });

        return deferred.promise;
    };

    UserActionData.sessionIds = function() {
        logger.trace('getting session ids');
        return UserActionData.sessions()
            .then(sessions => sessions.map(session => session.id));
    };

    UserActionData.session = function(sessionId) {
        logger.trace(`requesting session info for ${sessionId}`);
        return collection.find({sessionId: sessionId}).toArray()
            .then(events => {
                logger.trace(`found ${events.length} actions for ${sessionId}`);
                return events
                    .map(event => event.action)
                    .sort((a, b) => a.time < b.time ? -1 : 1);
            });
    };

    UserActionData.clear = function() {
        logger.trace('clearing user action data');
        return collection.deleteMany({});
    };

})(exports);
