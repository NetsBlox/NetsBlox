describe('rpc-manager', function() {
    var RPCManager = require('../../../../src/server/rpc/rpc-manager'),
        MockResponse = require('../../../assets/mock-response'),
        assert = require('assert'),
        _ = require('lodash'),
        Q = require('q');

    describe('sendRPCResult', function() {
        var response;

        beforeEach(function() {
            response = new MockResponse();
        });

        it('should convert JS object to list of pairs', function() {
            var data = {
                name: 'brian',
                test: true
            };
            RPCManager.sendRPCResult(response, data);
            assert(Array.isArray(response.response));
            assert.deepEqual(data, _.fromPairs(response.response));
        });

        it('should not auto-send if returned "null"', function() {
            RPCManager.sendRPCResult(response, null);
            assert(!response.headersSent);
        });

        it('should send promise result (if not sent)', function(done) {
            var result = Q(4);
            RPCManager.sendRPCResult(response, result)
                .then(() => {
                    assert(response.headersSent);
                    assert.equal(response.response, 4);
                    done();
                });
        });

        it('should not send result if promise sends', function(done) {
            var result = Q().then(() => response.send('hello'))
                .then(() => 4);

            RPCManager.sendRPCResult(response, result)
                .then(() => {
                    assert(response.headersSent);
                    assert.equal(response.response, 'hello');
                    done();
                });
        });

        const delayP = function(dur) {
            const deferred = Q.defer();
            setTimeout(() => deferred.resolve(), dur);
            return deferred.promise;
        };

        it('should set status code if promise fails', function(done) {
            const result = delayP(10).then(() => {
                throw Error('test exception');
            });

            RPCManager.sendRPCResult(response, result);
            response.status = function(code) {
                assert.equal(code, 500);
                done();
            };
        });
    });

    describe('parseArgValue', function() {
        const arg = {
            type: {
                name: 'BoundedNumber',
                params: ['10', '20']
            }
        };

        it('should be able to parse parameterized types', function() {
            return RPCManager.parseArgValue(arg, '12')
                .then(result => assert.equal(typeof result.value, 'number'));
        });

        it('should pass params to type parser', function() {
            RPCManager.parseArgValue(arg, '22')
                .then(result => assert(!result.isValid));
        });
    });
});
