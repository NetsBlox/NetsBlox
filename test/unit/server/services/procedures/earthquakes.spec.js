describe('earthquakes', function() {
    const utils = require('../../../../assets/utils');
    var EarthQuakes = utils.reqSrc('services/procedures/earthquakes/earthquakes'),
        RPCMock = require('../../../../assets/mock-rpc'),
        earthquakes,
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

        it('should remove entry from remainingMsgs', async function() {
            const clientId = earthquakes.socket.uuid;
            const remainingMsgs = earthquakes._rpc._remainingMsgs;

            remainingMsgs[clientId] = [];
            await earthquakes.stop();
            assert(
                !remainingMsgs[clientId],
                `Did not remove message queue: ${typeof remainingMsgs[clientId]}`
            );
        });
    });

    describe('sendNext', function() {
        var socket;

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
