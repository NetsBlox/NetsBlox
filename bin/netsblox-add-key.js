#!/usr/bin/env node

require('epipebomb')();  // Allow piping to 'head'

const {Command} = require('commander');
const program = new Command();
const Storage = require('../src/server/storage/storage');
const ApiKeys = require('../src/server/services/api-keys');
const { runWithStorage } = require('./utils');

program.arguments('<username> <key> <value>');
program.parse(process.argv);
if (program.args.length !== 3) {
    /* eslint-disable no-console */
    console.log('usage: netsblox add-key <username> <key> <value>');
    /* eslint-enable no-console */
    process.exit(1);
}

const [username, key, value] = program.args;

async function addKey() {
    ApiKeys.init(Storage._db);
    await ApiKeys.create(username, key, value);
}

runWithStorage(addKey);
