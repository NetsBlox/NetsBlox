#!/usr/bin/env node

require('epipebomb')();  // Allow piping to 'head'

const Users = require('../src/server/storage/users'),
    { runWithStorage } = require('./utils'),
    Command = require('commander').Command,
    program = new Command();

program.arguments('<name> <email>');
program.option('<name> <email>');
program.parse(process.argv);

function isValidEmail(email) {
    let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

if (program.args.length !== 2) {
    console.log('usage: netsblox set-email <name> <email>');
    process.exit(1);
}
const [username, email] = program.args;

if (!isValidEmail(email)) {
    console.log('invalid email format', email);
    process.exit(1);
}

async function setEmail() {
    const user = await Users.get(username);
    if (!user) throw `user not found`;
    console.log(`setting ${username}'s email to ${email}..`);
    user.email = email;
    await user.update();
}

runWithStorage(setEmail);
