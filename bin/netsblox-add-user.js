#!/usr/bin/env node
/* eslint-disable no-console*/

require('epipebomb')();  // Allow piping to 'head'

const { runWithStorage } = require('./utils');
const Users = require('../src/server/storage/users'),
    Command = require('commander').Command,
    program = new Command();

program.arguments('<name> <email> <password>')
    .option('-g, --group <groupId>', 'group ID for the new user');

program.parse(process.argv);

console.log(program.args);
if (program.args.length !== 3) {
    console.log('usage: netsblox add-user <name> <email> <password>');
    process.exit(1);
}

// List all the groups
const [username, email, password] = program.args;

async function addUser() {
    const existing = await Users.get(username);
    if (existing) throw `username "${username}" already exists`;

    const user = Users.new(username, email, program.group);
    user.password = password;
    await user.save();
    await console.log('user created!');
}

/* eslint-enable no-console*/
runWithStorage(addUser);
