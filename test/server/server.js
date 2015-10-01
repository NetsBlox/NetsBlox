/*globals describe,it,before,beforeEach,after*/
'use strict';

var supertest = require('supertest'),
    assert = require('assert'),
    port = 8493,
    options = {
        port: port,
        vantage: false
    },
    api = supertest('http://localhost:'+port+'/api'),  // https?
    Server = require('../../src/server/Server'),

    _ = require('lodash'),
    basicRoutes = require('../../src/server/routes/BasicRoutes'),
    userRoutes = require('../../src/server/routes/Users'),
    DefaultGameTypes = require('../../src/server/GameTypes'),

    not = function(checkCode) {
        return function(v) {
            assert(checkCode !== +v.statusCode);
        };
    };

// TODO: Add API message
describe('Server Storage Tests', function() {
    var username = 'test',
        email = 'test@test.com',
        server;

    before(function(done) {
        server = new Server(options);
        server.start(done);
    });

    after(function(done) {
        server.stop(done);
    });

    describe('SignUp tests', function() {
        // FIXME: Unauthorized stream readable error
    });

    describe('Reset Password tests', function() {
    });

    describe('login tests', function() {

        it.skip('should return API details', function(done) {
            var key = process.env.SECRET_KEY || 'change this',
                hasher = require('crypto').createHmac('sha512', key);

            hasher.update('password');
            api.post('/')
                .set('__u', username)
                .set('__h', hasher.digest('hex'))
                .expect(function(res) {
                    console.log('res.text', res.text);
                    assert(res.text.indexOf('Service') === 0);
                })
                .end(done);
        });
    });

    // Check that all routes exist
    var verifyExists = function(route) {
        var endpoint = '/'+route.URL,
            method = route.Method.toLowerCase();

        it('should have endpoint '+endpoint, function(done) {
            console.log('method:', method);
            console.log('endpoint:', endpoint);
            api[method](endpoint)
                .end(function(err, result) {
                    assert(result.status !== 404);
                    done();
                });
        });
    };

    describe('Existence tests', function() {
        var routes = userRoutes.concat(basicRoutes);
        routes.forEach(verifyExists);
    });

    describe('Game Types', function() {
        describe('/', function() {
            it('should return the default game types', function(done) {
                api.get('/GameTypes')
                    .end(function(err, result) {
                        assert(result.status !== 404);
                        assert(_.matches(result.body, DefaultGameTypes));
                        done();
                    });
            });
        });
    });

    describe('SignUp tests', function() {

        it('should require both username and password', function(done) {
            api.get('/SignUp?Username='+username)
                .end(function(result) {
                    assert.equal(result.status, 400);
                    done();
                });
        });

        it.skip('should create user account /SignUp', function(done) {
        });
    });

    describe('Static function tests', function() {
        it.skip('should return valid serialized API', function() {
        });
    });

});
