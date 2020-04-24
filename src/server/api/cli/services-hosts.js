const {Command} = require('commander');
const program = new Command();
const { initAndRun } = require('./utils');
const ServicesHosts = require('../core/services-hosts');

program
    .command('ls <id>')
    .description('List custom services for the given user/group.')
    .option('-g, --group', 'Lookup group rather than user')
    .option('-a, --all', 'Show all services hosts for the given user.')
    .action((id, opts) => initAndRun(async function() {
        const hosts = await getHosts(id, opts);
        /* eslint-disable-next-line no-console */
        hosts.forEach(host => console.log(host));
    }));

program
    .command('add <id> <url>')
    .description('Add services host for the given user/group.')
    .option('-g, --group', 'Lookup group rather than user.')
    .option('-c, --categories <categories>', 'Comma-separated list of categories for the service.', '')
    .action((id, url, opts) => initAndRun(async function() {
        const categories = opts.categories.split(',').filter(cat => cat);
        const hosts = await getHosts(id, opts);
        hosts.push({url, categories});
        if (opts.group) {
            await ServicesHosts.setGroupServicesHosts(null, id, hosts);
        } else {
            await ServicesHosts.setUserServicesHosts(null, id, hosts);
        }
    }));

program
    .command('rm <id> <url>')
    .description('Remove services host for the given user/group.')
    .option('-g, --group', 'Lookup group rather than user.')
    .action((id, url, opts) => initAndRun(async function() {
        const hosts = await getHosts(id, opts);
        const index = hosts.findIndex(host => host.url == url);
        if (index > -1) {
            hosts.splice(index, 1);
            if (opts.group) {
                await ServicesHosts.setGroupServicesHosts(null, id, hosts);
            } else {
                await ServicesHosts.setUserServicesHosts(null, id, hosts);
            }
        }
    }));

program
    .command('clear <id>')
    .description('Unregister all services hosts for the given user/group.')
    .option('-g, --group', 'Lookup group rather than user.')
    .action((id, opts) => initAndRun(async function() {
        if (opts.group) {
            await ServicesHosts.deleteGroupServicesHosts(null, id);
        } else {
            await ServicesHosts.deleteUserServicesHosts(null, id);
        }
    }));

async function getHosts(id, opts) {
    if (opts.group) {
        return await ServicesHosts.getGroupHosts(null, id);
    } else if (opts.all) {
        return await ServicesHosts.getServicesHosts(null, id);
    } else {
        return await ServicesHosts.getUserHosts(null, id);
    }
}

module.exports = program;
