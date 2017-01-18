var Command = require('commander').Command,
    UserActions = require('../src/server/storage/UserActions'),
    Storage = require('../src/server/storage/Storage'),
    Logger = require('../src/server/logger'),
    logger = new Logger('NetsBlox:CLI'),
    storage = new Storage(logger),
    program = new Command();

program
    .option('-l, --long', 'List additional metadata about the sessions')
    .option('--clear', 'Clear the user data records')
    .parse(process.argv);

storage.connect()
    .then(() => {
        logger.trace('About to request sessions');
        return UserActions.sessions();
    })
    .then(sessions => {
        var ids = sessions.map(session => session.id),
            index = ids.map((id, index) => `${id} (${index+1})`).join('\n');

        if (program.long) {
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

        if (program.clear) {
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
    })
    .catch(err => console.err(err))
    .then(() => storage.disconnect());
