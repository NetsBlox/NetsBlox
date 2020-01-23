describe.only('services-worker', function() {
    const utils = require('../../../assets/utils');
    const Logger = utils.reqSrc('./logger');
    const ServicesWorker = utils.reqSrc('./services/services-worker');
    const Services = new ServicesWorker(new Logger('netsblox:test:services'));
    const MockResponse = require('../../../assets/mock-response');
    const assert = require('assert');
    const _ = require('lodash');
    const Q = require('q');

    before(() =>{
        Services.loadRPCsFromFS()
            .forEach(service => Services.registerRPC(service));
    });

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
            Services.sendRPCResult(response, data);
            assert(Array.isArray(response.response));
            assert.deepEqual(data, _.fromPairs(response.response));
        });

        it('should not auto-send if returned "null"', function() {
            Services.sendRPCResult(response, null);
            assert(!response.headersSent);
        });

        it('should convert list of objects to Snap-friendly format', function() {
            const objs = [{name: 'brian'}, {name: 'hamid'}];
            Services.sendRPCResult(response, objs);

            const sentData = response.response;
            assert.equal(sentData[0][0][0], 'name');
            assert.equal(sentData[0][0][1], 'brian');
        });

        it('should send promise result (if not sent)', function(done) {
            var result = Q(4);
            Services.sendRPCResult(response, result)
                .then(() => {
                    assert(response.headersSent);
                    assert.equal(response.response, 4);
                    done();
                });
        });

        it('should not send result if promise sends', function(done) {
            var result = Q().then(() => response.send('hello'))
                .then(() => 4);

            Services.sendRPCResult(response, result)
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

            Services.sendRPCResult(response, result);
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
            return Services.parseArgValue(arg, '12')
                .then(result => assert.equal(typeof result.value, 'number'));
        });

        it('should pass params to type parser', function() {
            Services.parseArgValue(arg, '22')
                .then(result => assert(!result.isValid));
        });

        it('should set optional args to undefined if unset', async function() {
            const arg = {optional: true};
            const result = await Services.parseArgValue(arg, '');
            assert.equal(result.value, undefined);
        });

    });

});
