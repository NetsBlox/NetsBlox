const utils = require('../../../../../assets/utils');
const assert = require('assert').strict;

describe(utils.suiteName(__filename), function() {
    const ServiceEvents = utils.reqSrc('services/procedures/utils/service-events').new();

    describe('on', function() {
        it('should not allow arbitrary events', function() {
            assert.throws(() => ServiceEvents.on('CustomEvent'));
        });

        it('should handle an emitted event', function(done) {
            ServiceEvents.on(ServiceEvents.UPDATE, done);
            ServiceEvents.emit(ServiceEvents.UPDATE);
        });

        it('should handle emitted events (multiple times)', function(done) {
            let count = 0;
            ServiceEvents.on(ServiceEvents.UPDATE, () => {
                if (++count == 2) {
                    done();
                }
            });
            ServiceEvents.emit(ServiceEvents.UPDATE);
            ServiceEvents.emit(ServiceEvents.UPDATE);
        });
    });

    describe('off', function() {
        it('should remove event handler', function(done) {
            const callback = () => assert(false, 'Event handler invoked!');
            ServiceEvents.on(ServiceEvents.UPDATE, callback);
            ServiceEvents.off(ServiceEvents.UPDATE, callback);
            ServiceEvents.emit(ServiceEvents.UPDATE);
            setTimeout(done, 50);
        });
    });

    describe('once', function() {
        it('should handle an emitted event', function(done) {
            ServiceEvents.once(ServiceEvents.UPDATE, done);
            ServiceEvents.emit(ServiceEvents.UPDATE);
        });

        it('should return a promise', async function() {
            const result = ServiceEvents.once(ServiceEvents.UPDATE, () => {});
            ServiceEvents.emit(ServiceEvents.UPDATE);
            assert(isPromise(result), `Expected promise but found ${result}`);
            await result;
        });

        it('should not handle multiple events', function(done) {
            let count = 0;
            const callback = () => assert(++count === 1, 'Event handler invoked multiple times!');
            ServiceEvents.once(ServiceEvents.UPDATE, callback);
            ServiceEvents.emit(ServiceEvents.UPDATE);
            ServiceEvents.emit(ServiceEvents.UPDATE);
            setTimeout(done, 50);
        });
    });

    function isPromise(thing) {
        return thing.toString() === '[object Promise]';
    }
});
