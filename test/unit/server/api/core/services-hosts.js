const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    const assert = require('assert').strict;
    const ServicesHostsAPI = utils.reqSrc('./api/core/services-hosts');
    const Errors = utils.reqSrc('./api/core/errors');
    const Users = utils.reqSrc('./storage/users');
    const Groups = utils.reqSrc('./storage/groups');

    const username = 'brian';
    const servicesHosts = [
        [{url: 'http://ai.netsblox.org', categories: ['AI/ML']}]
    ];

    beforeEach(() => utils.reset());

    describe('auth', function() {
        it('should not allow users to view another\'s hosts', async function() {
            await utils.shouldThrow(
                () => ServicesHostsAPI.getServicesHosts(username, 'hamid'),
                Errors.Unauthorized
            );
        });

        it('should not allow users to edit another\'s hosts', async function() {
            await utils.shouldThrow(
                () => ServicesHostsAPI.setUserServicesHosts(username, 'hamid', servicesHosts),
                Errors.Unauthorized
            );
        });

        it('should not allow users to edit other group hosts', async function() {
            const group = await Groups.findOne('Brian\'s Group', username);
            const groupId = group._id;
            await utils.shouldThrow(
                () => ServicesHostsAPI.deleteGroupServicesHosts('hamid', groupId),
                Errors.Unauthorized
            );
        });
    });

    describe('setUserServicesHosts', function() {
        it('should set servicesHosts', async function() {
            await ServicesHostsAPI.setUserServicesHosts(username, username, servicesHosts);
            const user = await Users.get(username);
            assert.deepEqual(user.servicesHosts, servicesHosts);
        });

        it('should throw error if user not found', async function() {
            await utils.shouldThrow(
                () => ServicesHostsAPI.setUserServicesHosts('notReal', 'notReal', servicesHosts),
                Errors.UserNotFound
            );
        });
    });

    describe('deleteUserServicesHosts', function() {
        beforeEach(() =>
            ServicesHostsAPI.setUserServicesHosts(username, username, servicesHosts)
        );

        it('should empty servicesHosts', async function() {
            await ServicesHostsAPI.deleteUserServicesHosts(username, username);
            const user = await Users.get(username);
            assert.deepEqual(user.servicesHosts, []);
        });
    });

    describe('setGroupServicesHosts', function() {
        let groupId = null;

        beforeEach(async () => {
            const group = await Groups.findOne('Brian\'s Group', username);
            groupId = group._id;
        });

        it('should set servicesHosts', async () => {
            await ServicesHostsAPI.setGroupServicesHosts(username, groupId, servicesHosts);
            const group = await Groups.get(groupId);
            assert.deepEqual(group.servicesHosts, servicesHosts);
        });

        it('should throw error if non-existent group', async () => {
            const fakeId = '1234567890ab';
            await utils.shouldThrow(
                () => ServicesHostsAPI.setGroupServicesHosts(username, fakeId, servicesHosts),
                Errors.GroupNotFound
            );
        });
    });

    describe('deleteGroupServicesHosts', function() {
        let groupId = null;

        beforeEach(async () => {
            const group = await Groups.findOne('Brian\'s Group', username);
            groupId = group._id;
        });

        it('should set servicesHosts to []', async () => {
            console.log('groupId', groupId);
            await ServicesHostsAPI.deleteGroupServicesHosts(username, groupId);
            const group = await Groups.get(groupId);
            assert.deepEqual(group.servicesHosts, []);
        });
    });

    describe('getServicesHosts', function() {
        const moreHosts = [
            {url: 'http://iot.netsblox.org', categories: ['IoT']},
            {url: 'http://iot2.netsblox.org', categories: ['IoT2']},
        ];

        beforeEach(async () => {
            await ServicesHostsAPI.setUserServicesHosts(username, username, servicesHosts);
            const group = await Groups.findOne('Brian\'s Group', username);
            await ServicesHostsAPI.setGroupServicesHosts(username, group._id, moreHosts);
        });

        it('should merge user hosts and group hosts', async function() {
            const hosts = await ServicesHostsAPI.getServicesHosts(username, username);
            assert.equal(hosts.length, moreHosts.length + servicesHosts.length);
        });

        it('should throw error if user not found', async function() {
            await utils.shouldThrow(
                () => ServicesHostsAPI.getServicesHosts('notReal', 'notReal'),
                Errors.UserNotFound
            );
        });
    });
});
