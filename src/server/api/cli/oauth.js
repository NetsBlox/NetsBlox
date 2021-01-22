const {Command} = require('commander');
const program = new Command();
const { initAndRun } = require('./utils');
const OAuth = require('../core/oauth');

program
    .command('ls')
    .description('List available OAuth clients')
    .action(() => initAndRun(async function() {
        const clients = await OAuth.getClients();
        /* eslint-disable no-console */
        console.log('ID\tName\tSecret');
        clients.forEach(client => console.log([client._id, client.name, client.secret].join('\t')));
        /* eslint-enable no-console */
    }));

program
    .command('add-client <name>')
    .description('Add new OAuth client application.')
    .action(name => initAndRun(async function() {
        const id = await OAuth.createClient(null, name);
        /* eslint-disable-next-line */
        console.log(id);
    }));

program
    .command('rm-client <id>')
    .description('Remove existing OAuth client application.')
    .action(id => initAndRun(async function() {
        await OAuth.removeClient(null, id);
    }));

module.exports = program;
