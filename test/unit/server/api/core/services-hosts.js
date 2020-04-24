describe.only('services-hosts', function() {
    const assert = require('assert').strict;
    const utils = require('../../../../assets/utils');
    const ServicesHostsAPI = utils.reqSrc('./api/core/services-hosts');
    const Errors = utils.reqSrc('./api/core/errors');
    const Users = utils.reqSrc('./storage/users');
    const Groups = utils.reqSrc('./storage/groups');

    const username = 'brian';
    const servicesHosts = [
        [{url: 'http://ai.netsblox.org', categories: ['AI/ML']}]
    ];

    beforeEach(() => utils.reset());

    describe('setUserServicesHosts', function() {
        it('should set servicesHosts', async function() {
            await ServicesHostsAPI.setUserServicesHosts(username, servicesHosts);
            const user = await Users.get(username);
            assert.deepEqual(user.servicesHosts, servicesHosts);
        });

        it('should throw error if user not found', async function() {
            await utils.shouldThrow(
                () => ServicesHostsAPI.setUserServicesHosts('notReal', servicesHosts),
                Errors.UserNotFound
            );
        });
    });

    describe('deleteUserServicesHosts', function() {
        beforeEach(() =>
            ServicesHostsAPI.setUserServicesHosts(username, servicesHosts)
        );

        it('should empty servicesHosts', async function() {
            await ServicesHostsAPI.deleteUserServicesHosts(username);
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
            await ServicesHostsAPI.setGroupServicesHosts(groupId, servicesHosts);
            const group = await Groups.get(groupId);
            assert.deepEqual(group.servicesHosts, servicesHosts);
        });

        it('should throw error if non-existent group', async () => {
            const fakeId = '1234567890ab';
            await utils.shouldThrow(
                () => ServicesHostsAPI.setGroupServicesHosts(fakeId, servicesHosts),
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
            await ServicesHostsAPI.deleteGroupServicesHosts(groupId);
            const group = await Groups.get(groupId);
            assert.deepEqual(group.servicesHosts, []);
        });
    });

    describe('getAllHosts', function() {
        const moreHosts = [
            {url: 'http://iot.netsblox.org', categories: ['IoT']},
            {url: 'http://iot2.netsblox.org', categories: ['IoT2']},
        ];

        beforeEach(async () => {
            await ServicesHostsAPI.setUserServicesHosts(username, servicesHosts);
            const group = await Groups.findOne('Brian\'s Group', username);
            await ServicesHostsAPI.setGroupServicesHosts(group._id, moreHosts);
        });

        it('should merge user hosts and group hosts', async function() {
            const hosts = await ServicesHostsAPI.getAllHosts(username);
            assert.equal(hosts.length, moreHosts.length + servicesHosts.length);
        });

        it('should throw error if user not found', async function() {
            await utils.shouldThrow(
                () => ServicesHostsAPI.getAllHosts('notReal'),
                Errors.UserNotFound
            );
        });
    });
});
