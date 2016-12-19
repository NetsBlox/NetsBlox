describe('earthquakes', function() {
    var EarthQuakes = require('../../../../src/server/rpc/procedures/EarthQuakes/EarthQuakes'),
        RPCMock = require('../../../assets/MockRPC'),
        earthquakes,
        assert = require('assert');

    before(function() {
        earthquakes = new RPCMock(EarthQuakes);
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
            var uuid = earthquakes._rpc.socket.uuid,
                remainingMsgs = earthquakes._rpc._getRemainingMsgs();

            remainingMsgs[uuid] = [];
            earthquakes.stop();
            assert(!remainingMsgs[uuid]);
        });
    });
});
