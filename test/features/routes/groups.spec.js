const axios = require('axios'),
    AuthHandler = require('../../utils/auth'),
    assert = require('assert'),
    utils = require('../../assets/utils');

let server, port = 8440;
let options = {
    port,
    vantage: false
};

const SERVER_ADDRESS = `http://localhost:${port}`;
const authenticator = new AuthHandler(SERVER_ADDRESS);
let loginCookie;

describe.skip('groups routes', () => {
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
        assert(true);
    });

    after(function(done) {
        server.stop(done);
    });
});
