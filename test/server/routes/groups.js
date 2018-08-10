const supertest = require('supertest'),
    utils = require('../../assets/utils');

let server, api, port = 8440;
let options = {
    port,
    vantage: false
};

describe.skip('groups routes', () => {
    before(function(done) {
        utils.reset().then(() => {
            const Server = require('../../../src/server/server');
            server = new Server(options);
            server.start(done);
            api = supertest('http://localhost:'+port+'/api');
        });
    });

    after(function(done) {
        server.stop(done);
    });
});
