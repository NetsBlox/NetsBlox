const utils = require('../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    const hash = require('../../../../src/common/sha512').hex_sha512;
    const assert = require('assert');
    const supertest = require('supertest');
    let port = 8393,
        options = {
            port: port,
            vantage: false
        },
        api,
        Server,
        server;

    before(async function() {
        await utils.reset();
        Server = utils.reqSrc('server');
        server = new Server(options);
        api = supertest('http://localhost:'+port+'/api');
        return await server.start();
    });

    after(function(done) {
        server.stop(done);
    });

    describe('login/logout', function() {

        it('should support login', function(done) {
            const user = 'brian';
            const password = hash('secretPassword');

            api.post(`/`)
                .send({__u: user, __h: password, remember: true})
                .expect(res => res.text.startsWith('Service'))
                .end(err => done(err));
        });

        it('should support logout', function(done) {
            const user = 'brian';
            const password = hash('secretPassword');

            api.post(`/`)
                .send({__u: user, __h: password, remember: true})
                .expect(res => res.text.startsWith('Service'))
                .end(err => {
                    if (err) return done(err);
                    // Logout
                    api.post(`/logout`)
                        .expect(res => {  // check that the cookie is reset
                            const setCookieCmd = res.header['set-cookie']
                                .find(cmd => cmd.includes('netsblox-cookie=;'));

                            assert(setCookieCmd);
                        })
                        .end(err => done(err));
                });
        });

    });

});
