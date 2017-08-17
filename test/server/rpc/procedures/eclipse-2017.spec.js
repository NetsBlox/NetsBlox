const Eclipse = require('../../../../src/server/rpc/procedures/eclipse-2017/eclipse-2017.js'),
    { cronString } = require('../../../../src/server/rpc/procedures/eclipse-2017/utils.js'),
    assert = require('assert'),
    RPCMock = require('../../../assets/mock-rpc'),
    utils = require('../../../assets/utils'),
    stationUtils = require('../../../../src/server/rpc/procedures/eclipse-2017/stations.js'),
    rpcStorage = require('../../../../src/server/rpc/storage.js'),
    checkStations = require('../../../../utils/rpc/eclipse-2017/checkStations.js'),
    eclipsePath = require('../../../../utils/rpc/eclipse-2017/eclipsePath.js'),
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

describe('eclipsePath', function() {
    it('should have more than 100 points', function() {
        assert(eclipsePath.center().length > 100);
    });

    it('should have time as third item', function() {
        assert(eclipsePath.center()[0][2] = '17:16');
    });

    it('should be able to work with clock strings', function(){
        const start = '3:48',
            end = '4:10:0';
        let seconds = eclipsePath.clockToSeconds(start)+ 22*60;
        assert.equal(eclipsePath.secondsToClock(seconds), end);
    });

});


describe('eclipse utils', function() {
    let delay = 10;
    it('cronString should convert 300 secs correctly', function() {
        assert.equal(cronString(300, delay), `10 */5 * * * *`);
    });

    it('cronString should convert 30 secs correctly', function() {
        assert.equal(cronString(30, delay), `40 * * * * *`);
    });

});

describe('database', function(){
    const sampleUpdates = [
        {
            id: 1,
            pws: 'si',
            requestTime: new Date("2017-08-17T18:21:39.357Z"),
            readAt: new Date("2017-08-17T18:20:19.357Z"),
            temp: 98
        },
        {
            id: 2,
            pws: 'si',
            requestTime: new Date("2017-08-17T18:20:39.357Z"),
            readAt: new Date("2017-08-17T18:19:19.357Z"),
            temp: 98
        },
        {
            id: 3,
            pws: 'si',
            requestTime: new Date("2017-08-17T18:19:39.357Z"),
            readAt: new Date("2017-08-17T18:16:39.357Z"),
            temp: 98
        },
        {
            id: 4,
            pws: 'si',
            requestTime: new Date("2017-08-17T18:18:39.357Z"),
            readAt: new Date("2017-08-17T18:16:39.357Z"),
            temp: 98
        },
        {
            id: 5,
            pws: 'asdf',
            requestTime: new Date("2017-08-17T18:17:39.357Z"),
            readAt: new Date("2017-08-17T18:15:39.357Z"),
            temp: 98
        },
        {
            id: 6,
            pws: 'si',
            requestTime: new Date("2017-08-17T18:17:39.357Z"),
            readAt: new Date("2017-08-17T18:15:39.357Z"),
            temp: 98
        }
    ];

    let readingsCol;
    let getReadingsCol = () => {
        if (!readingsCol) {
            readingsCol = rpcStorage.create('wu:readings').collection;
        }
        return readingsCol;
    };

    before(function(done){
        utils.connect().then(getReadingsCol).then(readingsCol => {
            getReadingsCol().insertMany(sampleUpdates).then(()=>{
                done();
            }).catch(done);
        });
    })
    
    it('should get the latest update', function(done){
        return Eclipse._stationReading('si').then(reading => {
            assert.equal(reading.id, 1);
            done();
        }).catch(done);
    })

    it('should get the proper update from history', function(done){
        return Eclipse._stationReading('si',new Date("2017-08-17T18:18:39.357Z")).then(reading => {
            assert.equal(reading.id, 3);
            done();
        }).catch(done);
    })

    it('should get the proper update from history', function(done){
        return Eclipse._stationReading('si',new Date("2017-08-17T18:19:19.357Z")).then(reading => {
            assert.equal(reading.id, 2);
            done();
        }).catch(done);
    })

    after(function(){
        getReadingsCol().drop();
    })
})

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

