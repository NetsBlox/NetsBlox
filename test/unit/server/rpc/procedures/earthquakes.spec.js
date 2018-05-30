describe('earthquakes', function() {
    const utils = require('../../../../assets/utils');
    var EarthQuakes = utils.reqSrc('rpc/procedures/earthquakes/earthquakes'),
        RPCMock = require('../../../../assets/mock-rpc'),
        earthquakes,
        storage = utils.reqSrc('storage/storage'),
        assert = require('assert');

    before(function() {
        earthquakes = new RPCMock(EarthQuakes, true);
    });

    describe('byRegion', function() {
        it('should accept min/max Latitude/Longitude', function() {
            var args = earthquakes.getArgumentsFor('byRegion');

            ['min', 'max'].forEach(prefix => {
                assert(args.includes(prefix + 'Latitude'));
                assert(args.includes(prefix + 'Longitude'));
            });
        });
    });

    describe('stop', function() {
        it('should have stop method', function() {
            assert(earthquakes._methods.includes('stop'));
        });

        it('should have no args', function() {
            var args = earthquakes.getArgumentsFor('stop');
            assert.equal(args.length, 0);
        });

        it('should remove entry from remainingMsgs', function() {
            var uuid = earthquakes.socket.uuid,
                remainingMsgs = earthquakes._rpc._remainingMsgs;

            remainingMsgs[uuid] = [];
            earthquakes.stop(remainingMsgs);
            assert(!remainingMsgs[uuid]);
        });
    });

    describe('sendNext', function() {
        var socket;

        describe('changing roles', function() {
            before(function() {
                var remainingMsgs = earthquakes._rpc._remainingMsgs;

                socket = earthquakes.socket;
                remainingMsgs[socket.uuid] = [{dstId: 'someOldRole'}];
                earthquakes._rpc._sendNext(socket);
            });

            it('should stop sending if the socket changes roles', function() {
                assert.equal(socket.messages().length, 0);
            });

            it('should remove remaining msgs record', function() {
                assert(!earthquakes._rpc._remainingMsgs[socket.uuid]);
            });
        });

        describe('no earthquakes found', function() {
            it('should not fail if no earthquakes found', function() {
                var remainingMsgs = earthquakes._rpc._remainingMsgs;

                socket = earthquakes.socket;
                remainingMsgs[socket.uuid] = [];
                earthquakes._rpc._sendNext(socket);
            });
        });
    });
});
