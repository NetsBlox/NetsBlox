#!/usr/bin/env node

require('epipebomb')();  // Allow piping to 'head'

var Command = require('commander').Command,
    program = new Command(),
    version = require('../package.json').version;

program
    .version('v'+version);

program
    .command('list', 'list the existing groups')
    .parse(process.argv);
