#!/usr/bin/env node

require('epipebomb')();  // Allow piping to 'head'

const {Command} = require('commander');
const program = new Command();
const Groups = require('../src/server/storage/groups'),
    { runWithStorage } = require('./utils');

program.arguments('<owner> <name>');
program.parse(process.argv);

if (program.args.length !== 2) {
    console.error('usage: netsblox add-group <owner> <name>');
    process.exit(1);
}

const [owner, name] = program.args;

async function addGroup() {
    const existingGroup = await Groups.findOne(name, owner);
    if (existingGroup) throw new Error(`Group ${name} already exists.`);

    await Groups.new(name, owner);
    console.log('Group has been created!');
}

runWithStorage(addGroup);
