require('epipebomb')();  // Allow piping to 'head'

const program = require('../src/server/api/cli/oauth');
program.parse(process.argv);
