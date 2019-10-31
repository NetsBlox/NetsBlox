#!/usr/bin/env node
/* eslint-disable no-console*/

require('epipebomb')();  // Allow piping to 'head'

const storage = require('../src/server/storage/storage'),
    Users = require('../src/server/storage/users'),
    Command = require('commander').Command,
    program = new Command();

program.arguments('<name> <email> <password>');
program.parse(process.argv);

if (program.args.length !== 3) {
    console.log('usage: netsblox add-user <name> <email> <password>');
    process.exit(1);
}

// List all the groups
const username = program.args[0];
const email = program.args[1];
const password = program.args[2];
storage.connect()
    .then(() => Users.get(username))
    .then(existing => {
        if (existing) throw `username "${username}" already exists`;

        const user = Users.new(username, email);
        user.password = password;
        return user.save();
    })
    .then(() => console.log('user created!'))
    .then(() => storage.disconnect())
    .catch(err => {
        console.error(err);
        return storage.disconnect();
    });
/* eslint-enable no-console*/
