/* eslint-disable no-console*/
// Utilities for querying data (like from cli or in vantage)
var Q = require('q'),
    fs = require('fs'),
    UserActions = require('../server/storage/user-actions');

var listSessions = (options) => {
    return UserActions.sessions().then(sessions => {
        var ids = sessions.map(session => session.id),
            index = ids.map((id, index) => `${id} (${index+1})`).join('\n');

        if (options.long) {
            var lengths = sessions.map(sessions => sessions.actionCount),
                durations = sessions.map(session => session.maxTime - session.minTime),
                usernames = sessions.map(session => session.username),
                projectIds = sessions.map(session => session.projectId),
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

        if (sessions.length) {
            console.log(index);
        } else {
            console.log('<no sessions>');
        }
    });
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

                console.log(sessionIds);
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
            // TODO: Convert this to stream?
            console.log('ids are', ids);
            return Q.all(ids.map(id => UserActions.session(id)));
        })
        .then(sessions => {  // formatting..
            // merge the sessions
            var actions = sessions
                .reduce((l1, l2) => l1.concat(l2), [])
                .map(event => event.action);

            if (options.json) {
                return JSON.stringify(actions, null, 2);
            } else {
                return actions.map(action => {
                    return [
                        action.type,
                        action.args.join(' ')
                    ].join(' ');
                }).join('\n');
            }
        })
        .catch(err => console.err(err))
        .then(output => {
            if (options.export) {
                fs.writeFileSync(options.export, output);
                console.log('exported session to', options.export);
            } else {
                console.log(output);
            }
        });
};

module.exports = {
    listSessions: listSessions,
    printSessions: printSessions
};
/* eslint-enable no-console*/
