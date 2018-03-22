#!/usr/bin/env node

require('epipebomb')();  // Allow piping to 'head'

const Storage = require('../src/server/storage/storage'),
    Logger = require('../src/server/logger'),
    Groups = require('../src/server/storage/groups'),
    logger = new Logger('netsblox:cli:projects'),
    storage = new Storage(logger);

// List all the groups
storage.connect()
    .then(() => {
        logger.trace('About to print all groups');
        return Groups.all();
    })
    .then(groups => {
        groups.forEach(group => {
            console.log([
                group.name,
                group.members.join(','),
            ].join('\t'));
        });
    })
    .then(() => storage.disconnect())
    .catch(err => {
        logger.error(err);
        return storage.disconnect();
    });
