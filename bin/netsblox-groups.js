#!/usr/bin/env node

require('epipebomb')();  // Allow piping to 'head'

var Command = require('commander').Command,
    program = new Command(),
    version = require('../package.json').version;

program
    .version('v'+version);

program
    .command('list', 'list the existing groups')
    .command('add-member <group> <username>', 'add member to the given group')
    .command('rm-member <group> <username>', 'add member to the given group')
    .command('new <group>', 'create new group')
    .command('rm <group>', 'remove the given group')
    .parse(process.argv);
