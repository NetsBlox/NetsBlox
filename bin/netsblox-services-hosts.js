require('epipebomb')();  // Allow piping to 'head'

const program = require('../src/server/api/cli/services-hosts');
program.parse(process.argv);
