#!/usr/bin/env node

require('epipebomb')();  // Allow piping to 'head'

const Users = require('../src/server/storage/users');
const BannedAccounts = require('../src/server/storage/banned-accounts');
const { runWithStorage } = require('./utils'),
    Command = require('commander').Command,
    program = new Command();

program.arguments('<username>');
program.parse(process.argv);

if (program.args.length !== 1) {
    console.log('usage: netsblox ban <username>');
    process.exit(1);
}
const [username] = program.args;

runWithStorage(async function banUser() {
    const user = await Users.collection.findOne({username});
    if (!user) throw new Error(`Could not ban ${username}: user not found`);
    await BannedAccounts.ban(user);
    return user;
});

