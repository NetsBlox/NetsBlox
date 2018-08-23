const supertest = require('supertest'),
    axios = require('axios'),
    AuthHandler = require('../../utils/auth'),
    assert = require('assert'),
    groupActions = require('./groupActions'),
    // expect
    utils = require('../../assets/utils');

let server, api, port = 8440;
let options = {
    port,
    vantage: false
};

const SERVER_ADDRESS = `http://localhost:${port}`;
const authenticator = new AuthHandler(SERVER_ADDRESS);
let loginCookie;
const gpActions = groupActions(SERVER_ADDRESS, axios);

async function fetchGroups() {
    const endpoint = SERVER_ADDRESS + '/api/groups';
    let { data: groups } = await axios.get(endpoint, {
        withCredentials: true,
    });
    return groups;
}

describe.only('groups routes', () => {
    before(function(done) {
        utils.reset().then(() => {
            const Server = require('../../../src/server/server');
            server = new Server(options);
            server.start(async () => {
                let res = await authenticator.login('hamid', 'monkey123');
                loginCookie = res.getResponseHeader('Set-Cookie')[0];
                axios.defaults.headers.common['Cookie'] = loginCookie;
                done();
            });
        });
    });

    it('should do stuff', async () => {
        let gps = await gpActions.fetchGroups();
        assert.deepEqual(gps.length, 0);
        let gp = await gpActions.createGroup('testgp');
        gps = await gpActions.fetchGroups();
        assert.deepEqual(gps.length, 1);

    });

    after(function(done) {
        server.stop(done);
    });
});
