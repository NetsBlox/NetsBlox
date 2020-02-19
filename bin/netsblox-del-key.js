#!/usr/bin/env node

require('epipebomb')();  // Allow piping to 'head'

const {Command} = require('commander');
const program = new Command();
const Storage = require('../src/server/storage/storage');
const ApiKeys = require('../src/server/services/api-keys');
const { runWithStorage } = require('./utils');

program.arguments('<username> <key>');
program.parse(process.argv);
if (program.args.length !== 2) {
    /* eslint-disable no-console */
    console.log('usage: netsblox del-key <username> <key>');
    /* eslint-enable no-console */
    process.exit(1);
}

const [username, key] = program.args;

async function addKey() {
    ApiKeys.init(Storage._db);
    await ApiKeys.delete(username, key);
}

runWithStorage(addKey);
