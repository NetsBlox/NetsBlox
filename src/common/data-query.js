// Utilities for querying data (like from cli or in vantage)
var Q = require('q'),
    fs = require('fs'),
    UserActions = require('../server/storage/UserActions');

var listSessions = (sessions, options) => {
    var ids = sessions.map(session => session.id),
        index = ids.map((id, index) => `${id} (${index+1})`).join('\n');

    if (options.long) {
        var lengths = sessions.map(sessions => sessions.actions.length),
            lasts = sessions.map((session, i) => session.actions[lengths[i]-1]),
            durations = sessions.map((session, i) => {
                var first = session.actions[0],
                    last = lasts[i];

                return last.action.time - first.action.time;
            }),
            usernames = sessions.map((session, i) => lasts[i].username),
            projectIds = sessions.map((session, i) => lasts[i].projectId),
            cats = [
                'sessionId\t',
                'time',
                'actions',
                'username',
                'projectId'
            ],
            lines;

        // duration, action counts, project name, username
        lines = ids.map((id, i) => [
            id,
            durations[i],
            lengths[i],
            usernames[i],
            projectIds[i]
        ].join('\t'));
        index = cats.join('\t') + '\n' + lines.join('\n');
    }

    if (options.clear) {
        var filename = 'user-actions-backup.json',
            i = 2,
            basename;

        basename = filename.replace('.json', '');
        while (exists.sync(filename)) {
            filename = `${basename} (${i++}).json`;
        }
        console.log('Creating user data backup at', filename);
        fs.writeFileSync(filename, JSON.stringify(sessions));
        console.log('Clearing user actions from database...');
        return UserActions.clear()
            .then(() => {
                console.log('User actions have been removed from the database.');
            });
    }

    if (sessions.length) {
        console.log(index);
    } else {
        console.log('<no sessions>');
    }
};

var isInt = /^\d+$/;
var printSessions = (ids, options) => {
    var lookupIds = [],
        getSessionIds;

    options = options || {};
    lookupIds = ids
        .map((id, index) => [id, index])
        .filter(pair => isInt.test(pair[0]));

    if (lookupIds.length) {
        getSessionIds = UserActions.sessionIds()
            .then(sessionIds => {
                var sessionIndex,
                    index,
                    pair;

                for (var i = lookupIds.length; i--;) {
                    pair = lookupIds[i];
                    sessionIndex = parseInt(pair);
                    index = pair[1];
                    ids[index] = sessionIds[sessionIndex];
                }
            });
    } else {
        getSessionIds = Q();
    }

    return getSessionIds
        .then(() => {
            return Q.all(ids.map(id => UserActions.session(id)));
        })
        .then(actions => {
            // TODO: Format this better
            actions = actions.map(act => act.map(action => action.action));
            if (options.export) {
                fs.writeFileSync(options.export, JSON.stringify(actions, null, 2));
                console.log('exported session to', options.export);
            } else {
                console.log(actions);
            }
        });
};

module.exports = {
    listSessions: listSessions,
    printSessions: printSessions
};
