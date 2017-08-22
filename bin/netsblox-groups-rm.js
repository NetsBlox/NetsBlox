#!/usr/bin/env node

require('epipebomb')();  // Allow piping to 'head'

const Storage = require('../src/server/storage/storage'),
    Logger = require('../src/server/logger'),
    Groups = require('../src/server/storage/groups'),
    logger = new Logger('netsblox:cli:projects'),
    storage = new Storage(logger),
    Command = require('commander').Command,
    program = new Command();

program.arguments('<group>');
program.parse(process.argv);

if (!program.args[0]) {
    console.log('usage: netsblox groups rm <group>');
    process.exit(1);
}

// List all the groups
storage.connect()
    .then(() => Groups.remove(program.args[0]))
    .then(() => storage.disconnect())
    .catch(err => {
        logger.error(err);
        return storage.disconnect();
    });
