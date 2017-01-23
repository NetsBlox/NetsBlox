/* eslint-disable no-console*/
// Utilities for querying data (like from cli or in vantage)
var Q = require('q'),
    exists = require('exists-file'),
    fs = require('fs'),
    Logger = require('../server/logger'),
    logger = new Logger('netsblox:storage:query'),
    UserActions = require('../server/storage/user-actions');

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

var getSessionHeader = options => {
    if (options.long) {
        return [
            'sessionId\t',
            'time',
            'actions',
            'username',
            'projectId'
        ].join('\t');
    }
};

var getSessionConversionFn = options => {
    return session => {
        if (options.long) {
            var length = session.actions.length,
                last = session.actions[length-1],
                duration,
                username = last.username,
                projectId = last.projectId;

            var first = session.actions[0];

            duration = last.action.time - first.action.time;

            // duration, action counts, project name, username
            return [
                session.id,
                duration,
                length,
                username,
                projectId
            ].join('\t');
        }

        return session.id;
    };
};

var isInt = /^\d+$/;
var printSessions = (ids, options) => {
    var lookupIds = [],
        getSessionIds;

    options = options || {};
    // Remove any parens'ed ids...
    ids = ids.filter(id => id[0] !== '(');

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
            return UserActions.sessions(ids)
                .transform(session => catSession(session, options));
        });
};

var catSession = (session, options) => {
    logger.trace('received session info for ', session.id);
    // merge the sessions
    var actions,
        output;

    actions = session.actions.map(event => event.action);

    if (options.json) {
        output = JSON.stringify(actions, null, 2);
    } else {
        output = actions.map(action => {
            return [
                action.type,
                action.args.join(' ')
            ].join(' ');
        }).join('\n');
    }

    // print it!
    if (options.export) {
        fs.writeFileSync(options.export, output);
        console.log('exported session to', options.export);
    } else {
        console.log(output);
    }
};

module.exports = {
    listSessions: listSessions,
    sessionPrintFn: getSessionConversionFn,
    getSessionHeader: getSessionHeader,
    printSessions: printSessions
};
/* eslint-enable no-console*/
