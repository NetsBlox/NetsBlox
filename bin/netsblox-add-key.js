#!/usr/bin/env node

require('epipebomb')();  // Allow piping to 'head'

const {Command} = require('commander');
const program = new Command();
const Storage = require('../src/server/storage/storage');
const Groups = require('../src/server/storage/groups');
const ApiKeys = require('../src/server/services/api-keys');
const { runWithStorage } = require('./utils');

program
    .arguments('<username> <key> <value>')
    .option('-g, --groups <groups>', 'groups using the given key')
    .option('-a, --all-groups', 'set default key for the given user\'s groups');

program.parse(process.argv);
if (program.args.length !== 3) {
    /* eslint-disable no-console */
    console.log('usage: netsblox add-key <username> <key> <value>');
    /* eslint-enable no-console */
    process.exit(1);
}

const [username, key, value] = program.args;

async function addKey() {
    const groupNames = program.groups ? program.groups.split(',') : [];
    const allGroups = await Groups.findAllUserGroups(username);
    const groups = groupNames
        .map(name => allGroups.find(g => g.name === name));
    const groupIds = groups.map(group => group.getId());
    const isGroupDefault = !!program.allGroups;

    ApiKeys.init(Storage._db);
    await ApiKeys.create(username, key, value, isGroupDefault, groupIds);
}

runWithStorage(addKey);
