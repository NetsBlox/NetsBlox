describe('rpc-manager', function() {
    var RPCManager = require('../../../src/server/rpc/rpc-manager'),
        MockResponse = require('../../assets/mock-response'),
        assert = require('assert'),
        Q = require('q');

    describe('sendRPCResult', function() {
        var response;

        beforeEach(function() {
            response = new MockResponse();
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
    });
});
