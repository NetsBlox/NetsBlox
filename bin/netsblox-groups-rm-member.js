#!/usr/bin/env node

require('epipebomb')();  // Allow piping to 'head'

const Storage = require('../src/server/storage/storage'),
    Logger = require('../src/server/logger'),
    Groups = require('../src/server/storage/groups'),
    Users = require('../src/server/storage/users'),
    logger = new Logger('netsblox:cli:projects'),
    storage = new Storage(logger),
    Command = require('commander').Command,
    program = new Command();

program.arguments('<group>');
program.parse(process.argv);

if (program.args.length !== 2) {
    console.log('usage: netsblox groups rm-member <group> <username>');
    process.exit(1);
}

// List all the groups
const username = program.args[1];
const groupId = program.args[0];
let user = null;
storage.connect()
    .then(() => Users.get(username))
    .then(_user => {
        user = _user;
        if (!user) {
            throw 'User not found';
        }
        return Groups.get(groupId);
    })
    .then(group => {
        if (!group) throw 'Group not found';
        return group.removeMember(user);
    })
    .then(() => storage.disconnect())
    .catch(err => {
        logger.error(err);
        return storage.disconnect();
    });
