const Eclipse = require('../../../../src/server/rpc/procedures/eclipse-2017/eclipse-2017.js'),
    assert = require('assert'),
    RPCMock = require('../../../assets/mock-rpc'),
    utils = require('../../../assets/utils'),
    stationUtils = require('../../../../src/server/rpc/procedures/eclipse-2017/stations.js'),
    checkStations = require('../../../../utils/rpc/eclipse-2017/checkStations.js'),
    eclipsePath = require('../../../../utils/rpc/eclipse-2017/eclipsePathCenter.js'),
    eclipse = new RPCMock(Eclipse);

utils.verifyRPCInterfaces(eclipse, [
    ['stations', []],
    ['eclipsePath', []],
    ['stationInfo', ['stationId']],
    ['temperature', ['stationId']],
    ['temperatureHistory', ['stationId', 'limit']],
    ['condition', ['stationId']],
    ['conditionHistory', ['stationId', 'limit']],
    ['pastTemperature', ['stationId', 'time']],
    ['pastCondition', ['stationId', 'time']]
]);


describe('sa', function() {
    beforeEach(function() {
    });

    it('should', function() {
        eclipse.stations();
        console.log('resp was', eclipse.response )
    });

});


describe('eclipsePath', function() {
    it('should have more than 100 points', function() {
        assert(eclipsePath().length > 100);
    });

    it('should have time as third item', function() {
        assert(eclipsePath()[0][2] = '17:16');
    });
});


// describe('station utils', function() {
//     it('should export selected stations', function() {
//         assert(stationUtils.selected);
//     });

//     it.only('.selected should return station ids as an array', function(done) {
//         stationUtils.selected().then(stations => {
//             assert(Array.isArray(stations));
//             assert(stations.length > 100);
//             done();
//         })
//     });
// });

