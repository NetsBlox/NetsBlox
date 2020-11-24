(function(UserActionData) {
    var Q = require('q'),
        logger,
        blob = require('./blob'),
        collection;

    UserActionData.init = function(_logger, db) {
        logger = _logger.fork('user-actions');
        collection = db.collection('netsblox:storage:user-actions');
    };

    UserActionData.record = async function(event) {
        if (!event.sessionId) {
            logger.error('No sessionId found for event:', event);
        }

        if (!event.action) {
            logger.error('No action found for event:', event);
            return;
        }

        // If openProject, store the project in the blob
        if (event.action.type === 'openProject' && event.action.args.length) {
            var xml = event.action.args[0];
            if (xml && xml.substring(0, 10) === 'snapdata') {
                // split the media, source code
                var endOfCode = xml.lastIndexOf('</project>') + 10,
                    code = xml.substring(11, endOfCode),
                    media = xml.substring(endOfCode).replace('</snapdata>', '');

                await Promise.all([code, media].map(data => blob.store(data)))
                    .then(hashes => event.action.args[0] = hashes);
            } else if (xml) {  // store the xml in one chunk in the blob
                await Promise.all([xml].map(data => blob.store(data)))
                    .then(hashes => event.action.args[0] = hashes);
            }
        }

        await collection.insertOne(event);
        logger.trace(`recorded event from session ${event.sessionId}`);
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

    UserActionData.getCollection = function() {
        return collection;
    };

})(exports);
