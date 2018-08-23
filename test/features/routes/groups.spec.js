const supertest = require('supertest'),
    axios = require('axios'),
    AuthHandler = require('../../utils/auth'),
    assert = require('assert'),
    groupActions = require('./groupActions'),
    // expect
    utils = require('../../assets/utils');

let server, loginCookie;
const port = 8440,
    SERVER_ADDRESS = `http://localhost:${port}`,
    authenticator = new AuthHandler(SERVER_ADDRESS),
    gpActions = groupActions(SERVER_ADDRESS, axios),
    options = {
        port,
        vantage: false
    },
    user = {
        username: 'hamid',
        password: 'monkey123'
    };


describe('groups', () => {
    before(function(done) {
        utils.reset().then(() => {
            const Server = require('../../../src/server/server');
            server = new Server(options);
            server.start(async () => {
                let res = await authenticator.login(user.username, user.password);
                loginCookie = res.getResponseHeader('Set-Cookie')[0];
                axios.defaults.headers.common['Cookie'] = loginCookie;
                done();
            });
        });
    });

    describe('CRUD', () => {
        beforeEach(async () => {
            await utils.reset();
        });

        it('should create group', async () => {
            let gp = await gpActions.createGroup('testgp');
            let gps = await gpActions.fetchGroups();
            assert.deepEqual(gps.length, 1);
        });

        it('should not allow duplicate groupname on create', async () => {
            const GPNAME = 'testgp';
            let gp = await gpActions.createGroup(GPNAME);
            try {
                await gpActions.createGroup(GPNAME);
            } catch (e) {
                assert(e.response.data.includes('exists'));
                return;
            }

            throw new Error('request did not fail');
        });

        it('should have no initial groups', async () => {
            let gps = await gpActions.fetchGroups();
            assert.deepEqual(gps.length, 0);
        });

        it('should delete group', async () => {
            let gp = await gpActions.createGroup('testgp');
            let gps = await gpActions.fetchGroups();
            assert.deepEqual(gps.length, 1);
            await gpActions.deleteGroup(gp);
            gps = await gpActions.fetchGroups();
            assert.deepEqual(gps.length, 0);
        });

        it('should get group by id', async () => {
            let gp = await gpActions.createGroup('testgp');
            let sameGp = await gpActions.fetchGroup(gp._id);
            assert.deepEqual(sameGp.name, gp.name);
            assert.deepEqual(sameGp._id, gp._id);
        });

        it('should update group', async () => {
            let gp = await gpActions.createGroup('testgp');
            const newName = 'newName';
            // keep the same ID
            let updatedGp = {
                ...gp,
                name: newName
            };
            let updateRes = await gpActions.updateGroup(updatedGp);
            assert.deepEqual(updateRes.name, newName);
        });

        it('should not allow duplicate groupname on update', async () => {
            const OTHER_NAME = 'otherName';
            let gp = await gpActions.createGroup('testgp');
            let gp2 = await gpActions.createGroup(OTHER_NAME);
            // keep the same ID
            let updatedGp = {
                ...gp,
                name: OTHER_NAME,
            };

            try {
                await gpActions.updateGroup(updatedGp);
            } catch (e) {
                assert(e.response.data.includes('exists'));
                return;
            }

            throw new Error('request did not fail');
        });

        it('should delete group', async () => {
            let gp = await gpActions.createGroup('testgp');
            await gpActions.deleteGroup(gp);
            try {
                // expecting this to fail
                await gpActions.fetchGroup(gp._id);
            } catch (e) {
                assert(e.response.data.includes('not found'), e.message);
                return
            }
            throw new Error('group was not deleted');
        });

    }) // end of crud section

    describe('group members', () => {

    })

    after(function(done) {
        server.stop(done);
    });
});
